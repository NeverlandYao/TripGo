import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminUpdateBookingSchema } from "@/lib/validators";
import { getT } from "@/lib/i18n";

export async function POST(req: Request) {
  const { t } = await getT();
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: t(auth.error) }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = AdminUpdateBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const { bookingId, status, manualAdjustmentJpy, pricingNote } = parsed.data;
    const { rows: bookings } = await db.query("SELECT * FROM bookings WHERE id = $1", [bookingId]);
    if (bookings.length === 0) return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    const booking = bookings[0];

    const nextManual = manualAdjustmentJpy ?? booking.pricing_manual_adjustment_jpy;
    const nextStatus = status ?? booking.status;

    const nextTotal =
      booking.pricing_base_jpy + booking.pricing_night_jpy + booking.pricing_urgent_jpy + nextManual;

    await db.query(
      `UPDATE bookings SET status = $1, pricing_manual_adjustment_jpy = $2, pricing_total_jpy = $3, pricing_note = $4, updated_at = NOW()
       WHERE id = $5`,
      [nextStatus, nextManual, nextTotal, pricingNote ?? booking.pricing_note, bookingId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
