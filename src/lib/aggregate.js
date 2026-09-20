/**
 * Agregasi keuangan — satu-satunya sumber kebenaran angka di frontend.
 *
 * ATURAN MENGIKAT (PRD FR-BUD-01, DESIGN_SPEC §4C, §4E):
 *   Hanya transaksi berstatus `approved` yang dihitung.
 *   Transfer TIDAK PERNAH dihitung sebagai expense.
 *   Draft/void selalu nol kontribusi.
 *
 * Fungsi di sini murni (tanpa I/O) supaya bisa diuji langsung.
 */
import { TXN_TYPE, countsAsExpense, countsAsIncome } from './domain.js'

export function monthKeyOf(iso) {
  return String(iso ?? '').slice(0, 7)
}

export function currentMonthKey(now = new Date()) {
  const tz = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return tz.toISOString().slice(0, 7)
}

/** Hanya transaksi approved yang boleh masuk agregat. */
export function approvedOnly(transactions = []) {
  return transactions.filter((t) => t?.status === 'approved')
}

/** Buang draft, void, dan transaksi tanpa nominal valid. */
export function aggregatable(transactions = []) {
  return approvedOnly(transactions).filter(
    (t) => Number.isFinite(Number(t.amount)) && Number(t.amount) > 0,
  )
}

export function inMonth(t, monthKey) {
  return monthKeyOf(t.occurred_at) === monthKey
}

export function byMember(t, memberId) {
  if (!memberId || memberId === 'all') return true
  return t.member_id === memberId
}

/**
 * Ringkasan cash flow satu periode.
 * `transfer` dilaporkan terpisah dan TIDAK mengurangi/menambah expense/income.
 */
export function summarize(transactions = [], { monthKey, memberId = 'all' } = {}) {
  const rows = aggregatable(transactions).filter(
    (t) => (!monthKey || inMonth(t, monthKey)) && byMember(t, memberId),
  )

  let expense = 0
  let income = 0
  let transfer = 0
  let expenseCount = 0

  for (const t of rows) {
    const amount = Number(t.amount)
    if (countsAsExpense(t)) {
      expense += amount
      expenseCount += 1
    } else if (countsAsIncome(t)) {
      income += amount
    } else if (t.type === TXN_TYPE.TRANSFER) {
      transfer += amount
    }
  }

  return {
    expense,
    income,
    transfer,
    net: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : null,
    expenseCount,
    transactionCount: rows.length,
  }
}

/**
 * Pengeluaran per kategori, urut terbesar. Kategori tanpa transaksi tidak muncul.
 * `categories` = daftar kategori untuk resolusi nama.
 */
export function expenseByCategory(transactions = [], categories = [], { monthKey, memberId = 'all' } = {}) {
  const rows = aggregatable(transactions).filter(
    (t) => countsAsExpense(t) && (!monthKey || inMonth(t, monthKey)) && byMember(t, memberId),
  )

  const map = new Map()
  for (const t of rows) {
    const id = t.category_id || 'unclassified'
    map.set(id, (map.get(id) ?? 0) + Number(t.amount))
  }

  const total = [...map.values()].reduce((a, b) => a + b, 0)
  const lookup = new Map(categories.map((c) => [c.id, c]))

  return [...map.entries()]
    .map(([id, amount]) => {
      const cat = lookup.get(id)
      return {
        category_id: id,
        name: cat?.name ?? 'Belum dikategori',
        icon: cat?.icon ?? '•',
        amount,
        share: total > 0 ? amount / total : 0,
        shareLabel: total > 0 ? `${Math.round((amount / total) * 100)}%` : '0%',
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

/** Pengeluaran per member (family-first, DESIGN_SPEC §4B blok 5). */
export function expenseByMember(transactions = [], members = [], { monthKey } = {}) {
  const rows = aggregatable(transactions).filter(
    (t) => countsAsExpense(t) && (!monthKey || inMonth(t, monthKey)),
  )
  const totals = new Map()
  for (const t of rows) {
    const id = t.member_id || 'unknown'
    totals.set(id, (totals.get(id) ?? 0) + Number(t.amount))
  }
  const max = Math.max(0, ...totals.values())
  return members.map((m) => {
    const amount = totals.get(m.id) ?? 0
    return {
      member_id: m.id,
      display_name: m.display_name,
      role: m.role,
      slot: m.slot,
      amount,
      barPercent: max > 0 ? Math.round((amount / max) * 100) : 0,
    }
  })
}

/**
 * Pemakaian budget: actual = approved expense saja.
 * Transfer & draft tidak dihitung.
 */
export function budgetUsage(transactions = [], { monthKey, categoryId = null, memberId = null } = {}) {
  const rows = aggregatable(transactions).filter((t) => {
    if (!countsAsExpense(t)) return false
    if (monthKey && !inMonth(t, monthKey)) return false
    if (categoryId && t.category_id !== categoryId) return false
    if (memberId && t.member_id !== memberId) return false
    return true
  })
  const actual = rows.reduce((sum, t) => sum + Number(t.amount), 0)
  return { actual, count: rows.length }
}

export function computeBudget(transactions, budget) {
  const { actual } = budgetUsage(transactions, {
    monthKey: budget.period_key,
    categoryId: budget.category_id ?? null,
    memberId: budget.owner_member_id ?? null,
  })
  const total = Number(budget.amount) || 0
  const remaining = total - actual
  const percent = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0
  const rawPercent = total > 0 ? Math.round((actual / total) * 100) : 0
  return {
    ...budget,
    total,
    actual,
    remaining,
    percent,
    rawPercent,
    over: actual > total,
    status: actual > total ? 'over' : rawPercent >= 80 ? 'attention' : 'safe',
  }
}

/**
 * Serialize transaksi + agregat untuk dashboard.
 * Dipakai handler mock; bentuk responsnya = kontrak UI.
 */
export function buildDashboardPayload({
  transactions,
  members,
  categories,
  budgets,
  monthKey,
  memberFilter = 'all',
}) {
  const household = summarize(transactions, { monthKey })
  const filtered = summarize(transactions, { monthKey, memberId: memberFilter })
  const monthBudgets = budgets
    .filter((b) => b.period_key === monthKey)
    .map((b) => computeBudget(transactions, b))

  const householdBudget = monthBudgets.find((b) => !b.category_id && !b.owner_member_id) ?? null
  const budgetTotal = monthBudgets
    .filter((b) => !b.category_id)
    .reduce((sum, b) => sum + b.total, 0)
  const budgetActual = householdBudget
    ? householdBudget.actual
    : monthBudgets.reduce((sum, b) => sum + (b.category_id ? 0 : b.actual), 0)

  const recent = aggregatable(transactions)
    .filter((t) => byMember(t, memberFilter))
    .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0))
    .slice(0, 5)

  return {
    month_key: monthKey,
    member_filter: memberFilter,
    household,
    filtered,
    budget: {
      total: budgetTotal,
      actual: budgetActual,
      remaining: budgetTotal - budgetActual,
      percent: budgetTotal > 0 ? Math.min(100, Math.round((budgetActual / budgetTotal) * 100)) : 0,
      rawPercent: budgetTotal > 0 ? Math.round((budgetActual / budgetTotal) * 100) : 0,
      over: budgetActual > budgetTotal,
      status:
        budgetTotal === 0 ? 'empty' : budgetActual > budgetTotal ? 'over' : budgetActual / budgetTotal >= 0.8 ? 'attention' : 'safe',
      has_budget: budgetTotal > 0,
    },
    members: expenseByMember(transactions, members, { monthKey }),
    categories: expenseByCategory(transactions, categories, { monthKey, memberId: memberFilter }),
    budgets: monthBudgets,
    recent,
    has_any_approved: approvedOnly(transactions).length > 0,
  }
}
