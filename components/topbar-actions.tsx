"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  formatRupiah,
  getUser,
  listTabungan,
  listTransaksi,
  type AuthUser,
  type Tabungan,
  type Transaksi,
} from "@/lib/api";

type OpenMenu = null | "notif" | "settings";

type Notifikasi = {
  id: string;
  waktu: string;
  icon: string;
  tone: "success" | "danger" | "info";
  title: string;
  subtitle: string;
};

const MAX_NOTIF = 20;
const LAST_SEEN_KEY_PREFIX = "th_notif_last_seen:";

function lastSeenKey(userId: string): string {
  return `${LAST_SEEN_KEY_PREFIX}${userId}`;
}

function readLastSeen(userId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(lastSeenKey(userId));
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeLastSeen(userId: string, ts: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(lastSeenKey(userId), String(ts));
}

function mask(nomor: string): string {
  return nomor.length <= 4 ? nomor : `…${nomor.slice(-4)}`;
}

function formatRelatif(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "-";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toNotifikasi(trx: Transaksi, rek: Tabungan): Notifikasi {
  const nominal = formatRupiah(trx.nominal);
  const rekening = `Rek ${mask(rek.nomorRekening)}`;
  const pembukaan = trx.referensi.startsWith("OPN-");

  if (pembukaan) {
    return {
      id: trx.id,
      waktu: trx.waktu,
      icon: "celebration",
      tone: "info",
      title: "Rekening baru dibuka",
      subtitle: `Setoran awal ${nominal} · ${rekening}`,
    };
  }
  if (trx.jenis === "SETORAN") {
    return {
      id: trx.id,
      waktu: trx.waktu,
      icon: "add_circle",
      tone: "success",
      title: `Setoran ${nominal} berhasil`,
      subtitle: `${rekening}${trx.metode ? ` · ${trx.metode}` : ""}`,
    };
  }
  return {
    id: trx.id,
    waktu: trx.waktu,
    icon: "remove_circle",
    tone: "danger",
    title: `Penarikan ${nominal} berhasil`,
    subtitle: `${rekening}${trx.metode ? ` · ${trx.metode}` : ""}`,
  };
}

const TONE_CLASS: Record<Notifikasi["tone"], string> = {
  success: "bg-primary/10 text-primary",
  danger: "bg-error/10 text-error",
  info: "bg-secondary-container text-on-secondary-container",
};

export function TopbarActions() {
  const router = useRouter();
  const [open, setOpen] = useState<OpenMenu>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifs, setNotifs] = useState<Notifikasi[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Baca sesi setelah mount agar tidak terjadi hydration mismatch (localStorage hanya ada di klien).
  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) setLastSeen(readLastSeen(u.id));
  }, []);

  const nama = user?.nasabah?.nama ?? "Nasabah";
  const initial = nama.charAt(0).toUpperCase();

  const loadNotifikasi = useCallback(async () => {
    if (!user) return;
    setLoadingNotif(true);
    try {
      const rekeningList = await listTabungan(user.nasabahId);
      const perRek = await Promise.all(
        rekeningList.map((r) =>
          listTransaksi(r.id)
            .then((trx) => trx.map((t) => toNotifikasi(t, r)))
            .catch(() => [] as Notifikasi[]),
        ),
      );
      const merged = perRek
        .flat()
        .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
        .slice(0, MAX_NOTIF);
      setNotifs(merged);
    } finally {
      setLoadingNotif(false);
    }
  }, [user]);

  // Initial fetch saat user sudah terbaca
  useEffect(() => {
    if (user) void loadNotifikasi();
  }, [user, loadNotifikasi]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle(menu: Exclude<OpenMenu, null>) {
    setOpen((cur) => {
      const next = cur === menu ? null : menu;
      if (next === "notif") {
        // Refresh + tandai dibaca menggunakan timestamp transaksi terbaru saat ini.
        void loadNotifikasi();
        const topTs = notifs[0] ? new Date(notifs[0].waktu).getTime() : Date.now();
        if (user) {
          writeLastSeen(user.id, topTs);
          setLastSeen(topTs);
        }
      }
      return next;
    });
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  const unreadCount = notifs.filter(
    (n) => new Date(n.waktu).getTime() > lastSeen,
  ).length;

  return (
    <div ref={ref} className="flex items-center gap-2 relative">
      {/* Notifikasi */}
      <button
        onClick={() => toggle("notif")}
        aria-label="Notifikasi"
        className={`relative p-2 rounded-full transition-colors ${
          open === "notif" ? "bg-surface-container" : "hover:bg-surface-container-low"
        }`}
      >
        <span className="material-symbols-outlined text-primary">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Pengaturan */}
      <button
        onClick={() => toggle("settings")}
        aria-label="Pengaturan"
        className={`p-2 rounded-full transition-colors ${open === "settings" ? "bg-surface-container" : "hover:bg-surface-container-low"}`}
      >
        <span className="material-symbols-outlined text-primary">settings</span>
      </button>

      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold border-2 border-primary-fixed">
        {initial}
      </div>

      {/* Popover Notifikasi */}
      {open === "notif" && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest rounded-2xl border border-outline-variant soft-shadow z-50 flex flex-col max-h-[480px]">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-on-surface">Notifikasi</p>
            {notifs.length > 0 && (
              <span className="text-xs text-on-surface-variant">
                {notifs.length} terbaru
              </span>
            )}
          </div>

          <div className="overflow-y-auto px-2 pb-3">
            {loadingNotif && notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-3xl animate-pulse">
                  hourglass_top
                </span>
                <p className="text-sm text-on-surface-variant">Memuat notifikasi…</p>
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                  notifications_off
                </span>
                <p className="text-sm text-on-surface-variant">
                  Belum ada notifikasi baru.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {notifs.map((n) => {
                  const unread = new Date(n.waktu).getTime() > lastSeen;
                  return (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-2 py-3 rounded-xl ${
                        unread ? "bg-surface-container-low" : ""
                      }`}
                    >
                      <span
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${TONE_CLASS[n.tone]}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {n.icon}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {n.subtitle}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          {formatRelatif(n.waktu)}
                        </p>
                      </div>
                      {unread && (
                        <span
                          aria-label="Belum dibaca"
                          className="w-2 h-2 mt-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Popover Pengaturan */}
      {open === "settings" && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest rounded-2xl border border-outline-variant soft-shadow p-4 z-50">
          <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
            <div className="h-11 w-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{nama}</p>
              <p className="text-xs text-on-surface-variant truncate">@{user?.username ?? "-"}</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-xs text-on-surface-variant px-2 py-1">
              NIK: {user?.nasabah?.nik ?? "-"}
            </p>
            <button
              onClick={logout}
              className="w-full mt-1 flex items-center gap-3 px-2 py-3 text-error hover:bg-surface-container-low rounded-xl transition-colors text-left"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-sm font-semibold">Keluar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

