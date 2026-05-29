const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"

const HEALTH_URL = API_URL.replace(/\/api\/v1\/?$/, "") + "/health";

export async function checkHealth(): Promise<boolean>{
    try{
        const res = await fetch(HEALTH_URL);
        if (!res.ok) return false;
        return (await res.json())?.status === "ok";
    } catch (error) {
        return false;
    }
}

// ── Tipe data autentikasi (mengikuti respons POST /api/v1/user/login) ──
export type Nasabah = {
    id: string;
    nik: string;
    nama: string;
    email: string;
    nomorHp: string;
};

export type AuthUser = {
    id: string;
    username: string;
    nasabahId: string;
    nasabah: Nasabah;
};

export type LoginResult = {
    message: string;
    token: string;
    data: AuthUser;
};

const TOKEN_KEY = "th_token";
const USER_KEY = "th_user";

/**
 * Login ke backend. Mengembalikan token JWT + data user.
 * Melempar Error dengan pesan dari API bila gagal (mis. INVALID_CREDENTIALS).
 */
export async function login(username: string, password: string): Promise<LoginResult> {
    let res: Response;
    try {
        res = await fetch(`${API_URL}/user/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
    } catch {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json?.message ?? "Username atau password salah.");
    }
    return json as LoginResult;
}

/** Simpan sesi (token + data user) ke localStorage. */
export function saveSession(result: LoginResult): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.data));
}

/** Ambil token JWT tersimpan (null bila belum login). */
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

/** Ambil data user dari sesi tersimpan (null bila belum login). */
export function getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

/** Hapus sesi (logout di sisi klien). */
export function clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// ── Tipe data domain (BigInt diserialisasi backend sebagai string) ──
export type StatusTabungan = "AKTIF" | "BLOKIR" | "TUTUP";
export type JenisTransaksi = "SETORAN" | "PENARIKAN";

export type Tabungan = {
    id: string;
    nasabahId: string;
    nomorRekening: string;
    saldo: string;
    status: StatusTabungan;
    dibukaAt: string;
    nasabah?: { id: string; nik: string; nama: string; email: string };
};

export type Transaksi = {
    id: string;
    tabunganId: string;
    jenis: JenisTransaksi;
    nominal: string;
    saldoSebelum: string;
    saldoSesudah: string;
    referensi: string;
    metode?: string;
    waktu: string;
};

export type Estimasi = {
    tabunganId: string;
    nomorRekening: string;
    status: StatusTabungan;
    nasabah?: { id: string; nik: string; nama: string };
    saldo: string;
    setoranAwalPorsi: string;
    biayaPelunasan: string;
    eligiblePorsi: boolean;
    lunas: boolean;
    kekuranganSetoranAwal: string;
    kekuranganPelunasan: string;
    persenTerkumpul: number;
    masaTungguTahun: number;
    tahunPendaftaran: number | null;
    estimasiTahunKeberangkatan: number | null;
    kuotaTahunan: number;
    tahunKuota: number;
    porsiTerisi: number;
    sisaKuota: number;
    keterangan: string;
};

/** GET terautentikasi (menyertakan Bearer token). */
async function authGet<T>(path: string): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json?.message ?? `Request gagal (${res.status}).`);
    }
    return json as T;
}

/** Daftar rekening milik seorang nasabah. */
export async function listTabungan(nasabahId: string): Promise<Tabungan[]> {
    const json = await authGet<{ data: Tabungan[] }>(
        `/tabungan?nasabahId=${encodeURIComponent(nasabahId)}`,
    );
    return json.data ?? [];
}

/** Estimasi keberangkatan haji untuk sebuah rekening. */
export async function getEstimasi(tabunganId: string): Promise<Estimasi> {
    const json = await authGet<{ data: Estimasi }>(`/tabungan/${tabunganId}/estimasi`);
    return json.data;
}

/** Daftar transaksi untuk sebuah rekening. */
export async function listTransaksi(tabunganId: string): Promise<Transaksi[]> {
    const json = await authGet<{ data: Transaksi[] }>(
        `/transaksi?tabunganId=${encodeURIComponent(tabunganId)}`,
    );
    return json.data ?? [];
}

/** Detail satu rekening. */
export async function getTabungan(id: string): Promise<Tabungan> {
    const json = await authGet<{ data: Tabungan }>(`/tabungan/${id}`);
    return json.data;
}

/** POST/PATCH terautentikasi dengan body JSON. */
async function authSend<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
    const token = getToken();
    let res: Response;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
    } catch {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json?.message ?? `Request gagal (${res.status}).`);
    }
    return json as T;
}

export const METODE_SETORAN = ["TUNAI", "TRANSFER", "DEBIT", "KARTU"] as const;
export const METODE_PENARIKAN = ["TUNAI", "TRANSFER"] as const;
export const MIN_SETORAN = 100000;

/** Catat transaksi setoran/penarikan. */
export async function createTransaksi(input: {
    tabunganId: string;
    jenis: JenisTransaksi;
    nominal: number;
    metode?: string;
}): Promise<Transaksi> {
    const json = await authSend<{ data: Transaksi }>("/transaksi", "POST", input);
    return json.data;
}

/** Setoran via QRIS. */
export async function setorQris(input: { tabunganId: string; nominal: number }): Promise<Transaksi> {
    const json = await authSend<{ data: Transaksi }>("/transaksi/qris/setor", "POST", input);
    return json.data;
}

/** Ubah status rekening (AKTIF/BLOKIR/TUTUP). */
export async function updateStatusTabungan(id: string, status: StatusTabungan): Promise<Tabungan> {
    const json = await authSend<{ data: Tabungan }>(`/tabungan/${id}`, "PATCH", { status });
    return json.data;
}

/** Buka rekening tabungan haji baru. */
export async function createTabungan(input: {
    nasabahId: string;
    nomorRekening?: string;
    saldoAwal?: number;
}): Promise<Tabungan> {
    const body: Record<string, unknown> = { nasabahId: input.nasabahId };
    if (input.nomorRekening) body.nomorRekening = input.nomorRekening;
    if (input.saldoAwal != null) body.saldoAwal = input.saldoAwal;
    const json = await authSend<{ data: Tabungan }>("/tabungan", "POST", body);
    return json.data;
}

/** Unduh laporan transaksi bulanan (CSV) sebagai Blob. */
export async function downloadLaporan(
    tahun: number,
    bulan: number,
    tabunganId?: string,
): Promise<Blob> {
    const token = getToken();
    const qs = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) });
    if (tabunganId) qs.set("tabunganId", tabunganId);
    const res = await fetch(`${API_URL}/transaksi/laporan/bulanan?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message ?? "Gagal mengunduh laporan.");
    }
    return res.blob();
}

// ── Registrasi (endpoint publik) ──
export async function registerNasabah(input: {
    nik: string;
    nama: string;
    email: string;
    nomorHp: string;
}): Promise<Nasabah> {
    let res: Response;
    try {
        res = await fetch(`${API_URL}/nasabah`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    } catch {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json?.message ?? "Gagal mendaftarkan nasabah.");
    }
    return json.data as Nasabah;
}

export async function registerUser(input: {
    nasabahId: string;
    username: string;
    password: string;
}): Promise<AuthUser> {
    let res: Response;
    try {
        res = await fetch(`${API_URL}/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    } catch {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(json?.message ?? "Gagal membuat akun.");
    }
    return json.data as AuthUser;
}

/** Format angka menjadi "Rp 1.234.567". */
export function formatRupiah(value: string | number): string {
    const n = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(n)) return "Rp 0";
    return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}
