"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopbarActions } from "@/components/topbar-actions";
import { BukaRekeningModal } from "@/components/buka-rekening-modal";
import { formatRupiah, getToken, getUser, listTabungan, type Tabungan } from "@/lib/api";

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_STYLE: Record<string, string> = {
  AKTIF: "bg-secondary-container text-on-secondary-container",
  BLOKIR: "bg-error-container text-on-error-container",
  TUTUP: "bg-surface-container-high text-on-surface-variant",
};

export default function RekeningPage() {
  const router = useRouter();
  const [tabungan, setTabungan] = useState<Tabungan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openBuka, setOpenBuka] = useState(false);

  const load = useCallback(async () => {
    const u = getUser();
    if (!u) return;
    const tabs = await listTabungan(u.nasabahId);
    setTabungan(tabs);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    let active = true;
    load()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat rekening.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, router]);

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar active="rekening" />

      <main className="md:ml-64 min-h-screen p-6 lg:p-12 flex flex-col gap-8 max-w-[1440px] mx-auto">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Rekening Saya</h1>
            <p className="text-base text-on-surface-variant">Kelola seluruh rekening tabungan haji Anda.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setOpenBuka(true)}
              className="flex items-center gap-2 bg-primary text-on-primary font-bold px-5 py-3 rounded-xl hover:bg-primary-fixed-variant transition-colors"
            >
              <span className="material-symbols-outlined">add_card</span>
              Buka Rekening Baru
            </button>
            <TopbarActions />
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
            <span className="material-symbols-outlined text-error">error</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Nomor Rekening</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Saldo</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant">Dibuka</th>
                  <th className="px-6 py-4 text-sm font-semibold text-on-surface-variant text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {tabungan.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                      {loading ? "Memuat rekening…" : "Belum ada rekening. Klik “Buka Rekening Baru”."}
                    </td>
                  </tr>
                )}
                {tabungan.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-5">
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
                    <td className="px-6 py-5 text-sm font-semibold text-on-surface">{formatRupiah(t.saldo)}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[t.status] ?? STATUS_STYLE.TUTUP}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">{formatTanggal(t.dibukaAt)}</td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/tabungan/${t.id}`}
                        className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline"
                      >
                        Detail
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <BukaRekeningModal
        open={openBuka}
        onClose={() => setOpenBuka(false)}
        onSuccess={() => {
          setOpenBuka(false);
          load();
        }}
      />
    </div>
  );
}
