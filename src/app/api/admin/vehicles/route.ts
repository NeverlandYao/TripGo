import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { getT } from "@/lib/i18n";

export async function GET(req: Request) {
  const { t } = await getT();
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const vehicles = await prisma.vehicleType.findMany({
      orderBy: [{ isBus: "asc" }, { isLuxury: "asc" }, { seats: "asc" }]
    });

    return NextResponse.json({ vehicles });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}

