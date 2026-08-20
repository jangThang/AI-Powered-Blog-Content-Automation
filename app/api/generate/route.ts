import { NextResponse } from "next/server";
import { generateBlog } from "@/lib/codex";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PHOTOS = 100;
const MAX_DATA_URL_LENGTH = 500_000;
const MAX_TOTAL_PHOTO_LENGTH = 50_000_000;

function validate(body: unknown): GenerateRequest {
  if (!body || typeof body !== "object") throw new Error("요청 형식이 올바르지 않습니다.");
  const value = body as Partial<GenerateRequest>;
  if (typeof value.topic !== "string" || value.topic.trim().length < 2) {
    throw new Error("글 주제를 2자 이상 입력해주세요.");
  }
  if (typeof value.notes !== "string" || value.notes.trim().length < 10) {
    throw new Error("주제와 내용을 10자 이상 적어주세요.");
  }
  const photos = Array.isArray(value.photos) ? value.photos : [];
  if (photos.length > MAX_PHOTOS) throw new Error("사진은 최대 100장까지 넣을 수 있습니다.");
  let totalPhotoLength = 0;
  for (const photo of photos) {
    if (!photo || typeof photo.name !== "string" || typeof photo.dataUrl !== "string") {
      throw new Error("사진 데이터가 올바르지 않습니다.");
    }
    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(photo.dataUrl) || photo.dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error("사진은 장당 약 350KB 이하의 이미지여야 합니다.");
    }
    totalPhotoLength += photo.dataUrl.length;
  }
  if (totalPhotoLength > MAX_TOTAL_PHOTO_LENGTH) throw new Error("사진 전체 용량이 너무 큽니다. 일부 사진을 줄여주세요.");

  const length = ["short", "standard", "long"].includes(value.length || "")
    ? value.length!
    : "standard";
  const contentGoal = ["experience", "guide", "review", "recap"].includes(value.contentGoal || "")
    ? value.contentGoal!
    : "experience";
  const tone = ["balanced", "warm", "informative", "lively"].includes(value.tone || "")
    ? value.tone!
    : "balanced";

  return {
    topic: value.topic.trim().slice(0, 120),
    notes: value.notes.trim().slice(0, 8000),
    impressions: String(value.impressions || "").trim().slice(0, 4000),
    verifiedFacts: String(value.verifiedFacts || "").trim().slice(0, 4000),
    primaryKeyword: String(value.primaryKeyword || "").trim().slice(0, 80),
    category: String(value.category || "국내여행").trim().slice(0, 40),
    length: length as GenerateRequest["length"],
    contentGoal: contentGoal as GenerateRequest["contentGoal"],
    audience: String(value.audience || "처음 방문하는 독자").trim().slice(0, 120),
    tone: tone as GenerateRequest["tone"],
    callToAction: String(value.callToAction || "").trim().slice(0, 500),
    photos,
  };
}

export async function POST(request: Request) {
  try {
    const body = validate(await request.json());
    const result = await generateBlog(body);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "초안 생성 중 오류가 발생했습니다.";
    const isInputError = /입력|요청|사진|주제|내용|문체|작성글/.test(message);
    return NextResponse.json({ error: message }, { status: isInputError ? 400 : 500 });
  }
}
