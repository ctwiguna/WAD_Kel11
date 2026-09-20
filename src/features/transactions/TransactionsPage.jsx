import { useState } from 'react'
import { getTransactions, voidTransaction, friendlyMessage } from '../../API/getData.js'
import { useFetch } from '../../hooks/useFetch.js'
import { currentMonthKey, summarize } from '../../lib/aggregate.js'
import { TXN_TYPE, TXN_TYPE_LABEL } from '../../lib/domain.js'
import { formatDate, formatIDR, formatPeriod } from '../../lib/money.js'
import { track } from '../../lib/analytics.js'
import TransactionForm from './TransactionForm.jsx'
import {
  Button, Card, Chip, SectionHeader, Skeleton, StatusPill, cx,
} from '../../components/ui/primitives.jsx'
import { EmptyState, ErrorState, InlineBanner } from '../../components/ui/feedback.jsx'

const TYPE_TONE = { expense: 'neutral', income: 'success', transfer: 'info' }
const TYPE_SIGN = { expense: '−', income: '+', transfer: '' }

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export default function TransactionsPage({ household, onRefreshHousehold, showToast }) {
  const [monthKey] = useState(currentMonthKey())
  const [memberFilter, setMemberFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [voiding, setVoiding] = useState(null)

  const { data, loading, error, refetch } = useFetch(
    () => getTransactions(household.id, { month: monthKey, member: memberFilter }),
    [household?.id, monthKey, memberFilter],
  )

  const all = data?.transactions ?? []
  const rows = typeFilter === 'all' ? all : all.filter((t) => t.type === typeFilter)
  const totals = summarize(all, { monthKey })
  const members = household?.members ?? []

  function openForm() {
    track('transaction_form_opened', { source: 'transactions_page' })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleVoid(txn) {
    setVoiding(txn.id)
    try {
      await voidTransaction(household.id, txn.id)
      refetch()
      track('transaction_voided', { id: txn.id })
      showToast('Transaksi dibatalkan (void). Angka dashboard sudah diperbarui.', 'success')
    } catch (err) {
      showToast(friendlyMessage(err), 'danger')
    } finally {
      setVoiding(null)
    }
  }

  if (!household) return null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold">Transaksi</h1>
          <p className="text-caption text-ink-500">{formatPeriod(monthKey)}</p>
        </div>
        <Button onClick={openForm}>+ Catat</Button>
      </div>

      {/* Ringkasan periode — menegaskan transfer bukan expense */}
      {data && all.length > 0 && (
        <Card className="p-4">
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="text-micro text-ink-500">Pengeluaran</dt>
              <dd className="money text-label font-bold text-ink-900">{formatIDR(totals.expense)}</dd>
            </div>
            <div>
              <dt className="text-micro text-ink-500">Pemasukan</dt>
              <dd className="money text-label font-bold text-success-fg">{formatIDR(totals.income)}</dd>
            </div>
            <div>
              <dt className="text-micro text-ink-500">Transfer</dt>
              <dd className="money text-label font-bold text-ink-500">{formatIDR(totals.transfer)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-micro text-ink-500">
            Hanya transaksi approved yang dihitung. Transfer dipisah dan tidak dihitung sebagai
            pengeluaran.
          </p>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-col gap-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip selected={memberFilter === 'all'} onClick={() => setMemberFilter('all')}>
            Semua anggota
          </Chip>
          {members.map((m) => (
            <Chip
              key={m.id}
              selected={memberFilter === m.id}
              onClick={() => setMemberFilter(memberFilter === m.id ? 'all' : m.id)}
            >
              {m.display_name}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          {['all', TXN_TYPE.EXPENSE, TXN_TYPE.INCOME, TXN_TYPE.TRANSFER].map((type) => (
            <Chip key={type} selected={typeFilter === type} onClick={() => setTypeFilter(type)}>
              {type === 'all' ? 'Semua jenis' : TXN_TYPE_LABEL[type]}
            </Chip>
          ))}
        </div>
      </div>

      {loading && !data && <ListSkeleton />}

      {error && !data && (
        <ErrorState
          title="Gagal memuat transaksi"
          message={friendlyMessage(error)}
          onRetry={refetch}
        />
      )}

      {data && rows.length === 0 && (
        <EmptyState
          icon="🧾"
          title={all.length === 0 ? 'Belum ada transaksi bulan ini' : 'Tidak ada transaksi dengan filter ini'}
          actions={<Button onClick={openForm}>Catat transaksi</Button>}
        >
          {all.length === 0
            ? 'Mulai dari satu pengeluaran kecil hari ini — cukup untuk membuat dashboard berguna.'
            : 'Coba ganti filter anggota atau jenis transaksi.'}
        </EmptyState>
      )}

      {data && rows.length > 0 && (
        <div>
          <SectionHeader title={`${rows.length} transaksi`} hint="Ketuk untuk ubah atau batalkan." />
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-3">
                <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-canvas">
                  {t.category_icon ?? (t.type === 'transfer' ? '↔' : '•')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-label text-ink-900">
                      {t.merchant || t.category_name || (t.type === 'transfer' ? 'Transfer antar akun' : 'Tanpa keterangan')}
                    </span>
                    <StatusPill tone={TYPE_TONE[t.type]}>{TXN_TYPE_LABEL[t.type]}</StatusPill>
                  </span>
                  <span className="block text-micro text-ink-500">
                    {formatDate(t.occurred_at)} · {t.member_name ?? 'Tanpa anggota'}
                    {t.type === 'transfer' &&
                      ` · ${t.from_account_label ?? '?'} → ${t.to_account_label ?? '?'}`}
                    {t.type === 'transfer' && ' · tidak dihitung sebagai expense'}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cx(
                      'money text-label font-semibold',
                      t.type === 'income' ? 'text-success-fg' : 'text-ink-900',
                    )}
                  >
                    {TYPE_SIGN[t.type]}
                    {formatIDR(t.amount)}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="min-h-9 rounded-lg px-2 text-micro font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoid(t)}
                      disabled={voiding === t.id}
                      className="min-h-9 rounded-lg px-2 text-micro font-semibold text-danger-fg hover:bg-danger-bg disabled:text-ink-300"
                    >
                      {voiding === t.id ? '…' : 'Batalkan'}
                    </button>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && data && (
        <InlineBanner
          tone="warning"
          title="Daftar belum diperbarui"
          action={<Button size="sm" variant="secondary" onClick={refetch}>Coba lagi</Button>}
        >
          Yang tampil adalah data terakhir yang berhasil dimuat.
        </InlineBanner>
      )}

      <TransactionForm
        open={formOpen || Boolean(editing)}
        transaction={editing}
        household={household}
        onRefreshHousehold={onRefreshHousehold}
        onSaved={refetch}
        onClose={closeForm}
        showToast={showToast}
      />
    </div>
  )
}
