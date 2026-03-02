import { NextRequest, NextResponse } from "next/server";
import { makeDraftPick, undoDraftPick } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const teamId = await undoDraftPick(Number(params.id));
    return NextResponse.json({ success: true, teamId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
