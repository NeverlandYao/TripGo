"use client";

import { useEffect, useMemo, useState } from "react";
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

type AdminRow = {
  id: string;
  createdAt: string;
  pickupTime: string;
  fromTo: string;
  vehicleName: string;
  contactName: string;
  contactEmail: string;
  status: string;
  isUrgent: boolean;
  totalJpy: number;
  manualAdjustmentJpy: number;
  pricingNote: string | null;
};
type Labels = {
  loginTitle: string;
  loginSubtitle: string;
  enter: string;
  loading: string;
  orders: string;
  edit: string;
  editTitle: string;
  status: string;
  manualAdjustment: string;
  note: string;
  save: string;
  saving: string;
  id: string;
  pickupTime: string;
  route: string;
  vehicle: string;
  amount: string;
  action: string;
  empty: string;
  adjustmentHint: string;
  notePlaceholder: string;
  loginPlaceholder: string;
  urgentTag: string;
  close: string;
  export: string;
  dateType: string;
  dateRange: string;
  dateTypeCreated: string;
  dateTypePickup: string;
  today: string;
  yesterday: string;
  thisMonth: string;
  all: string;
  filter: string;
  statuses: Record<string, string>;
  vehicles: Record<string, string>;
};

export function AdminClient({ labels, locale = "zh-CN" }: { labels: Labels; locale?: string }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [currency, setCurrency] = useState<Currency>("JPY");

  // Filters
  const [dateType, setDateType] = useState<"createdAt" | "pickupTime">("createdAt");
  const [filterPreset, setFilterPreset] = useState<"TODAY" | "YESTERDAY" | "THIS_MONTH" | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRow = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);
  const [status, setStatus] = useState<string>("CONFIRMED");
  const [manualAdjustmentJpy, setManualAdjustmentJpy] = useState<number>(0);
  const [pricingNote, setPricingNote] = useState<string>("");

  useEffect(() => {
    setCurrency(getCurrencyFromCookie());
  }, []);

  function getFilterDates() {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    if (filterPreset === "TODAY") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (filterPreset === "YESTERDAY") {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (filterPreset === "THIS_MONTH") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    return { startDate: null, endDate: null };
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getFilterDates();
      const params = new URLSearchParams();
      params.append("dateType", dateType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (filterStatus !== "ALL") params.append("status", filterStatus);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { "x-admin-token": token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "加载失败");
      setRows(data.rows ?? []);
    } catch (e: any) {
      setError(e?.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function exportOrders() {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getFilterDates();
      const params = new URLSearchParams();
      params.append("dateType", dateType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (filterStatus !== "ALL") params.append("status", filterStatus);

      const res = await fetch(`/api/admin/orders/export?${params.toString()}`, {
        headers: { "x-admin-token": token }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "导出失败");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      setError(e?.message ?? "导出失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!editingRow) return;
    setStatus(editingRow.status);
    setManualAdjustmentJpy(editingRow.manualAdjustmentJpy);
    setPricingNote(editingRow.pricingNote ?? "");
  }, [editingRow]);

  async function save() {
    if (!editingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({
          bookingId: editingId,
          status,
          manualAdjustmentJpy,
          pricingNote
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "保存失败");
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-white border border-slate-200">
        <div className="font-semibold">{labels.loginTitle}</div>
        <div className="text-sm text-slate-600 mt-1">{labels.loginSubtitle}</div>
        <div className="mt-4 flex flex-col md:flex-row gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={labels.loginPlaceholder}
          />
          <button
            onClick={load}
            disabled={!token || loading}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? labels.loading : labels.enter}
          </button>
        </div>
        {error ? (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        ) : null}
      </div>

      <div className="p-5 rounded-2xl bg-white border border-slate-200">
        <div className="font-semibold">{labels.orders}</div>
        
        {/* Filter Controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">{labels.dateType}</div>
            <select
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              value={dateType}
              onChange={(e) => setDateType(e.target.value as any)}
            >
              <option value="createdAt">{labels.dateTypeCreated}</option>
              <option value="pickupTime">{labels.dateTypePickup}</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">{labels.dateRange}</div>
            <select
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              value={filterPreset}
              onChange={(e) => setFilterPreset(e.target.value as any)}
            >
              <option value="ALL">{labels.all}</option>
              <option value="TODAY">{labels.today}</option>
              <option value="YESTERDAY">{labels.yesterday}</option>
              <option value="THIS_MONTH">{labels.thisMonth}</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">{labels.status}</div>
            <select
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">{labels.all}</option>
              {Object.entries(labels.statuses).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={load}
              disabled={loading || !token}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-60 text-sm font-medium"
            >
              {labels.filter}
            </button>
            <button
              onClick={exportOrders}
              disabled={loading || !token}
              className="flex-1 px-4 py-2 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 disabled:opacity-60 text-sm font-medium"
            >
              {labels.export}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4">{labels.id}</th>
                <th className="py-2 pr-4">{labels.pickupTime}</th>
                <th className="py-2 pr-4">{labels.route}</th>
                <th className="py-2 pr-4">{labels.vehicle}</th>
                <th className="py-2 pr-4">{labels.amount}</th>
                <th className="py-2 pr-4">{labels.status}</th>
                <th className="py-2 pr-4">{labels.action}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={7}>
                    {labels.empty}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const displayVehicle = labels.vehicles[r.vehicleName] || r.vehicleName;
                  const displayStatus = labels.statuses[r.status] || r.status;

                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-mono text-xs">{r.id}</td>
                        <td className="py-3 pr-4">{formatDateTimeJST(r.pickupTime, locale)}</td>
                        <td className="py-3 pr-4">{r.fromTo}</td>
                        <td className="py-3 pr-4">{displayVehicle}</td>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{formatMoneyFromJpy(r.totalJpy, currency, locale)}</div>
                          {r.manualAdjustmentJpy !== 0 ? (
                            <div className="text-xs text-slate-500">
                              {labels.manualAdjustment}: {formatMoneyFromJpy(r.manualAdjustmentJpy, currency, locale)}
                            </div>
                          ) : null}
                        </td>
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
                      <button
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        onClick={() => setEditingId(r.id)}
                      >
                        {labels.edit}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {editingRow ? (
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="font-semibold">{labels.editTitle}</div>
          <div className="text-sm text-slate-600 mt-1">
            {editingRow.id} · {editingRow.contactName}（{editingRow.contactEmail}）
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <label className="text-sm block">
              <div className="text-slate-700 mb-1">{labels.status}</div>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {Object.entries(labels.statuses).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>

            <label className="text-sm block">
              <div className="text-slate-700 mb-1">{labels.manualAdjustment}</div>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                value={manualAdjustmentJpy}
                onChange={(e) => setManualAdjustmentJpy(Number(e.target.value))}
              />
              <div className="text-xs text-slate-500 mt-1">{labels.adjustmentHint}</div>
            </label>

            <label className="text-sm block">
              <div className="text-slate-700 mb-1">{labels.note}</div>
              <input
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                value={pricingNote}
                onChange={(e) => setPricingNote(e.target.value)}
                placeholder={labels.notePlaceholder}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
              disabled={loading}
              onClick={save}
            >
              {loading ? labels.saving : labels.save}
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
              disabled={loading}
              onClick={() => setEditingId(null)}
            >
              {labels.close}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


