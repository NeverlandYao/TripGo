"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState("");
  const [t, setT] = useState<any>(null);

  useEffect(() => {
    // Fetch translations
    fetch("/api/locale")
      .then((res) => res.json())
      .then((data) => {
        // We'll just fetch all dicts and use the current locale
        fetch(`/api/auth/session`) // Just to get a feel, actually we need the dicts
        // Let's use a simpler way, since we don't have a direct dict API yet
        // For now, I'll hardcode some labels or just use the ones I added to dicts.ts
        // Actually, I should have a client-side translation helper
      });
  }, []);

  // Simple translation helper for this page
  const labels = {
    zh: {
      title: "登录 / 注册",
      email: "电子邮箱",
      code: "验证码",
      sendCode: "发送验证码",
      verifyCode: "验证并登录",
      sending: "发送中...",
      verifying: "验证中...",
      invalidEmail: "请输入有效的电子邮箱",
      invalidCode: "验证码错误或已过期",
      codeSent: "验证码已发送",
      back: "返回修改邮箱",
      emailHint: "输入您的邮箱以接收验证码",
      codeHint: "验证码已发送至",
      networkError: "网络错误",
      failedToSend: "发送失败",
      testMode: "MVP 测试模式",
      testCode: "验证码",
      testVisible: "(仅在开发环境显示)",
    },
    en: {
      title: "Login / Register",
      email: "Email Address",
      code: "Verification Code",
      sendCode: "Send Code",
      verifyCode: "Verify & Login",
      sending: "Sending...",
      verifying: "Verifying...",
      invalidEmail: "Please enter a valid email",
      invalidCode: "Invalid or expired code",
      codeSent: "Code sent",
      back: "Back to change email",
      emailHint: "Enter your email to receive a code",
      codeHint: "Verification code sent to",
      networkError: "Network error",
      failedToSend: "Failed to send code",
      testMode: "MVP Test Mode",
      testCode: "Code",
      testVisible: "(Only visible in dev)",
    }
  };

  // Detect locale from cookie or default to zh
  const locale = typeof document !== "undefined" && document.cookie.includes("NEXT_LOCALE=en") ? "en" : "zh";
  const l = labels[locale as keyof typeof labels];

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError(l.invalidEmail);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("code");
        setCountdown(60);
        if (data._dev_code) {
          setDevCode(data._dev_code);
        }
      } else {
        setError(data.error || l.failedToSend);
      }
    } catch (err) {
      setError(l.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) {
      setError(l.invalidCode);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        // Redirect to home or previous page
        window.location.href = "/";
      } else {
        setError(data.error || l.invalidCode);
      }
    } catch (err) {
      setError(l.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{l.title}</h1>
        <p className="text-slate-500 mb-8">
          {step === "email" ? l.emailHint : `${l.codeHint} ${email}`}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {l.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-lg shadow-brand-200"
            >
              {loading ? l.sending : l.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {l.code}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-center tracking-widest text-2xl font-bold"
              />
              {devCode && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                  <p className="font-bold mb-1">{l.testMode}:</p>
                  <p>{l.testCode}: <span className="font-mono text-lg font-bold">{devCode}</span></p>
                  <p className="text-xs mt-1 opacity-70">{l.testVisible}</p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-lg shadow-brand-200"
            >
              {loading ? l.verifying : l.verifyCode}
            </button>
            <div className="flex justify-between items-center text-sm">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-slate-500 hover:text-brand-600"
              >
                {l.back}
              </button>
              {countdown > 0 ? (
                <span className="text-slate-400">{countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-brand-600 font-medium"
                >
                  {l.sendCode}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
