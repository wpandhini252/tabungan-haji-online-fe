"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  formatRupiah,
  getEstimasi,
  getToken,
  getUser,
  listTabungan,
  listTransaksi,
  type Estimasi,
  type JenisTransaksi,
  type Tabungan,
  type Transaksi,
} from "@/lib/api";

const PAGE_SIZE = 8;
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatWaktu(iso: string): { tanggal: string; jam: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { tanggal: "-", jam: "" };
  return {
    tanggal: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    jam: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
  };
}

export default function TransaksiPage() {
  const router = useRouter();
  const now = new Date();

  const [tabungan, setTabungan] = useState<Tabungan[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [tipe, setTipe] = useState<"" | JenisTransaksi>("");
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [estimasi, setEstimasi] = useState<Estimasi | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Muat daftar rekening sekali
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    if (!u) {
      setLoading(false);
      return;
    }
    let active = true;
    listTabungan(u.nasabahId)
      .then((tabs) => {
        if (!active) return;
        setTabungan(tabs);
        setSelectedTab(tabs[0]?.id ?? "");
        if (tabs.length === 0) setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat rekening.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [router]);

  // Muat transaksi & estimasi tiap rekening terpilih berubah
  useEffect(() => {
    if (!selectedTab) return;
    let active = true;
    setLoading(true);
    setPage(1);
    Promise.all([listTransaksi(selectedTab), getEstimasi(selectedTab).catch(() => null)])
      .then(([trx, est]) => {
        if (!active) return;
        setTransaksi(trx.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()));
        setEstimasi(est);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat transaksi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTab]);

  const filtered = useMemo(
    () => (tipe ? transaksi.filter((t) => t.jenis === tipe) : transaksi),
    [transaksi, tipe],
  );

  const totalSetoranBulanIni = useMemo(() => {
    return transaksi
      .filter((t) => {
        const d = new Date(t.waktu);
        return t.jenis === "SETORAN" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, t) => sum + Number(t.nominal), 0);
  }, [transaksi, now]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar active="transaksi" />

      <main className="md:ml-64 min-h-screen p-6 lg:p-12 flex flex-col gap-8 max-w-[1440px] mx-auto">
        {/* Header + filters */}
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-on-surface">Riwayat Transaksi</h1>
            <p className="text-base text-on-surface-variant">
              Lacak semua aktivitas keuangan tabungan haji Anda.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center bg-surface-container-low p-3 rounded-2xl shadow-sm border border-outline-variant">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant ml-2">Rekening</label>
              <select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-semibold cursor-pointer pr-6 outline-none"
              >
                {tabungan.length === 0 && <option>Tidak ada rekening</option>}
                {tabungan.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tabungan Haji - {t.nomorRekening}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-px h-8 bg-outline-variant" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant ml-2">Tipe</label>
              <select
                value={tipe}
                onChange={(e) => {
                  setTipe(e.target.value as "" | JenisTransaksi);
                  setPage(1);
                }}
                className="bg-transparent border-none focus:ring-0 text-sm font-semibold cursor-pointer pr-6 outline-none"
              >
                <option value="">Semua Transaksi</option>
                <option value="SETORAN">Setoran</option>
                <option value="PENARIKAN">Penarikan</option>
              </select>
            </div>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
            <span className="material-symbols-outlined text-error">error</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Summary bento */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-primary relative overflow-hidden p-8 rounded-[24px] flex flex-col justify-between min-h-[200px] shadow-lg">
            <div className="relative z-10 flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-primary-fixed-dim uppercase tracking-wider">
                  Total Setoran Bulan Ini
                </span>
                <h2 className="text-5xl font-extrabold text-on-primary">
                  {loading ? "…" : formatRupiah(totalSetoranBulanIni)}
                </h2>
              </div>
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl">
                <span className="material-symbols-outlined text-on-primary text-[32px]">trending_up</span>
              </div>
            </div>
            <div className="relative z-10 text-base text-primary-fixed-dim">
              {BULAN[now.getMonth()]} {now.getFullYear()} · {filtered.length} transaksi
            </div>
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary-fixed-dim/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-secondary-container/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-secondary-container p-8 rounded-[24px] flex flex-col justify-center items-center gap-3 text-center shadow-md">
            <div className="w-16 h-16 bg-on-secondary-container/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container text-[32px]">verified_user</span>
            </div>
            <h3 className="text-2xl font-bold text-on-secondary-container">Status Akun</h3>
            <span className="bg-on-secondary-container text-white px-4 py-2 rounded-full text-sm font-semibold">
              TERVERIFIKASI
            </span>
            <p className="text-base text-on-secondary-container/70">
              {estimasi?.estimasiTahunKeberangkatan
                ? `Estimasi keberangkatan tahun ${estimasi.estimasiTahunKeberangkatan}`
                : "Estimasi keberangkatan belum tersedia"}
            </p>
          </div>
        </section>

        {/* Table */}
        <section className="bg-surface-container-lowest rounded-[24px] border border-outline-variant overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-2xl font-bold text-on-surface">Detail Transaksi</h3>
            <span className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              {BULAN[now.getMonth()]} {now.getFullYear()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Jenis</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Referensi</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-right">Nominal</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                      {loading ? "Memuat transaksi…" : "Tidak ada transaksi."}
                    </td>
                  </tr>
                )}
                {pageRows.map((trx) => {
                  const masuk = trx.jenis === "SETORAN";
                  const { tanggal, jam } = formatWaktu(trx.waktu);
                  return (
                    <tr key={trx.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">{tanggal}</span>
                          <span className="text-xs text-on-surface-variant">{jam}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${masuk ? "bg-primary/10" : "bg-error/10"}`}>
                            <span className={`material-symbols-outlined ${masuk ? "text-primary" : "text-error"}`}>
                              {masuk ? "add_circle" : "remove_circle"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-on-surface">{masuk ? "Setoran" : "Penarikan"}</span>
                            <span className="text-xs text-on-surface-variant">{trx.metode ?? "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{trx.referensi}</td>
                      <td className={`px-6 py-5 text-right text-base font-bold ${masuk ? "text-primary" : "text-error"}`}>
                        {masuk ? "+" : "-"}{formatRupiah(trx.nominal)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-semibold text-on-surface">
                        {formatRupiah(trx.saldoSesudah)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
            <span className="text-base text-on-surface-variant">
              Menampilkan {pageRows.length} dari {filtered.length} transaksi
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-semibold shadow-md">
                {page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
