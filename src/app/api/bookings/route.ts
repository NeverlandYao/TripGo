import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CreateBookingSchema } from "@/lib/validators";
import { computeNightFee, isUrgentOrder, CHILD_SEAT_FEE_JPY } from "@/lib/bookingRules";
import { getT } from "@/lib/i18n";
import { getPricingAreaCode } from "@/lib/locationData";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export async function POST(req: Request) {
  const { t } = await getT();
  try {
    const json = await req.json();
    const parsed = CreateBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: t("api.invalidParams"), details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const pickupTime = new Date(data.pickupTime);
    const now = new Date();
    const isUrgent = isUrgentOrder(now, pickupTime);
    const isNight = computeNightFee(pickupTime);

    const { rows: vehicles } = await db.query("SELECT * FROM vehicle_types WHERE id = $1", [data.vehicleTypeId]);
    if (vehicles.length === 0) {
      return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    }
    const vehicle = vehicles[0];

    const fromCode = getPricingAreaCode(data.fromArea);
    const toCode = getPricingAreaCode(data.toArea);

    const { rows: rules } = await db.query(
      `SELECT * FROM pricing_rules 
       WHERE from_area = $1 AND to_area = $2 AND trip_type = $3 AND vehicle_type_id = $4 
       LIMIT 1`,
      [fromCode, toCode, data.tripType, data.vehicleTypeId]
    );
    
    if (rules.length === 0) {
      return NextResponse.json({ error: t("checkout.noPrice") }, { status: 404 });
    }
    const rule = rules[0];

    // 简单容量校验（可扩展为更复杂的行李体积/尺寸规则）
    if (data.passengers > vehicle.seats) {
      return NextResponse.json({ error: t("api.passengersExceeded") }, { status: 400 });
    }
    if (
      data.luggageSmall > vehicle.luggage_small ||
      data.luggageMedium > vehicle.luggage_medium ||
      data.luggageLarge > vehicle.luggage_large
    ) {
      return NextResponse.json({ error: t("api.luggageExceeded") }, { status: 400 });
    }

    const base = rule.base_price_jpy;
    const night = isNight ? rule.night_fee_jpy : 0;
    const urgent = isUrgent ? rule.urgent_fee_jpy : 0;
    const childSeat = (data.childSeats || 0) * CHILD_SEAT_FEE_JPY;
    const total = base + night + urgent + childSeat;

    const bookingId = generateId();
    await db.query(
      `INSERT INTO bookings (
        id, trip_type, pickup_time, pickup_location, dropoff_location, 
        flight_number, flight_note, passengers, child_seats, 
        luggage_small, luggage_medium, luggage_large, 
        contact_name, contact_phone, contact_email, contact_note, 
        vehicle_type_id, is_urgent, pricing_base_jpy, pricing_night_jpy, 
        pricing_urgent_jpy, pricing_child_seat_jpy, pricing_total_jpy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        bookingId, data.tripType, pickupTime, data.pickupLocation, data.dropoffLocation,
        data.flightNumber, data.flightNote, data.passengers, data.childSeats,
        data.luggageSmall, data.luggageMedium, data.luggageLarge,
        data.contactName, data.contactPhone, data.contactEmail, data.contactNote,
        data.vehicleTypeId, isUrgent, base, night, urgent, childSeat, total
      ]
    );
    
    // Auto-link email if user is logged in
    const session = await getSession();
    if (session) {
      // Check if email is already linked
      const { rows: linked } = await db.query(
        "SELECT 1 FROM user_emails WHERE user_id = $1 AND email = $2",
        [session.userId, data.contactEmail]
      );
      if (linked.length === 0) {
        await db.query(
          "INSERT INTO user_emails (user_id, email) VALUES ($1, $2)",
          [session.userId, data.contactEmail]
        );
      }
    }

    return NextResponse.json({ bookingId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}
