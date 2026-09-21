import { useState } from 'react'
import { getBudgets, getTransactions, createBudget, friendlyMessage } from '../../API/getData.js'
import { useFetch } from '../../hooks/useFetch.js'
import { computeBudget, currentMonthKey } from '../../lib/aggregate.js'
import { formatIDR, formatPeriod, parseAmountInput } from '../../lib/money.js'
import { track } from '../../lib/analytics.js'
import { BottomSheet } from '../../components/ui/BottomSheet.jsx'
import { EmptyState, ErrorState, InlineBanner } from '../../components/ui/feedback.jsx'
import {
  Button, Card, Chip, Field, ProgressBar, SectionHeader, Skeleton, StatusPill, TextInput,
} from '../../components/ui/primitives.jsx'

const PRESETS = [1_000_000, 2_000_000, 3_000_000, 5_000_000]

function statusOf(b) {
  if (b.over) return { tone: 'danger', label: 'Lewat budget' }
  if (b.rawPercent >= 80) return { tone: 'warning', label: 'Perlu perhatian' }
  return { tone: 'success', label: 'Aman' }
}

export default function BudgetPage({ household, showToast }) {
  const [monthKey] = useState(currentMonthKey())
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data, loading, error, refetch } = useFetch(
    () => getBudgets(household.id, { month: monthKey }),
    [household?.id, monthKey],
  )
  // Transaksi dipakai untuk menghitung actual; sumber angka sama dengan dashboard.
  const txns = useFetch(
    () => getTransactions(household.id, { month: monthKey, member: 'all' }),
    [household?.id, monthKey],
  )

  const [form, setForm] = useState({ category_id: null, amount: '' })
  const [formError, setFormError] = useState(null)
  const [saveState, setSaveState] = useState('idle')

  const budgets = (data?.budgets ?? []).map((b) => computeBudget(txns.data?.transactions ?? [], b))
  const householdBudgets = budgets.filter((b) => !b.category_id)
  const categoryBudgets = budgets.filter((b) => b.category_id)
  const totalBudget = householdBudgets.reduce((s, b) => s + b.total, 0)
  const totalActual = householdBudgets.reduce((s, b) => s + b.actual, 0)
  const totalRemaining = totalBudget - totalActual
  const totalPercent = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0

  function openSheet() {
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
  }

  async function handleSave() {
    const parsed = parseAmountInput(form.amount)
    if (!parsed.ok) {
      setFormError(parsed.error)
      return
    }
    setSaveState('pending')
    setFormError(null)
    try {
      await createBudget(household.id, {
        amount: parsed.amount,
        category_id: form.category_id,
        period_key: monthKey,
      })
      refetch()
      txns.refetch()
      track('budget_created', { source: 'budget_page', amount: parsed.amount })
      showToast('Budget tersimpan.', 'success')
      closeSheet()
      setForm({ category_id: null, amount: '' })
    } catch (err) {
      setFormError(friendlyMessage(err))
      setSaveState('error')
    } finally {
      setSaveState('idle')
    }
  }

  if (!household) return null

  const categories = household.categories ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold">Budget</h1>
          <p className="text-caption text-ink-500">{formatPeriod(monthKey)}</p>
        </div>
        <Button onClick={openSheet}>+ Buat budget</Button>
      </div>

      {loading && !data && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && !data && (
        <ErrorState title="Gagal memuat budget" message={friendlyMessage(error)} onRetry={refetch} />
      )}

      {data && budgets.length === 0 && (
        <EmptyState
          icon="🎯"
          title="Belum ada budget bulan ini"
          actions={<Button onClick={openSheet}>Buat budget keluarga</Button>}
        >
          Budget membuat Beranda bisa menjawab “bulan ini keluarga kita aman?”. Bisa dimulai dari
          nominal kasar.
        </EmptyState>
      )}

      {data && budgets.length > 0 && (
        <>
          <Card className="p-5">
            <p className="text-caption text-ink-500">Sisa budget bulan ini</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="money text-display font-bold text-ink-900">{formatIDR(totalRemaining)}</span>
              <StatusPill tone={totalActual > totalBudget ? 'danger' : totalPercent >= 80 ? 'warning' : 'success'}>
                {totalActual > totalBudget ? 'Lewat budget' : totalPercent >= 80 ? 'Perlu perhatian' : 'Aman'}
              </StatusPill>
            </div>
            <ProgressBar
              className="mt-4"
              percent={Math.min(100, totalPercent)}
              tone={totalActual > totalBudget ? 'danger' : totalPercent >= 80 ? 'warning' : 'brand'}
              label="Pemakaian budget"
            />
            <p className="mt-2 text-caption text-ink-500">
              dari {formatIDR(totalBudget)} · {totalPercent}% terpakai
            </p>
            <p className="mt-3 text-micro text-ink-500">
              Hanya transaksi approved berjenis pengeluaran yang dihitung. Transfer dan draft tidak
              dihitung.
            </p>
          </Card>

          <div>
            <SectionHeader
              title="Budget per kategori"
              hint="Remaining = nominal budget − pengeluaran approved pada kategori itu."
            />
            {categoryBudgets.length === 0 ? (
              <p className="text-caption text-ink-500">
                Belum ada budget per kategori. Semua pengeluaran masih dihitung ke budget keluarga.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {categoryBudgets.map((b) => {
                  const st = statusOf(b)
                  return (
                    <li key={b.id}>
                      <Card className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-label font-semibold text-ink-900">
                            <span aria-hidden="true">{b.category_icon ?? '🏷️'}</span>
                            {b.category_name ?? 'Tanpa kategori'}
                          </span>
                          <StatusPill tone={st.tone}>{st.label}</StatusPill>
                        </div>
                        <p className="money mt-2 text-h2 font-bold text-ink-900">
                          {formatIDR(b.remaining)}
                          <span className="ml-2 text-caption font-normal text-ink-500">sisa</span>
                        </p>
                        <ProgressBar
                          className="mt-2"
                          percent={b.percent}
                          tone={b.over ? 'danger' : b.rawPercent >= 80 ? 'warning' : 'brand'}
                          label={`Pemakaian budget ${b.category_name}`}
                        />
                        <div className="mt-2 flex items-center justify-between text-micro text-ink-500">
                          <span>
                            {formatIDR(b.actual)} dari {formatIDR(b.total)}
                          </span>
                          <span>Rollover: {b.rollover_policy === 'on' ? 'aktif' : 'mati'}</span>
                        </div>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <InlineBanner tone="info" title="Rollover eksplisit">
            Kebijakan rollover disimpan per budget. Sprint 1 selalu “mati”: sisa budget tidak
            dibawa ke bulan berikutnya.
          </InlineBanner>
        </>
      )}

      {error && data && (
        <InlineBanner
          tone="warning"
          title="Angka budget mungkin belum terbaru"
          action={<Button size="sm" variant="secondary" onClick={refetch}>Coba lagi</Button>}
        >
          {friendlyMessage(error)}
        </InlineBanner>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title="Buat budget"
        description={`Periode ${formatPeriod(monthKey)} · dihitung dari pengeluaran approved.`}
        footer={
          <div className="flex flex-col gap-2 pt-1">
            <Button size="lg" onClick={handleSave} loading={saveState === 'pending'} disabled={saveState === 'pending'}>
              Simpan budget
            </Button>
            <p className="text-center text-micro text-ink-500">
              Bisa diubah kapan saja tanpa mengubah histori transaksi.
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-label font-semibold text-ink-900">Berlaku untuk</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Chip selected={form.category_id === null} onClick={() => setForm((f) => ({ ...f, category_id: null }))}>
                Seluruh keluarga
              </Chip>
              {categories
                .filter((c) => !c.archived_at && c.kind === 'expense')
                .map((c) => (
                  <Chip
                    key={c.id}
                    selected={form.category_id === c.id}
                    onClick={() => setForm((f) => ({ ...f, category_id: c.id }))}
                  >
                    <span aria-hidden="true">{c.icon}</span> {c.name}
                  </Chip>
                ))}
            </div>
          </fieldset>

          <div>
            <p className="text-label font-semibold text-ink-900">Preset nominal</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip
                  key={p}
                  selected={form.amount === String(p)}
                  onClick={() => {
                    setForm((f) => ({ ...f, amount: String(p) }))
                    setFormError(null)
                  }}
                >
                  {formatIDR(p)}
                </Chip>
              ))}
            </div>
          </div>

          <Field label="Nominal budget" htmlFor="budget-amount" required error={formError} hint="Angka penuh tanpa desimal">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label text-ink-500">
                Rp
              </span>
              <TextInput
                id="budget-amount"
                inputMode="decimal"
                value={form.amount}
                invalid={Boolean(formError)}
                className="money pl-10"
                placeholder="3.000.000"
                onChange={(e) => {
                  setForm((f) => ({ ...f, amount: e.target.value }))
                  setFormError(null)
                }}
              />
            </div>
          </Field>

          <InlineBanner tone="info">
            Budget dihitung dari transaksi approved saja. Transfer antar akun tidak mengurangi budget.
          </InlineBanner>
        </div>
      </BottomSheet>
    </div>
  )
}
