import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateType = searchParams.get("dateType") || "createdAt";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");

  const where: any = {};

  if (startDate || endDate) {
    where[dateType] = {};
    if (startDate) where[dateType].gte = new Date(startDate);
    if (endDate) where[dateType].lte = new Date(endDate);
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { vehicleType: true }
  });

  const rows = bookings.map((b) => ({
    id: b.id,
    createdAt: b.createdAt.toISOString(),
    pickupTime: b.pickupTime.toISOString(),
    fromTo: `${b.pickupLocation} → ${b.dropoffLocation}`,
    vehicleName: b.vehicleType.name,
    contactName: b.contactName,
    contactEmail: b.contactEmail,
    status: b.status,
    isUrgent: b.isUrgent,
    totalJpy: b.pricingTotalJpy,
    manualAdjustmentJpy: b.pricingManualAdjustmentJpy,
    pricingNote: b.pricingNote ?? null
  }));

  return NextResponse.json({ rows });
}


