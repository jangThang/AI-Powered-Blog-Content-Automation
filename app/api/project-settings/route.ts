import { NextResponse } from "next/server";
import { MAX_GUIDELINES_CHARS, MAX_THUMBNAIL_GUIDELINES_CHARS, readProjectSettings, saveProjectSettings } from "@/lib/projectSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      settings: await readProjectSettings(),
      maxGuidelinesChars: MAX_GUIDELINES_CHARS,
      maxThumbnailGuidelinesChars: MAX_THUMBNAIL_GUIDELINES_CHARS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "프로젝트 설정을 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { guidelines?: unknown; thumbnailGuidelines?: unknown };
    if (typeof body.guidelines !== "string") throw new Error("초안 작성 지침 형식이 올바르지 않습니다.");
    if (typeof body.thumbnailGuidelines !== "string") throw new Error("썸네일 지침 형식이 올바르지 않습니다.");
    const settings = await saveProjectSettings(body.guidelines, body.thumbnailGuidelines);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "초안 작성 지침을 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
