import { NextResponse } from "next/server";
import { initSchema } from "@/lib/db";

export async function POST() {
  try {
    await initSchema();
    return NextResponse.json({ success: true, message: "Schema initialized" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
