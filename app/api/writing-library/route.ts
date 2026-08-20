import { NextResponse } from "next/server";
import { addWritingLibraryFile, listWritingLibrary, removeWritingLibraryFile } from "@/lib/writingLibrary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ files: await listWritingLibrary() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "문체 자료실을 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("업로드할 작성글 파일을 선택해주세요.");
    if (file.size === 0) throw new Error("빈 파일은 올릴 수 없습니다.");
    const saved = await addWritingLibraryFile(file.name, file.type, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ file: saved }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "작성글을 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    await removeWritingLibraryFile(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "작성글을 삭제하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

