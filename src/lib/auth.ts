import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_secret_key_change_me"
);

export type AuthPayload = {
  userId: string;
  role: "USER" | "ADMIN";
  email: string;
};

export async function encrypt(payload: AuthPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function decrypt(input: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(input, secret, {
      algorithms: ["HS256"],
    });
    return payload as AuthPayload;
  } catch (e) {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function setSession(payload: AuthPayload) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set("session", session, { expires, httpOnly: true, secure: process.env.NODE_ENV === "production" });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", { expires: new Date(0) });
}

// Helper to check if admin is verified (one-time secret key check)
export async function isAdminVerified() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_verified")?.value === "true";
}

export async function setAdminVerified() {
  const cookieStore = await cookies();
  cookieStore.set("admin_verified", "true", { httpOnly: true, secure: process.env.NODE_ENV === "production" });
}
