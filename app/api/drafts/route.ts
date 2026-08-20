import { NextResponse } from "next/server";
import { listSavedDrafts, readSavedDraft, removeSavedDraft, saveDraft } from "@/lib/savedDrafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) return NextResponse.json({ draft: await readSavedDraft(id) });
    return NextResponse.json({ drafts: await listSavedDrafts() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장된 초안을 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const summary = await saveDraft(await request.json());
    return NextResponse.json({ draft: summary }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "초안을 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    const summary = await saveDraft(await request.json(), id);
    return NextResponse.json({ draft: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "초안을 다시 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    await removeSavedDraft(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "초안을 삭제하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
