"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DevUnlockClient({
  labels
}: {
  labels: { token: string; unlock: string; unlocking: string; success: string; failed: string };
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <label className="text-sm block">
        <div className="text-slate-700 mb-1">{labels.token}</div>
        <input
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="changeme-admin-token"
        />
      </label>
      <button
        disabled={!token || loading}
        className="w-full py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        onClick={async () => {
          setLoading(true);
          setMsg(null);
          try {
            const res = await fetch("/api/dev/unlock", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ token })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? labels.failed);
            setMsg(labels.success);
            // 等待一下确保 cookie 设置完成，然后刷新页面
            setTimeout(() => {
              window.location.href = "/admin";
            }, 300);
          } catch (e: any) {
            setMsg(e?.message ?? labels.failed);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? labels.unlocking : labels.unlock}
      </button>
      {msg ? (
        <div className="text-sm p-3 rounded-xl bg-slate-50 border border-slate-200">{msg}</div>
      ) : null}
    </div>
  );
}


