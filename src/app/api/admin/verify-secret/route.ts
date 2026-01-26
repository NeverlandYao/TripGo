import { NextResponse } from "next/server";
import { getSession, setAdminVerified } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: t("api.unauthorized") }, { status: 401 });
    }

    const { secret } = await req.json();
    if (secret !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: t("api.invalidSecret") }, { status: 400 });
    }

    await setAdminVerified();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: t("api.serverError") }, { status: 500 });
  }
}
