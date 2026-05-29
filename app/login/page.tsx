"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { checkHealth, login, saveSession } from "@/lib/api";

type ApiStatus = "checking" | "online" | "offline";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let active = true;
    checkHealth().then((ok) => {
      if (active) setApiStatus(ok ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      saveSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Silakan coba lagi.");
      setLoading(false);
    }
  }

  const apiBadge = {
    checking: { label: "Mengecek API...", dotClass: "bg-outline", ping: false },
    online: { label: "API Status: Operational", dotClass: "bg-primary", ping: true },
    offline: { label: "API Status: Tidak tersedia", dotClass: "bg-error", ping: false },
  }[apiStatus];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background Elements */}
      <div className="bg-blob w-[500px] h-[500px] bg-primary-container top-[-100px] left-[-100px]" />
      <div className="bg-blob w-[400px] h-[400px] bg-secondary-container bottom-[-50px] right-[-50px]" />

      <main className="flex-grow flex flex-col items-center justify-center px-5 py-12">
        {/* Brand Identity */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white soft-shadow">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Tabungan Haji</h1>
          </div>
          <p className="text-sm font-semibold text-on-surface-variant tracking-wide">
            Modern Banking for Modern Journey
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[440px] glass-card rounded-2xl p-8 soft-shadow border border-outline-variant animate-fade-in-up delay-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-on-surface mb-2">Selamat Datang</h2>
            <p className="text-base text-on-surface-variant">Silakan masuk untuk mengelola tabungan Anda.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="username">
                Username
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  person
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full h-14 pl-[52px] pr-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-on-surface" htmlFor="password">
                  Password
                </label>
                <a className="text-xs font-bold text-primary hover:underline transition-all" href="#">
                  Lupa Password?
                </a>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 pl-[52px] pr-[52px] bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-white text-lg rounded-xl flex items-center justify-center gap-2 bouncy-hover bouncy-click soft-shadow mt-6 transition-all hover:bg-primary-fixed-variant disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <span className="material-symbols-outlined">chevron_right</span>
                </>
              )}
            </button>
          </form>

          {/* Registration Prompt */}
          <div className="mt-8 pt-6 border-t border-outline-variant text-center">
            <p className="text-base text-on-surface-variant">
              Belum punya rekening?{" "}
              <Link className="text-primary font-bold hover:underline transition-all" href="/register">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Badges & API Status */}
        <div className="mt-8 flex flex-col items-center gap-6 animate-fade-in-up delay-200">
          <div className="flex items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <span className="text-xs font-extrabold text-on-surface">OJK TERDAFTAR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
              <span className="text-xs font-extrabold text-on-surface">SSL ENCRYPTED</span>
            </div>
          </div>

          {/* API Status Indicator (real-time via checkHealth) */}
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full border border-outline-variant">
            <span className="relative flex h-2 w-2">
              {apiBadge.ping && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${apiBadge.dotClass}`} />
            </span>
            <span className="text-xs font-semibold text-on-surface-variant">{apiBadge.label}</span>
          </div>
        </div>
      </main>

      {/* Decorative accents */}
      <div className="hidden lg:block fixed left-12 bottom-12 w-48 h-48 pointer-events-none opacity-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="rounded-3xl object-cover w-full h-full shadow-2xl rotate-[-6deg]"
          alt="Tasbih hijau zamrud di atas permukaan marmer putih dengan cahaya keemasan."
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBE8csISAwE2dMm5GTeKUEgd9jEPyeYMkRK98OG42_v9mU48Gvfolu5nEPQY9BdOZSVsuPaJak9sXvSohnA9CaDYa1vrOh3xfIDHeEBveemHOoS2c70pYl-q5lTfXgGrX5xrb7JrAwPkjIGXPT0legjyUATkZpeD8DdwTkFK5H3Y2nHwxlDxkwbtFjdF3livEcy9mErbpcUgZzL7RsArj0jgXFkUtfA27zO1_Vc74L3J_F3G3Zy3FiK9U05i546u4pBEtZOyn_OgQ"
        />
      </div>
      <div className="hidden lg:block fixed right-12 top-12 w-64 h-64 pointer-events-none opacity-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="rounded-3xl object-cover w-full h-full shadow-2xl rotate-[12deg]"
          alt="Arsitektur geometris kayu minimalis bergaya Islami modern dengan langit biru cerah."
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeohfL_q7zhq3uIkFiB7SWf4tHoGkVk-8U-ym7oNOKP4XCFfS3-r18to7_Jfmat8tAddYCrdzEeofsQLDEYr-pyf7C4oGrzuHSF_zj-5gLiBaF4kcyfcVZNhiLAoIU5OdQ2DTme2_RVsalFzWcUeRzbDpMjsb96asZr9wQhywi5N5IyLLbxPYEdVMEGBwWpX6DXS12tu39FW0ICJnrLWt5T6PK4nFq3xRZfNwr6k6O6q2vAkSbfxz5w3iaWV2SsnP-HAD6EabuKQ"
        />
      </div>
    </div>
  );
}
