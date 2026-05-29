"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopbarActions } from "@/components/topbar-actions";
import { downloadLaporan, getToken, getUser, listTabungan, type Tabungan } from "@/lib/api";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function LaporanPage() {
  const router = useRouter();
  const now = new Date();

  const [tabungan, setTabungan] = useState<Tabungan[]>([]);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [rekening, setRekening] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tahunOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    if (!u) return;
    let active = true;
    listTabungan(u.nasabahId)
      .then((tabs) => {
        if (active) setTabungan(tabs);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = await downloadLaporan(tahun, bulan, rekening || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const namaFile = `laporan-transaksi-${tahun}-${String(bulan).padStart(2, "0")}.csv`;
      a.href = url;
      a.download = namaFile;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(`Berhasil mengunduh ${namaFile}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh laporan.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar active="laporan" />

      <main className="md:ml-64 min-h-screen p-6 lg:p-12 flex flex-col gap-8 max-w-[1440px] mx-auto">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Laporan Transaksi</h1>
            <p className="text-base text-on-surface-variant">Unduh rekap transaksi bulanan dalam format CSV.</p>
          </div>
          <TopbarActions />
        </header>

        <section className="max-w-2xl w-full bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">assessment</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">Buat Laporan Bulanan</h2>
              <p className="text-sm text-on-surface-variant">Pilih periode dan rekening, lalu unduh.</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleDownload}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="bulan">Bulan</label>
                <select
                  id="bulan"
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base font-semibold outline-none cursor-pointer"
                >
                  {BULAN.map((nama, i) => (
                    <option key={nama} value={i + 1}>{nama}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="tahun">Tahun</label>
                <select
                  id="tahun"
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base font-semibold outline-none cursor-pointer"
                >
                  {tahunOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="rekening">
                Rekening <span className="font-normal text-on-surface-variant">(opsional)</span>
              </label>
              <select
                id="rekening"
                value={rekening}
                onChange={(e) => setRekening(e.target.value)}
                className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base font-semibold outline-none cursor-pointer"
              >
                <option value="">Semua Rekening</option>
                {tabungan.map((t) => (
                  <option key={t.id} value={t.id}>Tabungan Haji - {t.nomorRekening}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-primary-container/20 px-4 py-3 text-on-primary-container">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <span className="text-sm font-semibold">{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={downloading}
              className="w-full h-14 bg-primary text-white text-lg font-bold rounded-xl flex items-center justify-center gap-2 bouncy-click transition-all hover:bg-primary-fixed-variant disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Mengunduh…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">download</span>
                  <span>Unduh CSV</span>
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
