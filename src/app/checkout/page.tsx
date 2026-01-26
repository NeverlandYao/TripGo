import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchSchema } from "@/lib/validators";
import { computeNightFee, isUrgentOrder, CHILD_SEAT_FEE_JPY } from "@/lib/bookingRules";
import { CheckoutForm } from "@/components/CheckoutForm";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { formatMoneyFromJpy, getCurrency } from "@/lib/currency";
import { getT, getLocale } from "@/lib/i18n";
import { z } from "zod";
import { findAirportByCode, findAreaByCode, POPULAR_HOTELS, getPricingAreaCode } from "@/lib/locationData";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const isZh = locale.startsWith("zh");
  const currency = await getCurrency();

  const getLocalizedArea = (code: string) => {
    const airport = findAirportByCode(code);
    if (airport) return isZh ? airport.name.zh : airport.name.en;
    const area = findAreaByCode(code);
    if (area) return isZh ? area.name.zh : area.name.en;
    const hotel = POPULAR_HOTELS.find(h => h.code === code);
    if (hotel) return isZh ? hotel.name.zh : hotel.name.en;
    return code;
  };

  const vehicleKeyMap: Record<string, string> = {
    "5座车（经济型）": "5seats",
    "7座车（商务型）": "7seats",
    "9座车（大空间）": "9seats",
    "豪华型（VIP）": "luxury",
    "大巴车（团体）": "bus"
  };

  const ParsedSchema = SearchSchema.extend({ vehicleTypeId: z.string().min(5) });
  const parsed = ParsedSchema.safeParse({
    tripType: params.tripType,
    fromArea: params.fromArea,
    toArea: params.toArea,
    pickupTime: params.pickupTime,
    passengers: params.passengers,
    childSeats: params.childSeats ?? 0,
    luggageSmall: params.luggageSmall ?? 0,
    luggageMedium: params.luggageMedium ?? 0,
    luggageLarge: params.luggageLarge ?? 0,
    vehicleTypeId: params.vehicleTypeId
  });

  if (!parsed.success) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("vehicles.paramsError")}</div>
          <div className="text-sm text-slate-600 mt-2">
            {t("checkout.enterFromVehicles")}
          </div>
          <div className="mt-4 flex gap-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = parsed.data;
  const pickupTime = new Date(q.pickupTime);
  const now = new Date();
  const isUrgent = isUrgentOrder(now, pickupTime);
  const isNight = computeNightFee(pickupTime);

  const fromCode = getPricingAreaCode(q.fromArea);
  const toCode = getPricingAreaCode(q.toArea);

  const vehicle = await prisma.vehicleType.findUnique({ where: { id: q.vehicleTypeId } });
  if (!vehicle) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("checkout.noVehicle")}</div>
          <div className="mt-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rule = await prisma.pricingRule.findFirst({
    where: { fromArea: fromCode, toArea: toCode, tripType: q.tripType, vehicleTypeId: vehicle.id }
  });

  if (!rule) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("checkout.noPrice")}</div>
          <div className="text-sm text-slate-600 mt-2">
            {t("checkout.selectOther")}
          </div>
          <div className="mt-3">
            <Link
              className="text-brand-700 underline"
              href={`/vehicles?${new URLSearchParams(params as any).toString()}`}
            >
              {t("checkout.backVehicles")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const base = rule.basePriceJpy;
  const night = isNight ? rule.nightFeeJpy : 0;
  const urgent = isUrgent ? rule.urgentFeeJpy : 0;
  const childSeatFee = (q.childSeats || 0) * CHILD_SEAT_FEE_JPY;
  const total = base + night + urgent + childSeatFee;

  const vKey = vehicleKeyMap[vehicle.name];
  const displayName = vKey ? t(`vehicle.${vKey}`) : vehicle.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {t("checkout.title")}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {getLocalizedArea(q.fromArea)} → {getLocalizedArea(q.toArea)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDateTimeJST(pickupTime, locale)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {q.passengers} {t("common.passengers")}
                </span>
              </div>
            </div>
            <div>
              {isUrgent ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 border border-rose-200 font-medium shadow-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {t("vehicles.urgent")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 font-medium shadow-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {t("vehicles.nonUrgent")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="card-elevated p-6 sm:p-8">
              <CheckoutForm
                locale={locale}
                preset={{
                  tripType: q.tripType,
                  fromArea: q.fromArea,
                  toArea: q.toArea,
                  pickupTime: q.pickupTime,
                  passengers: q.passengers,
                  childSeats: q.childSeats,
                  luggageSmall: q.luggageSmall,
                  luggageMedium: q.luggageMedium,
                  luggageLarge: q.luggageLarge,
                  vehicleTypeId: vehicle.id
                }}
                labels={{
                  flightNumber: t("form.flightNumber"),
                  flightNote: t("form.flightNote"),
                  pickupLocation: t("form.pickupLocation"),
                  dropoffLocation: t("form.dropoffLocation"),
                  contactName: t("form.contactName"),
                  contactPhone: t("form.contactPhone"),
                  contactEmail: t("form.contactEmail"),
                  special: t("form.special"),
                  childSeatFee: t("checkout.childSeatFee"),
                  submit: t("form.submit"),
                  submitting: t("form.submitting"),
                  agree: t("form.agree"),
                  orderFailed: t("form.orderFailed"),
                  airportTag: t("checkout.airportTag"),
                  placeholderFlight: t("form.placeholderFlight"),
                  placeholderFlightNote: t("form.placeholderFlightNote"),
                  placeholderName: t("form.placeholderName"),
                  placeholderPhone: t("form.placeholderPhone"),
                  placeholderSpecial: t("form.placeholderSpecial"),
                  placeholderAirport: t("search.placeholderAirport"),
                  placeholderLocation: t("search.placeholderLocation"),
                  locationTip: t("search.locationTip"),
                  placeholderEmail: t("form.placeholderEmail")
                }}
              />
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="card-elevated p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-slate-900">{t("checkout.price")}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("checkout.vehicle")}</span>
                <span className="font-semibold text-slate-900">{displayName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">{t("checkout.base")}</span>
                <span className="font-medium text-slate-900">{formatMoneyFromJpy(base, currency, locale)}</span>
              </div>
              {night > 0 ? (
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-600">{t("checkout.nightFee")}</span>
                  <span className="font-medium text-slate-900">{formatMoneyFromJpy(night, currency, locale)}</span>
                </div>
              ) : null}
              {urgent > 0 ? (
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-600">{t("checkout.urgentFee")}</span>
                  <span className="font-medium text-rose-600">{formatMoneyFromJpy(urgent, currency, locale)}</span>
                </div>
              ) : null}
              {childSeatFee > 0 ? (
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-600">
                    {t("checkout.childSeatFee")} ({q.childSeats})
                  </span>
                  <span className="font-medium text-slate-900">{formatMoneyFromJpy(childSeatFee, currency, locale)}</span>
                </div>
              ) : null}
              <div className="border-t-2 border-slate-300 mt-4 pt-4 flex justify-between items-center">
                <span className="font-bold text-lg text-slate-900">{t("checkout.total")}</span>
                <span className="font-bold text-2xl text-brand-600">{formatMoneyFromJpy(total, currency, locale)}</span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700" dangerouslySetInnerHTML={{ __html: t("checkout.mvpNote") }} />
            </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


