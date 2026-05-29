"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatRupiah,
  getEstimasi,
  getToken,
  getUser,
  listTabungan,
  listTransaksi,
  type AuthUser,
  type Estimasi,
  type Tabungan,
  type Transaksi,
} from "@/lib/api";
import { Sidebar } from "@/components/sidebar";
import { TopbarActions } from "@/components/topbar-actions";

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tabungan, setTabungan] = useState<Tabungan[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [estimasi, setEstimasi] = useState<Estimasi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const u = getUser();
    setUser(u);
    if (!u) {
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        const tabs = await listTabungan(u.nasabahId);
        if (!active) return;
        setTabungan(tabs);

        if (tabs.length > 0) {
          const primary = [...tabs].sort((a, b) => Number(b.saldo) - Number(a.saldo))[0];
          const [est, ...trxLists] = await Promise.all([
            getEstimasi(primary.id).catch(() => null),
            ...tabs.map((t) => listTransaksi(t.id).catch(() => [])),
          ]);
          if (!active) return;
          setEstimasi(est);
          const merged = trxLists
            .flat()
            .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
          setTransaksi(merged.slice(0, 4));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat data.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const totalSaldo = useMemo(
    () => tabungan.reduce((sum, t) => sum + Number(t.saldo), 0),
    [tabungan],
  );

  const namaLengkap = user?.nasabah?.nama ?? "Nasabah";

  return (
    <div className="text-on-surface">
      <Sidebar active="home" />

      {/* ── Main Content ── */}
      <main className="md:ml-64 min-h-screen pb-24 md:pb-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md px-6 py-4 flex justify-between items-center max-w-7xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
          <TopbarActions />
        </header>

        <section className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-on-surface">Assalamualaikum, {namaLengkap}</h3>
            <p className="text-lg text-on-surface-variant">
              Semoga berkah menyertai perjalanan ibadah Anda hari ini.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
              <span className="material-symbols-outlined text-error">error</span>
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
            {/* Total Saldo */}
            <div className="md:col-span-8 bg-primary-container p-8 rounded-2xl relative overflow-hidden group border border-[#F3F4F6]">
              <div className="relative z-10">
                <p className="text-sm font-semibold text-on-primary-container mb-2">
                  Total Saldo Terkonsolidasi
                </p>
                <h4 className="text-5xl font-extrabold text-on-secondary-container mb-4">
                  {loading ? "…" : formatRupiah(totalSaldo)}
                </h4>
                <div className="flex gap-3">
                  <span className="px-4 py-1 bg-on-primary-container/10 rounded-full text-xs font-bold text-on-primary-container flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">savings</span>
                    {tabungan.length} rekening aktif
                  </span>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
              <span className="material-symbols-outlined absolute right-6 top-6 text-on-primary-container/20 text-[120px] pointer-events-none">
                payments
              </span>
            </div>

            {/* Secondary cards */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-[#F3F4F6] flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-on-surface-variant">Estimasi Berangkat</p>
                  <p className="text-2xl font-bold text-secondary">
                    {estimasi?.estimasiTahunKeberangkatan
                      ? `Tahun ${estimasi.estimasiTahunKeberangkatan}`
                      : "Belum tersedia"}
                  </p>
                </div>
                <div className="h-12 w-12 bg-secondary-fixed rounded-xl flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined">flight_takeoff</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-[#F3F4F6]">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-semibold text-on-surface-variant">Progress Tabungan</p>
                  <span className="text-sm font-bold text-primary">
                    {estimasi
                      ? estimasi.lunas
                        ? "Lunas 100%"
                        : `${estimasi.persenTerkumpul}%`
                      : "0%"}
                  </span>
                </div>
                <div className="w-full h-3 bg-primary-fixed/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full transition-all"
                    style={{ width: `${estimasi ? Math.min(100, estimasi.persenTerkumpul) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rekening & Transaksi */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rekening Saya */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-2xl font-bold">Rekening Saya</h5>
                <button className="text-primary text-sm font-semibold hover:underline">Lihat Semua</button>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Nomor Rekening</th>
                      <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Saldo</th>
                      <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {tabungan.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                          {loading ? "Memuat rekening…" : "Belum ada rekening."}
                        </td>
                      </tr>
                    )}
                    {tabungan.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => router.push(`/tabungan/${t.id}`)}
                        className="hover:bg-surface-container/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-secondary-fixed/50 rounded-lg flex items-center justify-center text-secondary">
                              <span className="material-symbols-outlined">account_balance</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-on-surface">Tabungan Haji</p>
                              <p className="text-xs text-on-surface-variant">{t.nomorRekening}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-sm font-semibold text-on-surface">
                          {formatRupiah(t.saldo)}
                        </td>
                        <td className="px-6 py-6">
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaksi Terakhir */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-2xl font-bold">Transaksi Terakhir</h5>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4 flex flex-col gap-4">
                {transaksi.length === 0 && (
                  <p className="py-8 text-center text-sm text-on-surface-variant">
                    {loading ? "Memuat transaksi…" : "Belum ada transaksi."}
                  </p>
                )}
                {transaksi.map((trx) => {
                  const masuk = trx.jenis === "SETORAN";
                  return (
                    <div
                      key={trx.id}
                      className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-xl transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={
                            masuk
                              ? "h-12 w-12 bg-primary-container/20 rounded-full flex items-center justify-center text-primary"
                              : "h-12 w-12 bg-tertiary-container/20 rounded-full flex items-center justify-center text-tertiary"
                          }
                        >
                          <span className="material-symbols-outlined">
                            {masuk ? "add_circle" : "remove_circle"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            {masuk ? "Setoran" : "Penarikan"}
                            {trx.metode ? ` · ${trx.metode}` : ""}
                          </p>
                          <p className="text-xs text-on-surface-variant">{formatTanggal(trx.waktu)}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold ${masuk ? "text-primary" : "text-error"}`}>
                        {masuk ? "+" : "-"}
                        {formatRupiah(trx.nominal)}
                      </p>
                    </div>
                  );
                })}
                <button className="w-full mt-4 py-3 text-sm font-semibold text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container transition-colors">
                  Lihat Riwayat Lengkap
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-5 py-4 flex justify-around items-center z-50 rounded-t-3xl">
        <a className="p-3 text-primary" href="#">
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            home
          </span>
        </a>
        <a className="p-3 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
        </a>
        <div className="relative -top-6">
          <button className="h-14 w-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">add</span>
          </button>
        </div>
        <a className="p-3 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined text-[28px]">swap_horiz</span>
        </a>
        <a className="p-3 text-on-surface-variant" href="#">
          <span className="material-symbols-outlined text-[28px]">person</span>
        </a>
      </nav>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AKTIF: "bg-primary-fixed/20 text-on-primary-fixed-variant",
    BLOKIR: "bg-error-container text-on-error-container",
    TUTUP: "bg-surface-container-high text-on-surface-variant",
  };
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${map[status] ?? map.TUTUP}`}>
      {label}
    </span>
  );
}
