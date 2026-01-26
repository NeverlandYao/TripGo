import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateType = searchParams.get("dateType") || "created_at";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");

  let query = `
    SELECT b.*, v.name as vehicle_name 
    FROM bookings b
    LEFT JOIN vehicle_types v ON b.vehicle_type_id = v.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND b.${dateType === 'createdAt' ? 'created_at' : 'pickup_time'} >= $${paramIndex++}`;
    params.push(new Date(startDate));
  }
  if (endDate) {
    query += ` AND b.${dateType === 'createdAt' ? 'created_at' : 'pickup_time'} <= $${paramIndex++}`;
    params.push(new Date(endDate));
  }

  if (status && status !== "ALL") {
    query += ` AND b.status = $${paramIndex++}`;
    params.push(status);
  }

  query += ` ORDER BY b.created_at DESC`;

  const { rows: bookings } = await db.query(query, params);

  const rows = bookings.map((b) => ({
    id: b.id,
    createdAt: new Date(b.created_at).toISOString(),
    pickupTime: new Date(b.pickup_time).toISOString(),
    fromTo: `${b.pickup_location} → ${b.dropoff_location}`,
    vehicleName: b.vehicle_name,
    contactName: b.contact_name,
    contactEmail: b.contact_email,
    status: b.status,
    isUrgent: b.is_urgent,
    totalJpy: b.pricing_total_jpy,
    manualAdjustmentJpy: b.pricing_manual_adjustment_jpy,
    pricingNote: b.pricing_note ?? null
  }));

  return NextResponse.json({ rows });
}
