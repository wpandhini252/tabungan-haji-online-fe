"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { TopbarActions } from "@/components/topbar-actions";
import {
  createTransaksi,
  formatRupiah,
  getEstimasi,
  getTabungan,
  getToken,
  listTransaksi,
  setorQris,
  updateStatusTabungan,
  MIN_SETORAN,
  METODE_PENARIKAN,
  METODE_SETORAN,
  type Estimasi,
  type StatusTabungan,
  type Tabungan,
  type Transaksi,
} from "@/lib/api";

type ModalType = null | "setor" | "tarik" | "qris" | "status";

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_OPTIONS: StatusTabungan[] = ["AKTIF", "BLOKIR", "TUTUP"];

export default function DetailTabunganPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [tabungan, setTabungan] = useState<Tabungan | null>(null);
  const [estimasi, setEstimasi] = useState<Estimasi | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── State modal/form ──
  const [modal, setModal] = useState<ModalType>(null);
  const [nominal, setNominal] = useState("");
  const [metode, setMetode] = useState<string>("TUNAI");
  const [statusVal, setStatusVal] = useState<StatusTabungan>("AKTIF");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tab, est, trx] = await Promise.all([
      getTabungan(id),
      getEstimasi(id).catch(() => null),
      listTransaksi(id).catch(() => [] as Transaksi[]),
    ]);
    setTabungan(tab);
    setEstimasi(est);
    setTransaksi(
      trx.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()).slice(0, 3),
    );
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    let active = true;
    load()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat detail rekening.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, router]);

  const saldo = tabungan?.saldo ?? estimasi?.saldo ?? "0";
  const persen = estimasi ? Math.min(100, estimasi.persenTerkumpul) : 0;
  const nominalNum = Number(nominal) || 0;

  function openModal(type: Exclude<ModalType, null>) {
    setModalError(null);
    setNominal("");
    setMetode(type === "tarik" ? "TUNAI" : "TUNAI");
    setStatusVal(tabungan?.status ?? "AKTIF");
    setModal(type);
  }

  function closeModal() {
    if (submitting) return;
    setModal(null);
  }

  async function runMutation(fn: () => Promise<unknown>) {
    setSubmitting(true);
    setModalError(null);
    try {
      await fn();
      await load();
      setModal(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function submitSetor(e: React.FormEvent) {
    e.preventDefault();
    if (nominalNum < MIN_SETORAN) {
      setModalError(`Setoran minimal ${formatRupiah(MIN_SETORAN)}.`);
      return;
    }
    runMutation(() =>
      createTransaksi({ tabunganId: id, jenis: "SETORAN", nominal: nominalNum, metode }),
    );
  }

  function submitTarik(e: React.FormEvent) {
    e.preventDefault();
    if (nominalNum <= 0) {
      setModalError("Nominal penarikan harus lebih dari 0.");
      return;
    }
    if (nominalNum > Number(saldo)) {
      setModalError("Nominal melebihi saldo tersedia.");
      return;
    }
    runMutation(() =>
      createTransaksi({ tabunganId: id, jenis: "PENARIKAN", nominal: nominalNum, metode }),
    );
  }

  function submitQris(e: React.FormEvent) {
    e.preventDefault();
    if (nominalNum < MIN_SETORAN) {
      setModalError(`Setoran minimal ${formatRupiah(MIN_SETORAN)}.`);
      return;
    }
    runMutation(() => setorQris({ tabunganId: id, nominal: nominalNum }));
  }

  function submitStatus(e: React.FormEvent) {
    e.preventDefault();
    runMutation(() => updateStatusTabungan(id, statusVal));
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Top Nav */}
      <header className="bg-surface border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <Link href="/dashboard" className="text-2xl font-bold text-primary">
            Tabungan Haji Online
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold" href="/dashboard">Home</Link>
            <span className="text-primary font-bold border-b-2 border-primary pb-1 text-sm">Rekening</span>
            <Link className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold" href="/transaksi">Transaksi</Link>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold" href="#">Laporan</a>
          </nav>
          <TopbarActions />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header section */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Detail Rekening</h1>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={tabungan?.status} />
                <p className="text-base text-on-surface-variant">
                  Nomor Rekening: <span className="font-bold text-on-surface">{tabungan?.nomorRekening ?? "…"}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => openModal("status")}
              className="flex items-center gap-2 px-4 py-3 bg-surface-container-high text-on-surface text-sm font-semibold rounded-xl hover:bg-surface-container-highest transition-colors self-start"
            >
              <span className="material-symbols-outlined">edit</span>
              Ubah Status
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
            <span className="material-symbols-outlined text-error">error</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Balance card */}
            <div className="bg-primary text-on-primary p-8 rounded-[24px] relative overflow-hidden soft-shadow">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-secondary-container/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-sm font-semibold text-primary-fixed opacity-90 mb-2">Total Saldo Tersedia</p>
                    <h2 className="text-5xl font-extrabold leading-tight tracking-tight">
                      {loading ? "…" : formatRupiah(saldo)}
                    </h2>
                  </div>
                  <span className="material-symbols-outlined text-4xl opacity-50">account_balance_wallet</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                  <div>
                    <p className="text-xs font-bold text-primary-fixed opacity-80 uppercase">Setoran Awal Porsi</p>
                    <p className="text-2xl font-bold">{estimasi ? formatRupiah(estimasi.setoranAwalPorsi) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary-fixed opacity-80 uppercase">Target Pelunasan</p>
                    <p className="text-2xl font-bold">{estimasi ? formatRupiah(estimasi.biayaPelunasan) : "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action grid */}
            <div className="grid grid-cols-3 gap-4">
              <ActionButton icon="add_circle" label="Setor Tunai" color="primary" onClick={() => openModal("setor")} />
              <ActionButton icon="qr_code_scanner" label="Setor QRIS" color="secondary" fill onClick={() => openModal("qris")} />
              <ActionButton icon="payments" label="Tarik Saldo" color="error" onClick={() => openModal("tarik")} />
            </div>

            {/* Aktivitas terakhir */}
            <div className="bg-surface-container-low rounded-[24px] p-6 border border-outline-variant">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">Aktivitas Terakhir</h3>
                <Link className="text-primary text-sm font-semibold hover:underline" href="/transaksi">Lihat Semua</Link>
              </div>
              <div className="space-y-3">
                {transaksi.length === 0 && (
                  <p className="py-4 text-center text-sm text-on-surface-variant">
                    {loading ? "Memuat…" : "Belum ada aktivitas."}
                  </p>
                )}
                {transaksi.map((trx) => {
                  const masuk = trx.jenis === "SETORAN";
                  return (
                    <div key={trx.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant/30">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${masuk ? "bg-primary-container/30 text-primary" : "bg-error/10 text-error"}`}>
                          <span className="material-symbols-outlined text-xl">{masuk ? "call_made" : "call_received"}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{masuk ? "Setoran" : "Penarikan"}{trx.metode ? ` · ${trx.metode}` : ""}</p>
                          <p className="text-xs text-on-surface-variant">{formatTanggal(trx.waktu)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${masuk ? "text-primary" : "text-error"}`}>
                        {masuk ? "+" : "-"}{formatRupiah(trx.nominal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: estimasi */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[32px] p-8 border border-outline-variant soft-shadow flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-1">Estimasi Keberangkatan</h3>
                <p className="text-base text-on-surface-variant">Perkiraan jadwal berdasarkan kuota sistem saat ini.</p>
              </div>

              <div className="bg-surface-container p-6 rounded-2xl mb-8 border-l-4 border-secondary text-center">
                <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-2">Estimasi Tahun Haji</p>
                <h4 className="text-5xl font-extrabold text-on-surface">
                  {estimasi?.estimasiTahunKeberangkatan ?? "—"}
                  {estimasi?.estimasiTahunKeberangkatan && <span className="text-2xl font-bold text-on-surface-variant"> M</span>}
                </h4>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold">Status Pelunasan</span>
                  <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold">
                    {estimasi?.lunas ? "100% Lunas" : `${persen}%`}
                  </span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${persen}%` }} />
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                <Milestone
                  done={!!estimasi?.eligiblePorsi}
                  title="Setoran Awal Porsi"
                  desc={estimasi?.eligiblePorsi ? "Saldo memenuhi setoran awal porsi" : `Kurang ${estimasi ? formatRupiah(estimasi.kekuranganSetoranAwal) : "-"}`}
                />
                <Milestone
                  done={!!estimasi?.lunas}
                  title="Pelunasan (Bipih)"
                  desc={estimasi?.lunas ? "Pelunasan terpenuhi" : `Kurang ${estimasi ? formatRupiah(estimasi.kekuranganPelunasan) : "-"}`}
                />
                <Milestone
                  done={false}
                  title="Keberangkatan"
                  desc={estimasi?.estimasiTahunKeberangkatan ? `Dijadwalkan: Musim Haji ${estimasi.estimasiTahunKeberangkatan}` : "Belum tersedia"}
                  icon="flight_takeoff"
                />
              </div>

              <div className="mt-auto pt-6 border-t border-outline-variant/30">
                <div className="flex items-center gap-4 p-4 bg-secondary-container/20 rounded-2xl border border-secondary/20">
                  <span className="material-symbols-outlined text-secondary text-2xl">groups</span>
                  <div>
                    <p className="text-xs font-bold text-on-secondary-container uppercase">Sisa Kuota Nasional {estimasi?.tahunKuota ?? ""}</p>
                    <p className="text-2xl font-bold text-on-surface">
                      {estimasi ? new Intl.NumberFormat("id-ID").format(estimasi.sisaKuota) : "—"}{" "}
                      <span className="text-sm font-normal text-on-surface-variant">Jamaah</span>
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Estimasi mengikuti masa tunggu {estimasi?.masaTungguTahun ?? 20} tahun
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modal Setor Tunai ── */}
      <Modal open={modal === "setor"} onClose={closeModal} title="Setor Dana" icon="add_circle">
        <form className="space-y-4" onSubmit={submitSetor}>
          <NominalField value={nominal} onChange={setNominal} hint={`Setoran minimal ${formatRupiah(MIN_SETORAN)}`} />
          <MetodeField value={metode} onChange={setMetode} options={[...METODE_SETORAN]} />
          <PreviewSaldo current={Number(saldo)} delta={nominalNum} />
          {modalError && <ModalError message={modalError} />}
          <SubmitRow onCancel={closeModal} submitting={submitting} label="Proses Setoran" />
        </form>
      </Modal>

      {/* ── Modal Tarik Saldo ── */}
      <Modal open={modal === "tarik"} onClose={closeModal} title="Tarik Saldo" icon="payments">
        <form className="space-y-4" onSubmit={submitTarik}>
          <NominalField value={nominal} onChange={setNominal} hint={`Saldo tersedia ${formatRupiah(saldo)}`} />
          <MetodeField value={metode} onChange={setMetode} options={[...METODE_PENARIKAN]} />
          <PreviewSaldo current={Number(saldo)} delta={-nominalNum} />
          {modalError && <ModalError message={modalError} />}
          <SubmitRow onCancel={closeModal} submitting={submitting} label="Proses Penarikan" danger />
        </form>
      </Modal>

      {/* ── Modal Setor QRIS ── */}
      <Modal open={modal === "qris"} onClose={closeModal} title="Setor via QRIS" icon="qr_code_scanner">
        <form className="space-y-4" onSubmit={submitQris}>
          <NominalField value={nominal} onChange={setNominal} hint={`Setoran minimal ${formatRupiah(MIN_SETORAN)}`} />
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-40 h-40 rounded-2xl border-2 border-outline-variant bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[96px] text-on-surface">qr_code_2</span>
            </div>
            <p className="text-xs text-on-surface-variant text-center">
              Pindai dengan aplikasi pembayaran Anda, lalu konfirmasi.
            </p>
          </div>
          {modalError && <ModalError message={modalError} />}
          <SubmitRow onCancel={closeModal} submitting={submitting} label="Konfirmasi Pembayaran" />
        </form>
      </Modal>

      {/* ── Modal Ubah Status ── */}
      <Modal open={modal === "status"} onClose={closeModal} title="Ubah Status Rekening" icon="edit">
        <form className="space-y-4" onSubmit={submitStatus}>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((s) => (
              <label
                key={s}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  statusVal === s ? "border-primary bg-primary-container/10" : "border-outline-variant hover:bg-surface-container-low"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={statusVal === s}
                  onChange={() => setStatusVal(s)}
                  className="accent-primary"
                />
                <span className="text-sm font-semibold">{s}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            Rekening non-AKTIF tidak dapat menerima transaksi.
          </p>
          {modalError && <ModalError message={modalError} />}
          <SubmitRow onCancel={closeModal} submitting={submitting} label="Simpan" />
        </form>
      </Modal>
    </div>
  );
}

/* ── Sub-komponen ── */

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    AKTIF: "bg-secondary-container text-on-secondary-container",
    BLOKIR: "bg-error-container text-on-error-container",
    TUTUP: "bg-surface-container-high text-on-surface-variant",
  };
  const label = status ?? "TABUNGAN HAJI";
  return (
    <span className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${map[status ?? ""] ?? "bg-secondary-container text-on-secondary-container"}`}>
      {label}
    </span>
  );
}

function ActionButton({
  icon,
  label,
  color,
  fill,
  onClick,
}: {
  icon: string;
  label: string;
  color: "primary" | "secondary" | "error";
  fill?: boolean;
  onClick?: () => void;
}) {
  const hover = {
    primary: "hover:bg-primary-container hover:text-on-primary-container",
    secondary: "hover:bg-secondary-container hover:text-on-secondary-container",
    error: "hover:bg-error-container hover:text-on-error-container",
  }[color];
  const circle = {
    primary: "bg-primary-container text-on-primary-container",
    secondary: "bg-secondary-container text-on-secondary-container",
    error: "bg-surface-variant text-on-surface-variant",
  }[color];
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 p-6 bg-surface-container-low border border-outline-variant rounded-2xl transition-all bouncy-click group ${hover}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${circle}`}>
        <span className="material-symbols-outlined text-2xl" style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}>
          {icon}
        </span>
      </div>
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

function Milestone({ done, title, desc, icon = "check" }: { done: boolean; title: string; desc: string; icon?: string }) {
  return (
    <div className={`flex items-center gap-4 ${done ? "" : "opacity-60"}`}>
      <div
        className={
          done
            ? "w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0"
            : "w-8 h-8 rounded-full border-2 border-outline-variant text-outline-variant flex items-center justify-center shrink-0"
        }
      >
        <span className="material-symbols-outlined text-lg">{done ? "check" : icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-on-surface-variant">{desc}</p>
      </div>
    </div>
  );
}

function NominalField({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-on-surface" htmlFor="nominal">Nominal (Rp)</label>
      <input
        id="nominal"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder="0"
        autoFocus
        className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-lg font-bold transition-all outline-none"
      />
      {value && <p className="text-sm font-semibold text-primary">{formatRupiah(value)}</p>}
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

function MetodeField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-on-surface" htmlFor="metode">Metode</label>
      <select
        id="metode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base font-semibold transition-all outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function PreviewSaldo({ current, delta }: { current: number; delta: number }) {
  const after = current + delta;
  return (
    <div className="flex justify-between items-center px-4 py-3 bg-surface-container-low rounded-xl">
      <span className="text-sm text-on-surface-variant">Saldo setelah transaksi</span>
      <span className={`text-sm font-bold ${after < 0 ? "text-error" : "text-on-surface"}`}>{formatRupiah(after)}</span>
    </div>
  );
}

function ModalError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
      <span className="material-symbols-outlined text-error">error</span>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}

function SubmitRow({
  onCancel,
  submitting,
  label,
  danger,
}: {
  onCancel: () => void;
  submitting: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="h-12 px-5 bg-surface-container-high text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest transition-colors disabled:opacity-60"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={submitting}
        className={`flex-1 h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2 bouncy-click transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
          danger ? "bg-error hover:opacity-90" : "bg-primary hover:bg-primary-fixed-variant"
        }`}
      >
        {submitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Memproses…</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    </div>
  );
}
