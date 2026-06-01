"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";

type Field = {
  id: keyof FormState;
  label: string;
  icon: string;
  type?: string;
  placeholder: string;
  inputMode?: "numeric" | "email" | "tel" | "text";
  autoComplete?: string;
};

type FormState = {
  username: string;
  nik: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
};

const VERIFY_FIELDS: Field[] = [
  {
    id: "username",
    label: "Username",
    icon: "person",
    placeholder: "Username akun Anda",
    autoComplete: "username",
  },
  {
    id: "nik",
    label: "NIK (16 digit)",
    icon: "badge",
    placeholder: "3201020107950001",
    inputMode: "numeric",
  },
  {
    id: "email",
    label: "Email Terdaftar",
    icon: "mail",
    placeholder: "nama@email.com",
    type: "email",
    inputMode: "email",
    autoComplete: "email",
  },
];

export default function LupaPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    username: "",
    nik: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  function set<K extends keyof FormState>(id: K, value: string) {
    setForm((f) => ({ ...f, [id]: value }));
  }

  function validate(): string | null {
    if (form.username.trim().length < 1) return "Username wajib diisi.";
    if (!/^\d{16}$/.test(form.nik)) return "NIK harus 16 digit angka.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Format email tidak valid.";
    if (form.newPassword.length < 8) return "Password baru minimal 8 karakter.";
    if (form.newPassword !== form.confirmPassword)
      return "Konfirmasi password tidak sama dengan password baru.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const msg = validate();
    if (msg) {
      setError(msg);
      setSuccess(null);
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await resetPassword({
        username: form.username.trim(),
        nik: form.nik.trim(),
        email: form.email.trim(),
        newPassword: form.newPassword,
      });
      setSuccess(result.message);
      setForm({
        username: "",
        nik: "",
        email: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mereset password. Silakan coba lagi.",
      );
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blob w-[500px] h-[500px] bg-primary-container top-[-100px] left-[-100px]" />
      <div className="bg-blob w-[400px] h-[400px] bg-secondary-container bottom-[-50px] right-[-50px]" />

      <main className="flex-grow flex flex-col items-center justify-center px-5 py-12">
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white soft-shadow">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock_reset
              </span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Lupa Password</h1>
          </div>
          <p className="text-sm font-semibold text-on-surface-variant tracking-wide">
            Verifikasi identitas Anda untuk membuat password baru
          </p>
        </div>

        <div className="w-full max-w-[460px] glass-card rounded-2xl p-8 soft-shadow border border-outline-variant animate-fade-in-up delay-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-on-surface mb-2">
              Reset Password
            </h2>
            <p className="text-base text-on-surface-variant">
              Masukkan username, NIK, dan email yang terdaftar saat pendaftaran.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {VERIFY_FIELDS.map((f) => (
              <div key={f.id} className="space-y-2">
                <label
                  className="text-sm font-semibold text-on-surface"
                  htmlFor={f.id}
                >
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
                    autoComplete={f.autoComplete}
                    value={form[f.id]}
                    onChange={(e) => set(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full h-14 pl-[52px] pr-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-on-surface"
                htmlFor="newPassword"
              >
                Password Baru
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.newPassword}
                  onChange={(e) => set("newPassword", e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full h-14 pl-[52px] pr-[52px] bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-on-surface"
                htmlFor="confirmPassword"
              >
                Konfirmasi Password Baru
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full h-14 pl-[52px] pr-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-3 text-on-primary-container">
                <span className="material-symbols-outlined text-primary">
                  check_circle
                </span>
                <span className="text-sm font-semibold">{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || Boolean(success)}
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
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
                  <span>Reset Password</span>
                  <span className="material-symbols-outlined">lock_reset</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant text-center">
            <p className="text-base text-on-surface-variant">
              Ingat password Anda?{" "}
              <Link
                className="text-primary font-bold hover:underline transition-all"
                href="/login"
              >
                Kembali ke Login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
