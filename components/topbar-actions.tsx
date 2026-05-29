"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getUser, type AuthUser } from "@/lib/api";

type OpenMenu = null | "notif" | "settings";

export function TopbarActions() {
  const router = useRouter();
  const [open, setOpen] = useState<OpenMenu>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Baca sesi setelah mount agar tidak terjadi hydration mismatch (localStorage hanya ada di klien).
  useEffect(() => {
    setUser(getUser());
  }, []);

  const nama = user?.nasabah?.nama ?? "Nasabah";
  const initial = nama.charAt(0).toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle(menu: Exclude<OpenMenu, null>) {
    setOpen((cur) => (cur === menu ? null : menu));
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div ref={ref} className="flex items-center gap-2 relative">
      {/* Notifikasi */}
      <button
        onClick={() => toggle("notif")}
        aria-label="Notifikasi"
        className={`p-2 rounded-full transition-colors ${open === "notif" ? "bg-surface-container" : "hover:bg-surface-container-low"}`}
      >
        <span className="material-symbols-outlined text-primary">notifications</span>
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
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest rounded-2xl border border-outline-variant soft-shadow p-4 z-50">
          <p className="text-sm font-bold text-on-surface mb-3">Notifikasi</p>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">notifications_off</span>
            <p className="text-sm text-on-surface-variant">Belum ada notifikasi baru.</p>
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
