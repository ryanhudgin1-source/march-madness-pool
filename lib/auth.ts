import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest): NextResponse | null {
  const key = req.headers.get("x-admin-key") ?? "";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || key !== password) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}
