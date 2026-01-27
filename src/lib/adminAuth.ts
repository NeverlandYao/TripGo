import { getSession, isAdminVerified } from "./auth";

export async function requireAdmin() {
  const verified = await isAdminVerified();
  if (!verified) {
    return { ok: false as const, error: "api.unauthorized" };
  }

  return { ok: true as const, error: null };
}


