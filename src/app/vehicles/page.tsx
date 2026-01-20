import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchSchema } from "@/lib/validators";
import { computeNightFee, isUrgentOrder } from "@/lib/bookingRules";
import { formatDateTimeJST } from "@/lib/timeFormat";
import { formatMoneyFromJpy, getCurrency } from "@/lib/currency";
import { getT, getLocale } from "@/lib/i18n";
import { getPricingAreaCode } from "@/lib/locationData";

export default async function VehiclesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const currency = await getCurrency();
  const parsed = SearchSchema.safeParse({
    tripType: params.tripType,
    fromArea: params.fromArea,
    toArea: params.toArea,
    pickupTime: params.pickupTime,
    passengers: params.passengers,
    childSeats: params.childSeats ?? 0,
    luggageSmall: params.luggageSmall ?? 0,
    luggageMedium: params.luggageMedium ?? 0,
    luggageLarge: params.luggageLarge ?? 0
  });

  if (!parsed.success) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="font-semibold">{t("vehicles.paramsError")}</div>
          <div className="text-sm text-slate-600 mt-2">
            {t("checkout.enterFromVehicles")}
          </div>
          <div className="mt-4">
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

  const vehicleTypes = await prisma.vehicleType.findMany({
    orderBy: [{ isBus: "asc" }, { isLuxury: "asc" }, { seats: "asc" }]
  });

  const rules = await prisma.pricingRule.findMany({
    where: { fromArea: fromCode, toArea: toCode, tripType: q.tripType },
    include: { vehicleType: true }
  });

  const ruleByVehicle = new Map(rules.map((r) => [r.vehicleTypeId, r]));

  const vehicleKeyMap: Record<string, string> = {
    "5座车（经济型）": "5seats",
    "7座车（商务型）": "7seats",
    "9座车（大空间）": "9seats",
    "豪华型（VIP）": "luxury",
    "大巴车（团体）": "bus"
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("vehicles.title")}</h2>
          <div className="text-sm text-slate-600 mt-1">
            {q.fromArea} → {q.toArea} · {formatDateTimeJST(pickupTime, locale)} · {q.passengers} {t("common.passengers")} · {t("common.luggage")}{" "}
            {q.luggageSmall}/{q.luggageMedium}/{q.luggageLarge}
          </div>
        </div>
        <div className="text-sm">
          {isUrgent ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {t("vehicles.urgent")}
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {t("vehicles.nonUrgent")}
            </span>
          )}
          {isNight ? (
            <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
              {t("vehicles.night")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {vehicleTypes.length === 0 ? (
            <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center">
              <div className="text-slate-400 mb-2">
                <svg className="w-12 h-12 mx-auto opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="font-semibold text-slate-900">{t("vehicles.noVehicles")}</div>
              <div className="text-sm text-slate-500 mt-1">{t("vehicles.tryAgain")}</div>
            </div>
          ) : (
            vehicleTypes.map((v) => {
              const rule = ruleByVehicle.get(v.id);
              const vKey = vehicleKeyMap[v.name];
              const displayName = vKey ? t(`vehicle.${vKey}`) : v.name;
              
              return (
                <div key={v.id} className="card-elevated p-6 flex flex-col group hover:border-brand-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{displayName}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {v.seats} {t("common.seats")}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {v.luggageSmall}/{v.luggageMedium}/{v.luggageLarge} {t("common.luggage")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-6">
                    <div className="text-sm text-slate-600 line-clamp-2">
                      {v.description}
                    </div>
                  </div>

                  <div className="mt-auto">
                    {rule ? (
                      <>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold text-brand-600">
                            {formatMoneyFromJpy(
                              rule.basePriceJpy + (isNight ? rule.nightFeeJpy : 0) + (isUrgent ? rule.urgentFeeJpy : 0),
                              currency,
                              locale
                            )}
                          </span>
                          <span className="text-sm text-slate-400 font-normal">{t("vehicles.totalQuote")}</span>
                        </div>
                        <Link
                          href={`/checkout?${new URLSearchParams({ ...q, vehicleTypeId: v.id } as any).toString()}`}
                          className="block w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white text-center font-bold rounded-xl shadow-lg shadow-brand-200 transition-all active:scale-[0.98]"
                        >
                          {t("vehicles.choose")}
                        </Link>
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-sm text-center border border-dashed border-slate-200">
                        {t("vehicles.noPrice")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

