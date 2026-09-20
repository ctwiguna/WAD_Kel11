/**
 * Format & parsing uang — DESIGN_SPEC §1.2, PRD §9.1.
 *
 * Keputusan unit (dikonfirmasi PM): IDR disimpan sebagai integer rupiah penuh
 * (bukan minor unit / sen). Tidak ada desimal di seluruh aplikasi.
 * Field API: `amount` = integer rupiah >= 0.
 */

const GROUP_SEP = '.'

/** 1250000 -> "Rp1.250.000" (tanpa spasi, pemisah titik) */
export function formatIDR(value) {
  const n = normalizeAmount(value)
  if (n === null) return '—'
  return `Rp${group(n)}`
}

/** Format tanpa prefix, untuk input & raw value: 1250000 -> "1.250.000" */
export function formatRawAmount(value) {
  const n = normalizeAmount(value)
  if (n === null) return ''
  return group(n)
}

/** Angka pendek untuk rail/summary: 1250000 -> "1,25 jt" */
export function formatCompactIDR(value) {
  const n = normalizeAmount(value)
  if (n === null) return '—'
  if (n >= 1_000_000_000) return `Rp${trimZero(n / 1_000_000_000)} mdr`
  if (n >= 1_000_000) return `Rp${trimZero(n / 1_000_000)} jt`
  if (n >= 1_000) return `Rp${trimZero(n / 1_000)} rb`
  return `Rp${group(n)}`
}

function trimZero(num) {
  return String(Math.round(num * 100) / 100).replace('.', ',')
}

function group(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEP)
}

/** Menerima angka atau string apa pun -> integer rupiah, atau null bila tidak valid. */
export function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return Math.trunc(value)
  }
  const digits = String(value).replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isSafeInteger(n) ? n : null
}

/**
 * Parse input nominal dari user. Menerima "1.250.000", "1250000", " 1 250 000 ".
 * Menolak: kosong, nol, non-numerik, dan nilai melebihi batas aman.
 * Return { ok: true, amount } atau { ok: false, error }.
 */
export function parseAmountInput(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return { ok: false, error: 'Nominal wajib diisi.' }
  if (!/^[\d.\s,]+$/.test(text)) {
    return { ok: false, error: 'Nominal hanya boleh berisi angka.' }
  }
  const amount = normalizeAmount(text)
  if (amount === null) return { ok: false, error: 'Nominal tidak valid.' }
  if (amount <= 0) return { ok: false, error: 'Nominal harus lebih dari 0.' }
  if (amount > 999_999_999_999) {
    return { ok: false, error: 'Nominal terlalu besar. Maksimal Rp999.999.999.999.' }
  }
  return { ok: true, amount }
}

/** Format tanggal ISO -> "13 Sep 2026" */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return '—'
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** Selalu YYYY-MM-DD (dipakai untuk value <input type="date"> dan payload API) */
export function todayISO(now = new Date()) {
  const tz = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return tz.toISOString().slice(0, 10)
}

/** ISO timestamp -> "13 Sep 2026, 15.04" (WIB = UTC+7, tanpa DST) */
export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  // Geser ke WIB lalu baca bagian UTC-nya (WIB tidak memakai DST).
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const tanggal = `${wib.getUTCDate()} ${MONTHS[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`
  const jam = String(wib.getUTCHours()).padStart(2, '0')
  const menit = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${tanggal}, ${jam}.${menit}`
}

/** Label periode bulan: "September 2026" dari "2026-09" */
export function formatPeriod(periodKey) {
  const [y, m] = String(periodKey).split('-').map(Number)
  if (!y || !m) return '—'
  const names = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  return `${names[m - 1]} ${y}`
}

/**
 * Persentase terpakai, aman dari pembagian nol.
 * over === true berarti melebihi 100%.
 */
export function usagePercent(actual, total) {
  const a = normalizeAmount(actual) ?? 0
  const t = normalizeAmount(total) ?? 0
  if (t <= 0) return { value: 0, label: '0%', over: a > 0 }
  const pct = (a / t) * 100
  return { value: Math.min(100, pct), over: a > t, label: `${Math.round(pct)}%` }
}
