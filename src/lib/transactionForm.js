/**
 * Validasi form transaksi manual (FR-TXN-01/02).
 * Murni dan tanpa React supaya bisa diuji langsung dan dipakai ulang di edit.
 */
import { TXN_TYPE } from './domain.js'
import { parseAmountInput } from './money.js'

export const EMPTY_TRANSACTION_FORM = {
  type: TXN_TYPE.EXPENSE,
  amount: '',
  occurred_at: '',
  category_id: null,
  member_id: null,
  from_account_id: null,
  to_account_id: null,
  note: '',
  merchant: '',
}

/**
 * @param {object} values
 * @param {object} ctx  { today, members: [], accounts: [] }
 * @returns {{ valid: boolean, errors: object, amount: number|null }}
 */
export function validateTransactionForm(values, ctx = {}) {
  const errors = {}
  const today = ctx.today ?? new Date().toISOString().slice(0, 10)
  const members = ctx.members ?? []
  const accounts = ctx.accounts ?? []

  if (!Object.values(TXN_TYPE).includes(values.type)) {
    errors.type = 'Jenis transaksi wajib dipilih.'
  }

  const parsed = parseAmountInput(values.amount)
  if (!parsed.ok) errors.amount = parsed.error

  const date = String(values.occurred_at ?? '').slice(0, 10) || today
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.occurred_at = 'Tanggal belum benar.'
  } else if (date > today) {
    errors.occurred_at = 'Tanggal tidak boleh di masa depan.'
  }

  const activeMembers = members.filter((m) => m.status === 'active')
  if (!values.member_id) {
    errors.member_id = 'Pilih anggota yang melakukan transaksi.'
  } else if (!activeMembers.some((m) => m.id === values.member_id)) {
    errors.member_id = 'Anggota harus anggota household yang aktif.'
  }

  if (values.type === TXN_TYPE.TRANSFER) {
    const ids = new Set(accounts.map((a) => a.id))
    if (!values.from_account_id) errors.from_account_id = 'Pilih akun asal.'
    if (!values.to_account_id) errors.to_account_id = 'Pilih akun tujuan.'
    if (values.from_account_id && values.from_account_id === values.to_account_id) {
      errors.to_account_id = 'Akun asal dan tujuan tidak boleh sama.'
    }
    if (values.from_account_id && !ids.has(values.from_account_id)) {
      errors.from_account_id = 'Akun asal tidak dikenal.'
    }
    if (values.to_account_id && !ids.has(values.to_account_id)) {
      errors.to_account_id = 'Akun tujuan tidak dikenal.'
    }
  } else if (values.type === TXN_TYPE.EXPENSE) {
    // Kategori tidak wajib: transaksi boleh masuk status "belum dikategori" (FR-TXN-03).
    if (values.category_id) {
      const ok = (ctx.categories ?? []).some((c) => c.id === values.category_id && !c.archived_at)
      if (!ok) errors.category_id = 'Kategori tidak tersedia untuk transaksi baru.'
    }
  }

  if (String(values.note ?? '').length > 280) {
    errors.note = 'Catatan maksimal 280 karakter.'
  }
  if (String(values.merchant ?? '').length > 60) {
    errors.merchant = 'Keterangan maksimal 60 karakter.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    amount: parsed.ok ? parsed.amount : null,
  }
}

/** Kunci idempotensi per percobaan simpan — submit ulang tidak membuat duplikat. */
export function makeIdempotencyKey() {
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
