import { NextRequest, NextResponse } from "next/server";
import { getTournaments, createTournament } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const tournaments = await getTournaments();
  return NextResponse.json(tournaments, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { year, name, participants } = await req.json();
    const id = await createTournament(
      Number(year),
      name || `March Madness ${year}`,
      participants as string[]
    );
    return NextResponse.json({ success: true, id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
