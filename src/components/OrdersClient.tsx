"use client";

import { useState, useEffect } from "react";
import { formatMoneyFromJpy } from "@/lib/currencyClient";
import { formatDateTimeJST } from "@/lib/timeFormat";
import type { Currency } from "@/lib/currency";

// Client-side currency helper
function getCurrencyFromCookie(): Currency {
  if (typeof document === "undefined") return "JPY";
  const cookie = document.cookie.split("; ").find((c) => c.startsWith("TripGo_currency="));
  const currencyFromCookie = cookie?.split("=")[1]?.toUpperCase();
  if (currencyFromCookie === "USD" || currencyFromCookie === "CNY") {
    return currencyFromCookie;
  }
  return "JPY";
}

type BookingRow = {
  id: string;
  createdAt: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  isUrgent: boolean;
  totalJpy: number;
  vehicleName: string;
};
type Labels = {
  queryTitle: string;
  querySubtitle: string;
  email: string;
  search: string;
  searching: string;
  list: string;
  none: string;
  cancel: string;
  cancelled: string;
  cancelTitle: string;
  cancelReason: string;
  cancelConfirm: string;
  close: string;
  processing: string;
  urgentHint: string;
  queryFailed: string;
  cancelFailed: string;
  id: string;
  pickup: string;
  vehicle: string;
  amount: string;
  status: string;
  action: string;
  urgentTag: string;
  cancelReasonDefault: string;
  statuses: Record<string, string>;
  vehicles: Record<string, string>;
  emailPlaceholder?: string;
};

export function OrdersClient({ labels, locale = "zh-CN" }: { labels: Labels; locale?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [currency, setCurrency] = useState<Currency>("JPY");

  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState(labels.cancelReasonDefault);

  useEffect(() => {
    setCurrency(getCurrencyFromCookie());
    
    // Listen for currency changes via custom event
    const handleCurrencyChange = () => {
      setCurrency(getCurrencyFromCookie());
    };
    
    window.addEventListener('currencyChanged', handleCurrencyChange);
    
    // Also check periodically (fallback)
    const interval = setInterval(() => {
      const currentCurrency = getCurrencyFromCookie();
      setCurrency((prev) => {
        if (currentCurrency !== prev) {
          return currentCurrency;
        }
        return prev;
      });
    }, 500);
    
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setCancelReason(labels.cancelReasonDefault);
  }, [labels.cancelReasonDefault]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.queryFailed);
      setRows(data.rows ?? []);
    } catch (e: any) {
      setError(e?.message ?? labels.queryFailed);
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!cancelBookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId: cancelBookingId, contactEmail: email, reason: cancelReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? labels.cancelFailed);
      setCancelBookingId(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? labels.cancelFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{labels.queryTitle}</div>
          <div className="text-sm text-slate-600 mt-1">{labels.querySubtitle}</div>
          <div className="mt-4 space-y-3">
            <label className="text-sm block">
              <div className="text-slate-700 mb-1">{labels.email}</div>
              <input
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={labels.emailPlaceholder || "you@example.com"}
              />
            </label>
            <button
              onClick={load}
              disabled={loading || !email}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? labels.searching : labels.search}
            </button>
            {error ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            ) : null}
            <div className="text-xs text-slate-500">
              {labels.urgentHint}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{labels.list}</div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4">{labels.id}</th>
                  <th className="py-2 pr-4">{labels.pickup}</th>
                  <th className="py-2 pr-4">{labels.vehicle}</th>
                  <th className="py-2 pr-4">{labels.amount}</th>
                  <th className="py-2 pr-4">{labels.status}</th>
                  <th className="py-2 pr-4">{labels.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={6}>
                      {labels.none}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    // Try to find localized vehicle name
                    // In DB, vehicleName might be the Chinese name, or we might have vehicleId
                    // For now, let's use a simple mapping or fallback to raw name
                    const displayVehicle = labels.vehicles[r.vehicleName] || r.vehicleName;
                    const displayStatus = labels.statuses[r.status] || r.status;
                    
                    return (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-mono text-xs">{r.id}</td>
                        <td className="py-3 pr-4">{formatDateTimeJST(r.pickupTime, locale)}</td>
                        <td className="py-3 pr-4">{displayVehicle}</td>
                        <td className="py-3 pr-4">{formatMoneyFromJpy(r.totalJpy, currency, locale)}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center gap-2">
                            {displayStatus}
                            {r.isUrgent ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                {labels.urgentTag}
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {r.status === "CANCELLED" ? (
                            <span className="text-slate-400">{labels.cancelled}</span>
                          ) : (
                            <button
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                              onClick={() => setCancelBookingId(r.id)}
                            >
                              {labels.cancel}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {cancelBookingId ? (
          <div className="mt-4 p-5 rounded-2xl bg-white border border-slate-200">
            <div className="font-semibold">{labels.cancelTitle}</div>
            <div className="text-sm text-slate-600 mt-1">{labels.id}：<span className="font-mono text-xs">{cancelBookingId}</span></div>
            <div className="mt-3 grid md:grid-cols-2 gap-3 items-end">
              <label className="text-sm block">
                <div className="text-slate-700 mb-1">{labels.cancelReason}</div>
                <input
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={cancel}
                  disabled={loading}
                >
                  {loading ? labels.processing : labels.cancelConfirm}
                </button>
                <button
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50"
                  onClick={() => setCancelBookingId(null)}
                  disabled={loading}
                >
                  {labels.close}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


