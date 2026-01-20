import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { formatDateTimeJST } from "@/lib/timeFormat";

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

  // Create CSV content
  const headers = [
    "Order ID",
    "Created At",
    "Pickup Time",
    "Status",
    "Vehicle",
    "Route",
    "Contact Name",
    "Contact Email",
    "Contact Phone",
    "Passengers",
    "Child Seats",
    "Total (JPY)",
    "Manual Adjustment (JPY)",
    "Note"
  ];

  const rows = bookings.map((b: any) => [
    b.id,
    formatDateTimeJST(b.createdAt.toISOString(), "zh-CN"),
    formatDateTimeJST(b.pickupTime.toISOString(), "zh-CN"),
    b.status,
    b.vehicleType.name,
    `${b.pickupLocation} -> ${b.dropoffLocation}`,
    b.contactName,
    b.contactEmail,
    `'${b.contactPhone}`, // Use ' to prevent Excel from formatting as number
    b.passengers,
    b.childSeats,
    b.pricingTotalJpy,
    b.pricingManualAdjustmentJpy,
    b.pricingNote || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  // Return CSV as download
  const response = new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().split("T")[0]}.csv"`
    }
  });

  return response;
}
