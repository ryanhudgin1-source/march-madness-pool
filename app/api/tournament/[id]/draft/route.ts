import { NextRequest, NextResponse } from "next/server";
import { makeDraftPick, undoDraftPick } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { teamId } = await req.json();
    const result = await makeDraftPick(Number(params.id), Number(teamId));
    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = await undoDraftPick(Number(params.id));
    return NextResponse.json({ success: true, teamId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
