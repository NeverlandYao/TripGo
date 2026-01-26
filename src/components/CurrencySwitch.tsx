"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function CurrencySwitch({
  currency,
  label,
  items
}: {
  currency: "JPY" | "CNY" | "USD";
  label: string;
  items: Array<{ code: "JPY" | "CNY" | "USD"; text: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function setCurrency(next: "JPY" | "CNY" | "USD") {
    await fetch("/api/currency", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currency: next })
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <select
        className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
        value={currency}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const next = e.target.value as "JPY" | "CNY" | "USD";
            await setCurrency(next);
            router.refresh();
          })
        }
      >
        {items.map((it) => (
          <option key={it.code} value={it.code}>
            {it.text}
          </option>
        ))}
      </select>
    </div>
  );
}


