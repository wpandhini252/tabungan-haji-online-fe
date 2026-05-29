"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { createTabungan, formatRupiah, getUser, type Tabungan } from "@/lib/api";

export function BukaRekeningModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (tabungan: Tabungan) => void;
}) {
  const [nomor, setNomor] = useState("");
  const [saldo, setSaldo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNomor("");
      setSaldo("");
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const user = getUser();
    if (!user) {
      setError("Sesi tidak valid. Silakan login ulang.");
      return;
    }
    if (nomor && !/^\d{10,20}$/.test(nomor)) {
      setError("Nomor rekening harus 10–20 digit angka.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tab = await createTabungan({
        nasabahId: user.nasabahId,
        nomorRekening: nomor || undefined,
        saldoAwal: saldo ? Number(saldo) : undefined,
      });
      onSuccess?.(tab);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka rekening.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Buka Rekening Baru" icon="add_card">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface" htmlFor="nomorRekening">
            Nomor Rekening <span className="font-normal text-on-surface-variant">(opsional)</span>
          </label>
          <input
            id="nomorRekening"
            type="text"
            inputMode="numeric"
            value={nomor}
            onChange={(e) => setNomor(e.target.value.replace(/\D/g, ""))}
            placeholder="Kosongkan untuk nomor otomatis"
            className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-base transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface" htmlFor="saldoAwal">
            Saldo Awal <span className="font-normal text-on-surface-variant">(opsional)</span>
          </label>
          <input
            id="saldoAwal"
            type="text"
            inputMode="numeric"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="w-full h-14 px-4 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-lg font-bold transition-all outline-none"
          />
          {saldo && <p className="text-sm font-semibold text-primary">{formatRupiah(saldo)}</p>}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
            <span className="material-symbols-outlined text-error">error</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-12 px-5 bg-surface-container-high text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 bouncy-click transition-all hover:bg-primary-fixed-variant disabled:opacity-70 disabled:cursor-not-allowed"
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
              <span>Buka Rekening</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
