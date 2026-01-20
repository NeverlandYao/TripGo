import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateBookingSchema } from "@/lib/validators";
import { computeNightFee, isUrgentOrder, CHILD_SEAT_FEE_JPY } from "@/lib/bookingRules";
import { getT } from "@/lib/i18n";
import { getPricingAreaCode } from "@/lib/locationData";

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

    const vehicle = await prisma.vehicleType.findUnique({ where: { id: data.vehicleTypeId } });
    if (!vehicle) {
      return NextResponse.json({ error: t("api.orderNotFound") }, { status: 404 });
    }

    const fromCode = getPricingAreaCode(data.fromArea);
    const toCode = getPricingAreaCode(data.toArea);

    const rule = await prisma.pricingRule.findFirst({
      where: {
        fromArea: fromCode,
        toArea: toCode,
        tripType: data.tripType,
        vehicleTypeId: data.vehicleTypeId
      }
    });
    if (!rule) {
      return NextResponse.json({ error: t("checkout.noPrice") }, { status: 404 });
    }

    // 简单容量校验（可扩展为更复杂的行李体积/尺寸规则）
    if (data.passengers > vehicle.seats) {
      return NextResponse.json({ error: t("api.passengersExceeded") }, { status: 400 });
    }
    if (
      data.luggageSmall > vehicle.luggageSmall ||
      data.luggageMedium > vehicle.luggageMedium ||
      data.luggageLarge > vehicle.luggageLarge
    ) {
      return NextResponse.json({ error: t("api.luggageExceeded") }, { status: 400 });
    }

    const base = rule.basePriceJpy;
    const night = isNight ? rule.nightFeeJpy : 0;
    const urgent = isUrgent ? rule.urgentFeeJpy : 0;
    const childSeat = (data.childSeats || 0) * CHILD_SEAT_FEE_JPY;
    const total = base + night + urgent + childSeat;

    const booking = await prisma.booking.create({
      data: {
        tripType: data.tripType,
        pickupTime,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        flightNumber: data.flightNumber,
        flightNote: data.flightNote,
        passengers: data.passengers,
        childSeats: data.childSeats,
        luggageSmall: data.luggageSmall,
        luggageMedium: data.luggageMedium,
        luggageLarge: data.luggageLarge,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        contactNote: data.contactNote,
        vehicleTypeId: data.vehicleTypeId,
        isUrgent,
        pricingBaseJpy: base,
        pricingNightJpy: night,
        pricingUrgentJpy: urgent,
        pricingChildSeatJpy: childSeat,
        pricingTotalJpy: total
      } as any
    });

    return NextResponse.json({ bookingId: booking.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? t("api.serverError") }, { status: 500 });
  }
}


