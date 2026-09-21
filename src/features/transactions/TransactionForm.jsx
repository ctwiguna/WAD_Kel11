/**
 * Form catat/ubah transaksi manual.
 * 5 field inti terbuka; detail lain (akun, keterangan, catatan) ada di balik "Detail lainnya".
 */
import { useState } from 'react'
import { createCategory, createTransaction, updateTransaction, friendlyMessage } from '../../API/getData.js'
import { FEATURE_FLAGS, TRUST_COPY, TXN_TYPE, TXN_TYPE_LABEL } from '../../lib/domain.js'
import { formatRawAmount, parseAmountInput, todayISO } from '../../lib/money.js'
import { EMPTY_TRANSACTION_FORM, makeIdempotencyKey, validateTransactionForm } from '../../lib/transactionForm.js'
import { track } from '../../lib/analytics.js'
import { BottomSheet } from '../../components/ui/BottomSheet.jsx'
import { InlineBanner, TrustCallout } from '../../components/ui/feedback.jsx'
import {
  Button, Chip, Field, MemberAvatar, Select, TextArea, TextInput, cx,
} from '../../components/ui/primitives.jsx'

const TYPE_ORDER = [TXN_TYPE.EXPENSE, TXN_TYPE.INCOME, TXN_TYPE.TRANSFER]

export default function TransactionForm({
  open,
  onClose,
  transaction = null,
  household,
  onRefreshHousehold,
  onSaved,
  showToast,
}) {
  const members = household?.members ?? []
  const accounts = household?.accounts ?? []
  const categories = household?.categories ?? []
  const isEdit = Boolean(transaction)

  const [values, setValues] = useState(() =>
    transaction
      ? {
          ...EMPTY_TRANSACTION_FORM,
          type: transaction.type,
          amount: formatRawAmount(transaction.amount),
          occurred_at: transaction.occurred_at?.slice(0, 10) ?? todayISO(),
          category_id: transaction.category_id ?? null,
          member_id: transaction.member_id ?? null,
          from_account_id: transaction.from_account_id ?? null,
          to_account_id: transaction.to_account_id ?? null,
          note: transaction.note ?? '',
          merchant: transaction.merchant ?? '',
        }
      : { ...EMPTY_TRANSACTION_FORM, occurred_at: todayISO(), member_id: members[0]?.id ?? null },
  )
  const [showErrors, setShowErrors] = useState(false)
  const [status, setStatus] = useState('idle') // idle | pending | error
  const [submitError, setSubmitError] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [newCategory, setNewCategory] = useState(null)
  const [categoryError, setCategoryError] = useState(null)
  const [categoryPending, setCategoryPending] = useState(false)
  const [idemKey] = useState(() => makeIdempotencyKey())

  const today = todayISO()
  const { valid, errors, amount } = validateTransactionForm(values, {
    today,
    members,
    accounts,
    categories,
  })
  const shown = showErrors ? errors : {}

  const activeCategories = categories.filter(
    (c) => !c.archived_at && c.kind === (values.type === TXN_TYPE.INCOME ? 'income' : 'expense'),
  )

  function update(patch) {
    setValues((prev) => ({ ...prev, ...patch }))
    if (status === 'error') {
      setStatus('idle')
      setSubmitError(null)
    }
  }

  async function handleCreateCategory() {
    const name = String(newCategory?.name ?? '').trim()
    if (name.length < 2) {
      setCategoryError('Nama kategori minimal 2 karakter.')
      return
    }
    setCategoryPending(true)
    setCategoryError(null)
    try {
      const res = await createCategory(household.id, {
        name,
        icon: newCategory?.icon || '🏷️',
      })
      await onRefreshHousehold?.()
      update({ category_id: res.category.id })
      setNewCategory(null)
      showToast(`Kategori “${res.category.name}” dibuat.`, 'success')
    } catch (error) {
      setCategoryError(friendlyMessage(error))
    } finally {
      setCategoryPending(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setShowErrors(true)
    if (!valid) return

    setStatus('pending')
    setSubmitError(null)

    const payload = {
      type: values.type,
      amount,
      occurred_at: values.occurred_at || today,
      category_id: values.type === TXN_TYPE.TRANSFER ? null : values.category_id,
      member_id: values.member_id,
      merchant: values.merchant,
      note: values.note,
      from_account_id: values.type === TXN_TYPE.TRANSFER ? values.from_account_id : null,
      to_account_id: values.type === TXN_TYPE.TRANSFER ? values.to_account_id : null,
    }

    try {
      if (isEdit) {
        await updateTransaction(household.id, transaction.id, payload)
      } else {
        await createTransaction(household.id, payload, idemKey)
      }
      track(isEdit ? 'transaction_edited' : 'transaction_created', {
        type: payload.type,
        amount,
        counted_as_expense: payload.type === TXN_TYPE.EXPENSE,
      })
      if (!isEdit) track('transaction_approved', { source: 'manual' })
      showToast(
        payload.type === TXN_TYPE.TRANSFER
          ? 'Transfer disimpan. Tidak mengurangi budget.'
          : 'Transaksi tersimpan.',
        'success',
      )
      onSaved?.()
      onClose?.()
    } catch (error) {
      setStatus('error')
      setSubmitError(friendlyMessage(error))
      // Sheet TIDAK ditutup sebelum sukses.
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Ubah transaksi' : 'Catat transaksi'}
      description={isEdit ? 'Perubahan tercatat di audit trail.' : 'Isi 5 hal ini saja, sisanya opsional.'}
      footer={
        <div className="flex flex-col gap-2 pt-1">
          <Button size="lg" type="submit" form="txn-form" loading={status === 'pending'} disabled={status === 'pending'}>
            {isEdit ? 'Simpan perubahan' : 'Simpan'}
          </Button>
          <p className="text-center text-micro text-ink-500">
            {valid ? 'Siap disimpan.' : 'Lengkapi isian wajib dulu, ya.'}
          </p>
        </div>
      }
    >
      <form id="txn-form" className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {/* 1. Jenis */}
        <fieldset>
          <legend className="text-label font-semibold text-ink-900">Jenis</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TYPE_ORDER.map((type) => (
              <Chip
                key={type}
                selected={values.type === type}
                onClick={() => update({ type })}
                aria-label={TXN_TYPE_LABEL[type]}
              >
                {TXN_TYPE_LABEL[type]}
              </Chip>
            ))}
          </div>
          {values.type === TXN_TYPE.TRANSFER && (
            <p className="mt-2 text-caption text-brand-900">
              Transfer antar akun tidak mengurangi budget.
            </p>
          )}
        </fieldset>

        {/* 2. Nominal — input terbesar */}
        <Field label="Nominal" htmlFor="txn-amount" required error={shown.amount} hint="Angka penuh, contoh 25000">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label text-ink-500">
              Rp
            </span>
            <TextInput
              id="txn-amount"
              inputMode="decimal"
              autoFocus
              value={values.amount}
              invalid={Boolean(shown.amount)}
              className="money h-14 pl-10 text-h1 font-bold"
              placeholder="0"
              aria-describedby={shown.amount ? 'txn-amount-error' : 'txn-amount-hint'}
              onBlur={() => {
                const parsed = parseAmountInput(values.amount)
                if (parsed.ok) update({ amount: formatRawAmount(parsed.amount) })
              }}
              onChange={(e) => update({ amount: e.target.value })}
            />
          </div>
        </Field>

        {/* 3. Tanggal */}
        <Field label="Tanggal" htmlFor="txn-date" required error={shown.occurred_at}>
          <TextInput
            id="txn-date"
            type="date"
            max={today}
            value={values.occurred_at}
            invalid={Boolean(shown.occurred_at)}
            onChange={(e) => update({ occurred_at: e.target.value })}
          />
        </Field>

        {/* 4. Kategori */}
        {values.type !== TXN_TYPE.TRANSFER && (
          <fieldset>
            <legend className="text-label font-semibold text-ink-900">Kategori</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {activeCategories.map((cat) => (
                <Chip
                  key={cat.id}
                  selected={values.category_id === cat.id}
                  onClick={() => update({ category_id: values.category_id === cat.id ? null : cat.id })}
                >
                  <span aria-hidden="true">{cat.icon}</span> {cat.name}
                </Chip>
              ))}
              <Chip selected={Boolean(newCategory)} onClick={() => setNewCategory(newCategory ? null : { name: '', icon: '🏷️' })}>
                + Buat baru
              </Chip>
            </div>
            {shown.category_id && (
              <p role="alert" className="mt-1.5 text-caption font-medium text-danger-fg">
                {shown.category_id}
              </p>
            )}
            {newCategory && (
              <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
                <Field label="Nama kategori baru" htmlFor="new-cat-name" error={categoryError}>
                  <TextInput
                    id="new-cat-name"
                    value={newCategory.name}
                    maxLength={30}
                    placeholder="Contoh: Les Renang"
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </Field>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={handleCreateCategory} loading={categoryPending}>
                    Simpan kategori
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNewCategory(null)}>
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </fieldset>
        )}

        {/* 5. Member */}
        <fieldset>
          <legend className="text-label font-semibold text-ink-900">Untuk anggota</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={values.member_id === m.id}
                onClick={() => update({ member_id: m.id })}
                className={cx(
                  'flex min-h-11 items-center gap-2 rounded-full border px-3 text-caption font-semibold',
                  values.member_id === m.id
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-line bg-surface text-ink-700',
                )}
              >
                <MemberAvatar name={m.display_name} slot={m.slot} size="sm" />
                {m.display_name}
              </button>
            ))}
          </div>
          {shown.member_id && (
            <p role="alert" className="mt-1.5 text-caption font-medium text-danger-fg">
              {shown.member_id}
            </p>
          )}
        </fieldset>

        {/* Detail lainnya */}
        <div className="rounded-2xl border border-line">
          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between px-3 text-label font-semibold text-ink-900"
          >
            Detail lainnya
            <span aria-hidden="true">{detailsOpen ? '−' : '+'}</span>
          </button>
          {detailsOpen && (
            <div className="flex flex-col gap-3 border-t border-line p-3">
              {values.type === TXN_TYPE.TRANSFER ? (
                <>
                  <Field label="Dari akun" htmlFor="txn-from" required error={shown.from_account_id}>
                    <Select
                      id="txn-from"
                      value={values.from_account_id ?? ''}
                      invalid={Boolean(shown.from_account_id)}
                      onChange={(e) => update({ from_account_id: e.target.value || null })}
                    >
                      <option value="">Pilih akun asal</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Ke akun" htmlFor="txn-to" required error={shown.to_account_id}>
                    <Select
                      id="txn-to"
                      value={values.to_account_id ?? ''}
                      invalid={Boolean(shown.to_account_id)}
                      onChange={(e) => update({ to_account_id: e.target.value || null })}
                    >
                      <option value="">Pilih akun tujuan</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              ) : (
                <Field
                  label="Keterangan"
                  htmlFor="txn-merchant"
                  error={shown.merchant}
                  hint="Contoh: Indomaret Tembalang"
                >
                  <TextInput
                    id="txn-merchant"
                    value={values.merchant}
                    maxLength={60}
                    invalid={Boolean(shown.merchant)}
                    onChange={(e) => update({ merchant: e.target.value })}
                  />
                </Field>
              )}

              <Field label="Catatan" htmlFor="txn-note" error={shown.note}>
                <TextArea
                  id="txn-note"
                  value={values.note}
                  maxLength={280}
                  invalid={Boolean(shown.note)}
                  placeholder="Opsional"
                  onChange={(e) => update({ note: e.target.value })}
                />
              </Field>

              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-caption text-ink-700">Lampiran bukti</p>
                <p className="mt-1 text-micro text-ink-500">
                  {FEATURE_FLAGS.ocrUpload
                    ? 'Unggah struk atau screenshot.'
                    : 'Belum aktif di Sprint 1. Upload & review OCR masuk Sprint 2.'}
                </p>
              </div>

              <TrustCallout variant="compact">{TRUST_COPY.short}</TrustCallout>
            </div>
          )}
        </div>

        {status === 'error' && submitError && (
          <InlineBanner
            tone="danger"
            title="Transaksi belum tersimpan"
            action={
              <Button size="sm" variant="secondary" onClick={handleSubmit}>
                Coba lagi
              </Button>
            }
          >
            {submitError}
          </InlineBanner>
        )}

        {values.type === TXN_TYPE.TRANSFER && (
          <InlineBanner tone="info">
            Transfer tidak dihitung sebagai pengeluaran di budget, kategori, maupun dashboard.
          </InlineBanner>
        )}
      </form>
    </BottomSheet>
  )
}
