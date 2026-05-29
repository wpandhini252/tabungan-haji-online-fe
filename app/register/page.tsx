"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, registerNasabah, registerUser, saveSession } from "@/lib/api";

type Field = {
  id: string;
  label: string;
  icon: string;
  type?: string;
  placeholder: string;
  inputMode?: "numeric" | "email" | "tel" | "text";
};

const STEP1_FIELDS: Field[] = [
  { id: "nik", label: "NIK (16 digit)", icon: "badge", placeholder: "3201020107950001", inputMode: "numeric" },
  { id: "nama", label: "Nama Lengkap", icon: "person", placeholder: "Nama sesuai KTP" },
  { id: "email", label: "Email", icon: "mail", placeholder: "nama@email.com", type: "email", inputMode: "email" },
  { id: "nomorHp", label: "Nomor HP", icon: "call", placeholder: "081234567890", inputMode: "tel" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nik: "",
    nama: "",
    email: "",
    nomorHp: "",
    username: "",
    password: "",
  });

  function set(id: string, value: string) {
    setForm((f) => ({ ...f, [id]: value }));
  }

  function validateStep1(): string | null {
    if (!/^\d{16}$/.test(form.nik)) return "NIK harus 16 digit angka.";
    if (form.nama.trim().length < 3) return "Nama minimal 3 karakter.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Format email tidak valid.";
    if (!/^08\d{8,11}$/.test(form.nomorHp)) return "Nomor HP harus format 08xxxxxxxxxx.";
    return null;
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    const msg = validateStep1();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (form.username.trim().length < 4) {
      setError("Username minimal 4 karakter.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const nasabah = await registerNasabah({
        nik: form.nik.trim(),
        nama: form.nama.trim(),
        email: form.email.trim(),
        nomorHp: form.nomorHp.trim(),
      });
      await registerUser({
        nasabahId: nasabah.id,
        username: form.username.trim(),
        password: form.password,
      });
      // Auto-login agar langsung masuk dashboard
      const result = await login(form.username.trim(), form.password);
      saveSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal. Silakan coba lagi.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blob w-[500px] h-[500px] bg-primary-container top-[-100px] left-[-100px]" />
      <div className="bg-blob w-[400px] h-[400px] bg-secondary-container bottom-[-50px] right-[-50px]" />

      <main className="flex-grow flex flex-col items-center justify-center px-5 py-12">
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white soft-shadow">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Tabungan Haji</h1>
          </div>
          <p className="text-sm font-semibold text-on-surface-variant tracking-wide">
            Buka rekening haji Anda dalam 2 langkah
          </p>
        </div>

        <div className="w-full max-w-[460px] glass-card rounded-2xl p-8 soft-shadow border border-outline-variant animate-fade-in-up delay-100">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <StepDot active n={1} />
              <div className={`h-0.5 flex-1 ${step === 2 ? "bg-primary" : "bg-outline-variant"}`} />
              <StepDot active={step === 2} n={2} />
            </div>
            <h2 className="text-2xl font-bold text-on-surface">
              {step === 1 ? "Data Diri" : "Buat Akun"}
            </h2>
            <p className="text-base text-on-surface-variant">
              {step === 1
                ? "Lengkapi data sesuai KTP Anda."
                : "Tentukan username & password untuk masuk."}
            </p>
          </div>

          {step === 1 ? (
            <form className="space-y-4" onSubmit={handleNext}>
              {STEP1_FIELDS.map((f) => (
                <div key={f.id} className="space-y-2">
                  <label className="text-sm font-semibold text-on-surface" htmlFor={f.id}>
                    {f.label}
                  </label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                      {f.icon}
                    </span>
                    <input
                      id={f.id}
                      type={f.type ?? "text"}
                      inputMode={f.inputMode}
                      value={form[f.id as keyof typeof form]}
                      onChange={(e) => set(f.id, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full h-14 pl-[52px] pr-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                    />
                  </div>
                </div>
              ))}

              {error && <ErrorAlert message={error} />}

              <button
                type="submit"
                className="w-full h-14 bg-primary text-white text-lg rounded-xl flex items-center justify-center gap-2 bouncy-hover bouncy-click soft-shadow mt-6 transition-all hover:bg-primary-fixed-variant"
              >
                <span>Lanjut</span>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="username">
                  Username
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                    alternate_email
                  </span>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={form.username}
                    onChange={(e) => set("username", e.target.value)}
                    placeholder="Pilih username"
                    className="w-full h-14 pl-[52px] pr-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Minimal 8 karakter"
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

              {error && <ErrorAlert message={error} />}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(1);
                  }}
                  className="h-14 px-6 bg-surface-container-high text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 bg-primary text-white text-lg rounded-xl flex items-center justify-center gap-2 bouncy-hover bouncy-click soft-shadow transition-all hover:bg-primary-fixed-variant disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Mendaftar...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar</span>
                      <span className="material-symbols-outlined">check_circle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-outline-variant text-center">
            <p className="text-base text-on-surface-variant">
              Sudah punya akun?{" "}
              <Link className="text-primary font-bold hover:underline transition-all" href="/login">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepDot({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
        active ? "bg-primary text-white" : "bg-outline-variant text-on-surface-variant"
      }`}
    >
      {n}
    </span>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
      <span className="material-symbols-outlined text-error">error</span>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}
