import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard, friendlyMessage } from '../../API/getData.js'
import { useFetch } from '../../hooks/useFetch.js'
import { currentMonthKey } from '../../lib/aggregate.js'
import { FEATURE_FLAGS } from '../../lib/domain.js'
import { formatCompactIDR, formatDate, formatIDR, formatPeriod } from '../../lib/money.js'
import { track } from '../../lib/analytics.js'
import {
  Button, Card, Chip, MemberAvatar, ProgressBar, SectionHeader, Skeleton, StatusPill, cx,
} from '../../components/ui/primitives.jsx'
import { ErrorState, InlineBanner } from '../../components/ui/feedback.jsx'

const STATUS_COPY = {
  safe: { tone: 'success', label: 'Aman' },
  attention: { tone: 'warning', label: 'Perlu perhatian' },
  over: { tone: 'danger', label: 'Lewat budget' },
  empty: { tone: 'neutral', label: 'Belum ada budget' },
}

function HeroSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-8 w-52" />
      <Skeleton className="mt-4 h-2 w-full" />
      <Skeleton className="mt-2 h-3 w-32" />
    </Card>
  )
}

function HeroAnswerCard({ data, memberFilter, memberName, onRetry, isError, error }) {
  if (isError) {
    return (
      <ErrorState
        title="Belum bisa memuat ringkasan"
        message={friendlyMessage(error)}
        onRetry={onRetry}
      />
    )
  }

  const budget = data.budget
  const status = STATUS_COPY[budget.status] ?? STATUS_COPY.empty
  const heroValue = budget.has_budget
    ? budget.remaining
    : data.household.income - data.household.expense

  return (
    <Card className="p-5">
      <p className="text-caption text-ink-500">
        {budget.has_budget ? 'Sisa budget bulan ini' : 'Arus kas bersih bulan ini'}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className={cx(
            'money text-display font-bold',
            budget.has_budget && budget.remaining < 0 ? 'text-danger-fg' : 'text-ink-900',
          )}
        >
          {formatIDR(heroValue)}
        </span>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {budget.has_budget ? (
        <>
          <ProgressBar
            className="mt-4"
            percent={budget.percent}
            tone={budget.over ? 'danger' : budget.rawPercent >= 80 ? 'warning' : 'brand'}
            label="Pemakaian budget bulan ini"
          />
          <p className="mt-2 text-caption text-ink-500">
            dari {formatIDR(budget.total)} · {budget.rawPercent}% terpakai · {formatPeriod(data.month_key)}
          </p>
        </>
      ) : (
        <p className="mt-3 text-caption text-ink-500">
          Belum ada budget bulan ini. Buat budget supaya angka ini menjawab “keluarga kita aman?”.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {memberFilter !== 'all' && (
          <StatusPill tone="info" icon="⛃">
            Difilter: {memberName} — angka di atas tetap household
          </StatusPill>
        )}
        <StatusPill tone="neutral" icon="✓">
          Pengeluaran approved {formatCompactIDR(data.household.expense)}
        </StatusPill>
        {data.household.transfer > 0 && (
          <StatusPill tone="neutral" icon="↔">
            Transfer {formatCompactIDR(data.household.transfer)} (tidak dihitung)
          </StatusPill>
        )}
      </div>

      <Link
        to="/app/budget"
        className="mt-3 inline-flex min-h-11 items-center text-label font-semibold text-brand-700"
      >
        Lihat detail budget →
      </Link>
    </Card>
  )
}

function CoreActions() {
  const actions = [
    { label: 'Catat manual', icon: '✏️', to: '/app/transactions' },
    { label: 'Upload bukti', icon: '📤', disabled: !FEATURE_FLAGS.ocrUpload },
    { label: 'Buat budget', icon: '🎯', to: '/app/budget', disabled: !FEATURE_FLAGS.budget },
  ]

  const cardClass =
    'flex w-full min-h-[88px] flex-col items-start justify-between gap-2 rounded-2xl border border-line bg-surface p-3 text-left no-underline'

  return (
    <ul className="grid grid-cols-3 gap-2">
      {actions.map((action) => (
        <li key={action.label}>
          {action.disabled ? (
            <button
              type="button"
              disabled
              className={cx(cardClass, 'opacity-50')}
            >
              <span aria-hidden="true" className="text-h2">
                {action.icon}
              </span>
              <span className="text-caption font-semibold text-ink-900">
                {action.label}
                <span className="block text-micro font-normal text-ink-500">Sprint 2</span>
              </span>
            </button>
          ) : (
            <Link
              to={action.to}
              onClick={() => track('action_shortcut_used', { label: action.label })}
              className={cx(cardClass, 'hover:border-brand-100 hover:bg-brand-50/40')}
            >
              <span aria-hidden="true" className="text-h2">
                {action.icon}
              </span>
              <span className="text-caption font-semibold text-ink-900">{action.label}</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}

function MemberBreakdown({ members, activeId, onSelect }) {
  if (members.length === 0) return null
  const max = Math.max(0, ...members.map((m) => m.amount))
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {members.slice(0, 4).map((m) => (
        <button
          key={m.member_id}
          type="button"
          onClick={() => onSelect(activeId === m.member_id ? 'all' : m.member_id)}
          aria-pressed={activeId === m.member_id}
          className={cx(
            'flex min-w-[148px] shrink-0 flex-col gap-2 rounded-2xl border p-3 text-left',
            activeId === m.member_id ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface',
          )}
        >
          <span className="flex items-center gap-2">
            <MemberAvatar name={m.display_name} slot={m.slot} size="sm" />
            <span className="text-label font-semibold text-ink-900">{m.display_name}</span>
          </span>
          <span className="money text-label font-bold text-ink-900">{formatCompactIDR(m.amount)}</span>
          <span className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
            <span
              className="block h-full rounded-full bg-brand-500"
              style={{ width: `${max > 0 ? Math.round((m.amount / max) * 100) : 0}%` }}
            />
          </span>
          <span className="text-micro text-ink-500">pengeluaran bulan ini</span>
        </button>
      ))}
    </div>
  )
}

function RecentTransactions({ transactions }) {
  if (transactions.length === 0) {
    return <p className="text-caption text-ink-500">Belum ada transaksi pada periode ini.</p>
  }
  return (
    <ul className="divide-y divide-line">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-3">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-canvas">
            {t.category_icon ?? (t.type === 'transfer' ? '↔' : '•')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-label text-ink-900">
              {t.merchant || t.category_name || (t.type === 'transfer' ? 'Transfer antar akun' : 'Tanpa keterangan')}
            </span>
            <span className="block text-micro text-ink-500">
              {formatDate(t.occurred_at)} · {t.member_name ?? 'Tanpa anggota'}
              {t.type === 'transfer' && ' · transfer (bukan expense)'}
            </span>
          </span>
          <span
            className={cx(
              'money shrink-0 text-label font-semibold',
              t.type === 'expense' ? 'text-ink-900' : t.type === 'income' ? 'text-success-fg' : 'text-ink-500',
            )}
          >
            {t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}
            {formatIDR(t.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function DashboardPage({ household }) {
  const [monthKey] = useState(currentMonthKey())
  const [memberFilter, setMemberFilter] = useState('all')

  const { data, loading, error, refetch } = useFetch(
    () => getDashboard(household.id, { month: monthKey, member: memberFilter }),
    [household?.id, monthKey, memberFilter],
  )

  useEffect(() => {
    if (data) track('dashboard_viewed', { month: monthKey, member: memberFilter })
  }, [data, monthKey, memberFilter])

  if (!household) return null

  const members = household.members ?? []
  const activeMember = members.find((m) => m.id === memberFilter)
  const isEmpty = data ? !data.has_any_approved : false

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold">Beranda</h1>
        <p className="text-caption text-ink-500">
          {formatPeriod(monthKey)} · satu workspace untuk {members.length} profil
        </p>
      </div>

      {loading && !data && (
        <>
          <HeroSkeleton />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </>
      )}

      {data && (
        <>
          {isEmpty ? (
            <Card className="p-5">
              <h2 className="text-h2 font-semibold">Mulai catat</h2>
              <p className="mt-1 text-caption text-ink-500">
                Belum ada transaksi — mulai dari yang paling gampang. Nggak harus rapi dari awal.
              </p>
              <div className="mt-4">
                <CoreActions />
              </div>
            </Card>
          ) : (
            <>
              <HeroAnswerCard
                data={data}
                memberFilter={memberFilter}
                memberName={activeMember?.display_name}
                isError={Boolean(error)}
                error={error}
                onRetry={refetch}
              />

              <div>
                <SectionHeader
                  title="Tiga aksi cepat"
                  hint="Setelah kebiasaan jalan, cukup pakai tombol + di kanan bawah."
                />
                <CoreActions />
              </div>

              <div>
                <SectionHeader title="Pengeluaran per anggota" hint="Ketuk untuk memfilter daftar di bawah." />
                <div className="mb-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  <Chip selected={memberFilter === 'all'} onClick={() => setMemberFilter('all')}>
                    Semua
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
                <MemberBreakdown
                  members={data.members}
                  activeId={memberFilter === 'all' ? null : memberFilter}
                  onSelect={setMemberFilter}
                />
              </div>

              <div>
                <SectionHeader
                  title="Kategori terbesar"
                  action={
                    <Link to="/app/transactions" className="text-caption font-semibold text-brand-700">
                      Lihat semua →
                    </Link>
                  }
                  hint="Dari transaksi approved saja."
                />
                {data.categories.length === 0 ? (
                  <p className="text-caption text-ink-500">Belum ada pengeluaran pada periode ini.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
                    {data.categories.slice(0, 3).map((cat) => (
                      <li key={cat.category_id} className="flex items-center gap-3 px-3 py-3">
                        <span aria-hidden="true" className="text-h2">
                          {cat.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label text-ink-900">{cat.name}</span>
                          <ProgressBar className="mt-1.5" percent={Math.round(cat.share * 100)} label={`Porsi ${cat.name}`} />
                        </span>
                        <span className="money shrink-0 text-label font-semibold text-ink-900">
                          {formatIDR(cat.amount)}
                        </span>
                        <span className="shrink-0 text-micro text-ink-500">{cat.shareLabel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionHeader
                  title="Transaksi terbaru"
                  action={
                    <Link to="/app/transactions" className="text-caption font-semibold text-brand-700">
                      Lihat semua →
                    </Link>
                  }
                />
                <Card className="px-3">
                  <RecentTransactions transactions={data.recent} />
                </Card>
              </div>

              {!FEATURE_FLAGS.goals && (
                <InlineBanner tone="info" title="Goals & Laporan menyusul">
                  Sprint 3 sesuai roadmap. Dashboard ini sudah memakai angka yang sama yang nanti
                  dipakai export.
                </InlineBanner>
              )}

              {error && (
                <InlineBanner
                  tone="warning"
                  title="Sebagian ringkasan belum diperbarui"
                  action={<Button size="sm" variant="secondary" onClick={refetch}>Coba lagi</Button>}
                >
                  Blok di atas memakai data terakhir yang berhasil dimuat.
                </InlineBanner>
              )}
            </>
          )}
        </>
      )}

      {error && !data && (
        <ErrorState
          title="Belum bisa memuat ringkasan"
          message={friendlyMessage(error)}
          onRetry={refetch}
        />
      )}
    </div>
  )
}
