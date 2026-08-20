import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WritingLibraryFile } from "./types";

const LIBRARY_ROOT = path.join(process.cwd(), ".starlog-data", "writing-library");
const INDEX_PATH = path.join(LIBRARY_ROOT, "index.json");
const MAX_FILES = 50;
const MAX_FILE_BYTES = 100_000_000;
const MAX_TOTAL_BYTES = 1_000_000_000;
const MAX_TEXT_CHARS = 5_000_000;
const MAX_TOTAL_TEXT_CHARS = 20_000_000;
const STYLE_CONTEXT_CHARS = 160_000;
const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "md", "markdown", "html", "htm"]);

let mutationQueue = Promise.resolve();

function queueMutation<T>(operation: () => Promise<T>) {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  };
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|article|section|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
      if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return entities[code.toLowerCase()] ?? match;
    });
}

async function extractPdfText(buffer: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  try {
    const document = await task.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }
      pages.push(pageText.trim());
      page.cleanup();
    }
    return normalizeText(pages.filter(Boolean).join("\n\n"));
  } finally {
    await task.destroy();
  }
}

async function extractText(fileName: string, buffer: Buffer) {
  const extension = extensionOf(fileName);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("PDF, TXT, Markdown 또는 HTML 파일만 사용할 수 있습니다.");
  }
  if (buffer.length > MAX_FILE_BYTES) throw new Error("파일 하나의 크기는 100MB 이하여야 합니다.");

  if (extension === "pdf") {
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("올바른 PDF 파일이 아닙니다.");
    try {
      return await extractPdfText(buffer);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      if (/password/i.test(detail)) throw new Error("암호가 설정된 PDF는 사용할 수 없습니다.");
      throw new Error("PDF에서 글을 읽지 못했습니다. 텍스트 선택이 가능한 PDF인지 확인해주세요.");
    }
  }

  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  return normalizeText(["html", "htm"].includes(extension) ? decodeHtml(decoded) : decoded);
}

async function ensureLibrary() {
  await mkdir(LIBRARY_ROOT, { recursive: true });
}

async function readIndex(): Promise<WritingLibraryFile[]> {
  await ensureLibrary();
  try {
    const parsed = JSON.parse(await readFile(INDEX_PATH, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed as WritingLibraryFile[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("문체 자료실 목록을 읽지 못했습니다.");
  }
}

async function writeIndex(files: WritingLibraryFile[]) {
  await writeFile(INDEX_PATH, JSON.stringify(files, null, 2), "utf8");
}

function rawPath(id: string, extension: string) {
  return path.join(/* turbopackIgnore: true */ LIBRARY_ROOT, `${id}.${extension}`);
}

function textPath(id: string) {
  return path.join(LIBRARY_ROOT, `${id}.txt`);
}

export async function listWritingLibrary() {
  const files = await readIndex();
  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addWritingLibraryFile(fileName: string, mimeType: string, buffer: Buffer) {
  const extension = extensionOf(fileName);
  const text = await extractText(fileName, buffer);
  if (text.length < 100) throw new Error("문체를 파악할 수 있는 글이 충분하지 않습니다. 텍스트가 100자 이상인 파일을 올려주세요.");
  if (text.length > MAX_TEXT_CHARS) throw new Error("파일에서 추출된 글은 5,000,000자 이하여야 합니다.");

  return queueMutation(async () => {
    const files = await readIndex();
    if (files.length >= MAX_FILES) throw new Error("문체 자료실에는 최대 50개 파일을 저장할 수 있습니다.");
    if (files.reduce((sum, item) => sum + item.bytes, 0) + buffer.length > MAX_TOTAL_BYTES) {
      throw new Error("문체 자료실의 원본 파일 용량은 전체 1GB까지 저장할 수 있습니다.");
    }
    if (files.reduce((sum, item) => sum + item.charCount, 0) + text.length > MAX_TOTAL_TEXT_CHARS) {
      throw new Error("문체 자료실에서 추출한 글은 전체 20,000,000자까지 저장할 수 있습니다.");
    }

    const id = randomUUID();
    const record: WritingLibraryFile = {
      id,
      name: path.basename(fileName).slice(0, 200),
      extension,
      mimeType: mimeType.slice(0, 100),
      bytes: buffer.length,
      charCount: text.length,
      createdAt: new Date().toISOString(),
    };

    await writeFile(rawPath(id, extension), buffer, { flag: "wx" });
    try {
      await writeFile(textPath(id), text, { encoding: "utf8", flag: "wx" });
      await writeIndex([...files, record]);
      return record;
    } catch (error) {
      await unlink(rawPath(id, extension)).catch(() => undefined);
      await unlink(textPath(id)).catch(() => undefined);
      throw error;
    }
  });
}

export async function removeWritingLibraryFile(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("삭제할 파일 식별자가 올바르지 않습니다.");
  return queueMutation(async () => {
    const files = await readIndex();
    const target = files.find((file) => file.id === id);
    if (!target) throw new Error("삭제할 작성글을 찾지 못했습니다.");
    await writeIndex(files.filter((file) => file.id !== id));
    await Promise.all([
      unlink(rawPath(target.id, target.extension)).catch(() => undefined),
      unlink(textPath(target.id)).catch(() => undefined),
    ]);
  });
}

function excerpt(text: string, budget: number) {
  if (text.length <= budget) return text;
  const part = Math.floor(budget / 3);
  const middle = Math.floor(text.length / 2);
  return [
    text.slice(0, part),
    "[...중간 부분 발췌...]",
    text.slice(middle - Math.floor(part / 2), middle + Math.ceil(part / 2)),
    "[...마지막 부분 발췌...]",
    text.slice(-part),
  ].join("\n");
}

const CATEGORY_HINTS: Record<string, string[]> = {
  "국내여행": ["국내여행", "맛집", "카페"],
  "맛집/카페": ["국내여행", "맛집", "카페"],
  "해외여행": ["해외여행", "ces"],
  "전시/관람": ["전시관람", "전시", "관람"],
  "festival/camp": ["festival", "camp", "축제"],
  "강연/기고": ["강연", "기고"],
  "에세이": ["에세이"],
};

function isCategoryMatch(fileName: string, category: string) {
  const normalizedName = fileName.toLowerCase().replace(/[\s/_-]+/g, "");
  const normalizedCategory = category.toLowerCase();
  const hints = CATEGORY_HINTS[normalizedCategory] || [normalizedCategory];
  return hints.some((hint) => normalizedName.includes(hint.toLowerCase().replace(/[\s/_-]+/g, "")));
}

function cleanStyleContext(text: string) {
  return text.split("\n").map((line) => {
    const trimmed = line.trim();
    if (/^\d+\s*·\s*(star가 되기위해|기록을 이야기로)$/i.test(trimmed)) return "[사진 배치 지점]";
    if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}\s+https?:\/\/blog\.naver\.com\//i.test(trimmed)) return "[새 글 시작]";
    const duplicated = trimmed.match(/^(.{4,}?)\s+\1$/u);
    return duplicated ? duplicated[1] : line;
  }).filter((line, index, lines) => line !== "[사진 배치 지점]" || lines[index - 1] !== line).join("\n");
}

export async function loadWritingStyleContext(category = "") {
  const files = await listWritingLibrary();
  if (files.length === 0) return { fileCount: 0, context: "" };
  const orderedFiles = [...files].sort((a, b) => {
    const categoryDifference = Number(isCategoryMatch(b.name, category)) - Number(isCategoryMatch(a.name, category));
    return categoryDifference || b.createdAt.localeCompare(a.createdAt);
  });
  const weights = orderedFiles.map((file) => isCategoryMatch(file.name, category) ? 3 : 1);
  const sections: string[] = [];
  let remaining = STYLE_CONTEXT_CHARS;
  let remainingWeight = weights.reduce((sum, weight) => sum + weight, 0);

  for (const [index, file] of orderedFiles.entries()) {
    if (remaining <= 0) break;
    const relevant = isCategoryMatch(file.name, category);
    const budget = Math.max(2_000, Math.floor(remaining * weights[index] / remainingWeight));
    const text = cleanStyleContext(await readFile(textPath(file.id), "utf8"));
    const selected = excerpt(text, Math.min(budget, remaining));
    const relevanceLabel = relevant ? "현재 카테고리 우선 참고" : "보조 참고";
    sections.push(`--- 프로젝트 작성글 ${index + 1}: ${file.name} (${relevanceLabel}) ---\n${selected}\n--- 작성글 ${index + 1} 끝 ---`);
    remaining -= selected.length;
    remainingWeight -= weights[index];
  }

  return { fileCount: files.length, context: sections.join("\n\n") };
}
