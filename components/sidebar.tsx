"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/api";
import { BukaRekeningModal } from "./buka-rekening-modal";

export type NavKey = "home" | "rekening" | "transaksi" | "laporan";

const ITEMS: { key: NavKey; icon: string; label: string; href: string }[] = [
  { key: "home", icon: "home", label: "Home", href: "/dashboard" },
  { key: "rekening", icon: "account_balance_wallet", label: "Rekening", href: "/rekening" },
  { key: "transaksi", icon: "swap_horiz", label: "Transaksi", href: "/transaksi" },
  { key: "laporan", icon: "assessment", label: "Laporan", href: "/laporan" },
];

export function Sidebar({ active }: { active: NavKey }) {
  const router = useRouter();
  const [openBuka, setOpenBuka] = useState(false);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <>
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex-col p-4 gap-6 z-40 hidden md:flex">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-extrabold text-primary">Tabungan Haji</h1>
          <p className="text-sm font-semibold text-on-surface-variant">Modern Banking</p>
        </div>
        <nav className="flex-1 flex flex-col gap-2">
          {ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={
                item.key === active
                  ? "flex items-center gap-4 bg-secondary-container text-on-secondary-container font-bold rounded-xl px-4 py-3"
                  : "flex items-center gap-4 text-on-surface-variant hover:bg-surface-container-high px-4 py-3 rounded-xl transition-all"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => setOpenBuka(true)}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:opacity-90 transition-opacity mb-4"
          >
            Buka Rekening Baru
          </button>
          <a
            href="#"
            className="flex items-center gap-4 text-on-surface-variant hover:bg-surface-container-high px-4 py-3 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm font-semibold">Bantuan</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 text-error hover:bg-surface-container-high px-4 py-3 rounded-xl transition-all text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-semibold">Keluar</span>
          </button>
        </div>
      </aside>

      <BukaRekeningModal
        open={openBuka}
        onClose={() => setOpenBuka(false)}
        onSuccess={(tab) => router.push(`/tabungan/${tab.id}`)}
      />
    </>
  );
}
