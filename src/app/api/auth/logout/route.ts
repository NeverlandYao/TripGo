import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const c = await cookies();
  c.delete("session");
  c.delete("admin_verified");
  return NextResponse.json({ ok: true });
}
