import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DraftBrief, GenerateResult, PhotoInput, SavedDraft, SavedDraftSummary } from "./types";

const DRAFTS_ROOT = path.join(process.cwd(), ".starlog-data", "drafts");
const MAX_DRAFTS = 100;
const MAX_DRAFT_BYTES = 60_000_000;
const MAX_TOTAL_BYTES = 1_000_000_000;
const MAX_PHOTOS = 100;
const MAX_DATA_URL_LENGTH = 500_000;

let mutationQueue = Promise.resolve();

function queueMutation<T>(operation: () => Promise<T>) {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function assertId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("초안 식별자가 올바르지 않습니다.");
}

function draftPath(id: string) {
  return path.join(DRAFTS_ROOT, `${id}.json`);
}

async function ensureDraftsRoot() {
  await mkdir(DRAFTS_ROOT, { recursive: true });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validatePhotos(value: unknown): PhotoInput[] {
  if (!Array.isArray(value) || value.length > MAX_PHOTOS) throw new Error("저장할 사진 목록이 올바르지 않습니다.");
  let totalLength = 0;
  const photos = value.map((item) => {
    if (!isObject(item) || typeof item.name !== "string" || typeof item.dataUrl !== "string") {
      throw new Error("저장할 사진 데이터가 올바르지 않습니다.");
    }
    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(item.dataUrl) || item.dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error("저장할 사진의 형식이나 용량이 올바르지 않습니다.");
    }
    totalLength += item.dataUrl.length;
    return { name: item.name.slice(0, 240), dataUrl: item.dataUrl };
  });
  if (totalLength > 50_000_000) throw new Error("저장할 사진 전체 용량이 너무 큽니다.");
  return photos;
}

function validateResult(value: unknown): GenerateResult {
  if (!isObject(value)
    || typeof value.title !== "string"
    || !Array.isArray(value.sections)
    || !Array.isArray(value.hashtags)
    || !Array.isArray(value.sources)
    || !isObject(value.thumbnail)
    || !isObject(value.seo)) {
    throw new Error("저장할 초안 데이터가 올바르지 않습니다.");
  }
  if (value.title.trim().length === 0 || value.title.length > 500) throw new Error("저장할 초안 제목이 올바르지 않습니다.");
  return value as unknown as GenerateResult;
}

function validateBrief(value: unknown): DraftBrief {
  if (!isObject(value) || typeof value.topic !== "string" || typeof value.category !== "string") {
    throw new Error("저장할 브리프 데이터가 올바르지 않습니다.");
  }
  return value as unknown as DraftBrief;
}

function normalizePayload(value: unknown) {
  if (!isObject(value)) throw new Error("저장할 초안 형식이 올바르지 않습니다.");
  const result = validateResult(value.result);
  const photos = validatePhotos(value.photos);
  const brief = validateBrief(value.brief);
  return {
    title: result.title.trim().slice(0, 500),
    category: String(value.category || brief.category || "미분류").trim().slice(0, 80) || "미분류",
    result,
    photos,
    brief,
  };
}

async function fileNames() {
  await ensureDraftsRoot();
  return (await readdir(DRAFTS_ROOT)).filter((name) => /^[0-9a-f-]{36}\.json$/i.test(name));
}

function summaryOf(draft: SavedDraft): SavedDraftSummary {
  const { id, title, category, photoCount, bytes, createdAt, updatedAt } = draft;
  return { id, title, category, photoCount, bytes, createdAt, updatedAt };
}

async function readSavedDraftFile(fileName: string): Promise<SavedDraft> {
  const parsed = JSON.parse(await readFile(path.join(DRAFTS_ROOT, fileName), "utf8")) as SavedDraft;
  if (!parsed || typeof parsed.id !== "string" || typeof parsed.updatedAt !== "string") throw new Error("저장된 초안이 손상되었습니다.");
  return parsed;
}

export async function listSavedDrafts() {
  const names = await fileNames();
  const drafts = await Promise.all(names.map(async (name) => {
    try { return summaryOf(await readSavedDraftFile(name)); }
    catch { return null; }
  }));
  return drafts.filter((draft): draft is SavedDraftSummary => Boolean(draft)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readSavedDraft(id: string) {
  assertId(id);
  await ensureDraftsRoot();
  try { return await readSavedDraftFile(`${id}.json`); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("저장된 초안을 찾지 못했습니다.");
    throw error;
  }
}

async function totalSavedBytes(excludeId = "") {
  const names = await fileNames();
  const sizes = await Promise.all(names.filter((name) => name !== `${excludeId}.json`).map(async (name) => (await stat(path.join(DRAFTS_ROOT, name))).size));
  return sizes.reduce((sum, size) => sum + size, 0);
}

export async function saveDraft(value: unknown, existingId = "") {
  const payload = normalizePayload(value);
  if (existingId) assertId(existingId);
  return queueMutation(async () => {
    const names = await fileNames();
    if (!existingId && names.length >= MAX_DRAFTS) throw new Error("저장된 초안은 최대 100개까지 보관할 수 있습니다.");

    const now = new Date().toISOString();
    const id = existingId || randomUUID();
    const previous = existingId ? await readSavedDraft(existingId) : null;
    const draft: SavedDraft = {
      id,
      ...payload,
      photoCount: payload.photos.length,
      bytes: 0,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    let serialized = JSON.stringify(draft);
    draft.bytes = Buffer.byteLength(serialized, "utf8");
    serialized = JSON.stringify(draft);
    draft.bytes = Buffer.byteLength(serialized, "utf8");
    if (draft.bytes > MAX_DRAFT_BYTES) throw new Error("초안 하나의 저장 용량은 60MB 이하여야 합니다.");
    if (await totalSavedBytes(existingId) + draft.bytes > MAX_TOTAL_BYTES) throw new Error("저장된 초안의 전체 용량은 1GB까지 사용할 수 있습니다.");

    const target = draftPath(id);
    const temporary = path.join(DRAFTS_ROOT, `${id}.${randomUUID()}.tmp`);
    await writeFile(temporary, serialized, { encoding: "utf8", flag: "wx" });
    try {
      await rename(temporary, target);
      return summaryOf(draft);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  });
}

export async function removeSavedDraft(id: string) {
  assertId(id);
  return queueMutation(async () => {
    try { await unlink(draftPath(id)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("삭제할 초안을 찾지 못했습니다.");
      throw error;
    }
  });
}
