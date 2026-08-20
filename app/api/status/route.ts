import { NextResponse } from "next/server";
import { getCodexStatus } from "@/lib/codex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCodexStatus());
}
