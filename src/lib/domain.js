/**
 * Konstanta domain KeluargaFin — P0 Sprint 1.
 * Sumber: PRD §5, §7.2, DESIGN_SPEC §4C/§5.
 */

export const TXN_TYPE = {
  EXPENSE: 'expense',
  INCOME: 'income',
  TRANSFER: 'transfer',
}

export const TXN_TYPE_LABEL = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
  transfer: 'Transfer',
}

/**
 * Transfer BUKAN expense (PRD FR-BUD-01, DESIGN_SPEC §4C).
 * Satu-satunya tempat aturan ini didefinisikan — semua agregasi memanggil ini.
 */
export function countsAsExpense(txn) {
  return txn?.type === TXN_TYPE.EXPENSE
}

export function countsAsIncome(txn) {
  return txn?.type === TXN_TYPE.INCOME
}

export const MEMBER_ROLE = {
  OWNER: 'owner',
  CO_MANAGER: 'co_manager',
  CHILD: 'child',
}

export const MEMBER_ROLE_LABEL = {
  owner: 'Owner',
  co_manager: 'Co-manager',
  child: 'Profil anak',
}

/** Persona default onboarding: Ayah / Ibu / Anak (PRD §3). */
export const DEFAULT_MEMBER_SLOTS = [
  { slot: 'ayah', display_name: 'Ayah', role: MEMBER_ROLE.OWNER, role_label: 'Owner' },
  { slot: 'ibu', display_name: 'Ibu', role: MEMBER_ROLE.CO_MANAGER, role_label: 'Co-manager' },
  {
    slot: 'anak',
    display_name: 'Anak',
    role: MEMBER_ROLE.CHILD,
    role_label: 'Profil anak',
    profile_only: true,
  },
]

export const MEMBER_TONE = {
  ayah: 'ayah',
  ibu: 'ibu',
  anak: 'anak',
}

export const MEMBER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REVOKED: 'revoked',
}

/**
 * 8 kategori default (PM: 6–8 kategori). Semua expense kecuali Pemasukan.
 * `icon` = emoji supaya tanpa dependensi aset di Sprint 1.
 */
export const DEFAULT_CATEGORIES = [
  { key: 'makan', name: 'Makan & Minum', icon: '🍜', kind: 'expense' },
  { key: 'belanja', name: 'Belanja Harian', icon: '🛒', kind: 'expense' },
  { key: 'transport', name: 'Transportasi', icon: '🛵', kind: 'expense' },
  { key: 'rumah', name: 'Rumah & Tagihan', icon: '🏠', kind: 'expense' },
  { key: 'pendidikan', name: 'Pendidikan Anak', icon: '🎒', kind: 'expense' },
  { key: 'kesehatan', name: 'Kesehatan', icon: '💊', kind: 'expense' },
  { key: 'hiburan', name: 'Hiburan & Jajan', icon: '🍿', kind: 'expense' },
  { key: 'pemasukan', name: 'Pemasukan', icon: '💰', kind: 'income' },
]

export const UNCLASSIFIED_CATEGORY = {
  key: 'unclassified',
  name: 'Belum dikategori',
  icon: '•',
  kind: 'expense',
}

export const CURRENCY = 'IDR'
export const TIMEZONE = 'Asia/Jakarta'

/** Batas upload — PRD §8.2 (dipakai Sprint 2, sudah ditulis agar kontrak jelas). */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPages: 10,
  maxFilesPerBatch: 10,
  mime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  retentionDays: 30,
}

export const TRUST_COPY = {
  short: 'Kami tidak meminta password, PIN, atau OTP bank.',
  upload:
    'KeluargaFin membuat draft dari buktimu. Bukti selalu kamu review sebelum masuk laporan.',
  retention:
    'Dokumen asli disimpan maksimal 30 hari setelah transaksi disetujui, dan bisa kamu hapus lebih cepat.',
  full:
    'Kami tidak meminta password, PIN, atau OTP bank. Bukti transaksi dipakai untuk membuat draft dan selalu kamu review sebelum masuk laporan. Kamu dapat menghapus dokumen dan datamu kapan saja.',
}

/** Fitur di luar Sprint 1 — dinyatakan jujur di UI, bukan stub diam-diam. */
export const FEATURE_FLAGS = {
  ocrUpload: false, // Sprint 2
  budget: true,
  goals: false, // Sprint 3
  report: false, // Sprint 3
  advisor: false, // P1 / closed beta (PM: feature flag)
  googleSheets: false, // P2
}
