import { NextResponse } from "next/server";
import { reviseBlog } from "@/lib/codex";
import type { GenerateResult, ReviseRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function validate(body: unknown): ReviseRequest {
  if (!body || typeof body !== "object") throw new Error("수정 요청 형식이 올바르지 않습니다.");
  const value = body as Partial<ReviseRequest>;
  const instruction = typeof value.instruction === "string" ? value.instruction.trim() : "";
  if (instruction.length < 2) throw new Error("수정할 방향을 2자 이상 적어주세요.");
  if (instruction.length > 4_000) throw new Error("수정 요청은 4,000자 이하여야 합니다.");
  if (!value.result || typeof value.result !== "object") throw new Error("수정할 초안을 찾지 못했습니다.");
  const result = value.result as GenerateResult;
  if (typeof result.title !== "string" || !Array.isArray(result.sections) || !Array.isArray(result.hashtags)) {
    throw new Error("수정할 초안 데이터가 올바르지 않습니다.");
  }
  if (JSON.stringify(result).length > 500_000) throw new Error("수정할 초안의 용량이 너무 큽니다.");
  const photoCount = Number(value.photoCount);
  if (!Number.isInteger(photoCount) || photoCount < 0 || photoCount > 100) {
    throw new Error("초안의 사진 수가 올바르지 않습니다.");
  }

  return {
    instruction,
    category: String(value.category || "국내여행").trim().slice(0, 40),
    photoCount,
    result,
  };
}

export async function POST(request: Request) {
  try {
    const input = validate(await request.json());
    return NextResponse.json({ result: await reviseBlog(input) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "초안 수정 중 오류가 발생했습니다.";
    const isInputError = /수정 요청|수정할 방향|수정할 초안|사진 수|형식|용량/.test(message);
    return NextResponse.json({ error: message }, { status: isInputError ? 400 : 500 });
  }
}
