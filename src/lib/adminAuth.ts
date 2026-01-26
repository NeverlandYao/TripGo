import { getSession, isAdminVerified } from "./auth";

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { ok: false as const, error: "api.unauthorized" };
  }

  const verified = await isAdminVerified();
  if (!verified) {
    return { ok: false as const, error: "api.adminSecretRequired" };
  }

  return { ok: true as const, error: null };
}


