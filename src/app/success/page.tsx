import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getT, getLocale } from "@/lib/i18n";
import { formatDateTimeJST } from "@/lib/timeFormat";

export default async function SuccessPage({
  searchParams
}: {
  searchParams: any;
}) {
  const sp = typeof searchParams?.then === "function" ? await searchParams : searchParams;
  const { t } = await getT();
  const locale = await getLocale();
  const bookingId = sp.bookingId;
  if (!bookingId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{t("vehicles.paramsError")}</div>
          <div className="mt-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicleType: true }
  });

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{t("orders.none")}</div>
          <div className="mt-3">
            <Link className="text-brand-700 underline" href="/">
              {t("vehicles.goHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const b = booking as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="card-elevated p-8 sm:p-10 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 mb-6 shadow-lg animate-scale-in">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t("success.badge")}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
            {t("success.title")}
          </h1>
          <p className="text-slate-600 mb-8">{t("success.subtitle")}</p>

          {/* Order Details */}
          <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("orders.id")}</span>
                <span className="font-mono font-semibold text-slate-900">{b.id}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("orders.vehicle")}</span>
                <span className="font-semibold text-slate-900">
                  {locale.startsWith("en") ? (t(`vehicle.${b.vehicleType.id}`) || b.vehicleType.name) : b.vehicleType.name}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.pickupTime")}</span>
                <span className="font-semibold text-slate-900">{formatDateTimeJST(b.pickupTime, locale)}</span>
              </div>
              {b.flightNumber && (
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">{t("success.flightNumber")}</span>
                  <span className="font-semibold text-slate-900">{b.flightNumber}</span>
                </div>
              )}
              <div className="flex flex-col gap-1 py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.pickupLocation")}</span>
                <span className="text-sm text-slate-900">{b.pickupLocation}</span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">{t("success.dropoffLocation")}</span>
                <span className="text-sm text-slate-900">{b.dropoffLocation}</span>
              </div>
              {b.childSeats > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">{t("success.childSeats")}</span>
                  <span className="font-semibold text-slate-900">{b.childSeats}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 font-medium">{t("orders.status")}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{t(`status.${b.status}`)}</span>
                  {b.isUrgent ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                      {t("orders.urgentTag")}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              className="btn-primary inline-flex items-center justify-center gap-2"
              href="/orders"
            >
              {t("success.viewOrders")}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link 
              className="btn-secondary inline-flex items-center justify-center gap-2" 
              href="/"
            >
              {t("vehicles.goHome")}
            </Link>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-700" dangerouslySetInnerHTML={{ __html: t("success.mvpHint") }} />
          </div>
        </div>
      </div>
    </div>
  );
}


