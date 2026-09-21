/**
 * API KeluargaFin — folder "API" berisi "getData" sesuai materi.
 *
 * Semua data disimpan di localStorage browser (materi: localStorage),
 * jadi aplikasi bisa jalan tanpa backend. Saat backend nyata sudah ada,
 * fungsi-fungsi di file ini tinggal diganti panggilan axios.
 *
 * Bentuk data & aturan bisnis tetap mengikuti PRD:
 * - transfer tidak dihitung sebagai pengeluaran
 * - hanya transaksi approved yang masuk agregat
 * - tidak ada kredensial bank di mana pun
 */
import { CURRENCY, DEFAULT_CATEGORIES, DEFAULT_MEMBER_SLOTS, MEMBER_STATUS, TIMEZONE, TXN_TYPE } from '../lib/domain.js'
import { buildDashboardPayload, currentMonthKey } from '../lib/aggregate.js'
import { normalizeAmount, todayISO } from '../lib/money.js'

const STORE_KEY = 'kf.data.v1'

/* ------------------------------------------------------------------ */
/* Helper penyimpanan (localStorage)                                   */
/* ------------------------------------------------------------------ */

function emptyData() {
  return {
    users: [],
    households: [],
    household_members: [],
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    audit_events: [],
    magic_links: [],
    idempotency: {},
    session: null,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return { ...emptyData(), ...JSON.parse(raw) }
  } catch {
    /* storage rusak/diblokir -> mulai bersih */
  }
  return emptyData()
}

function save(db) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db))
  } catch {
    /* storage penuh/diblokir: data tetap hidup selama sesi */
  }
}

/* ------------------------------------------------------------------ */
/* Helper umum                                                          */
/* ------------------------------------------------------------------ */

function newId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

function nowISO() {
  return new Date().toISOString()
}

/** Jeda kecil supaya state loading di UI tetap terlihat seperti ambil data. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function failMode(key) {
  try {
    return localStorage.getItem('kf.failMode') === key
  } catch {
    return false
  }
}

/** Pesan ramah untuk user — tidak pernah membocorkan detail teknis. */
export function friendlyMessage(error) {
  return error?.message ?? 'Terjadi kesalahan. Coba lagi.'
}

function requireUser(db) {
  const user = db.session
    ? db.users.find((u) => u.id === db.session.user_id && !u.deleted_at)
    : null
  if (!user) throw new Error('Sesi tidak ditemukan. Masuk dulu, ya.')
  return user
}

function requireMembership(db, householdId) {
  const user = requireUser(db)
  const membership = db.household_members.find(
    (m) => m.household_id === householdId && m.user_id === user.id && m.status === 'active',
  )
  if (!membership) throw new Error('Kamu tidak punya akses ke workspace ini.')
  return { user, membership }
}

function householdFor(db, userId) {
  const membership = db.household_members.find(
    (m) => m.user_id === userId && m.status === 'active',
  )
  if (!membership) return null
  return db.households.find((h) => h.id === membership.household_id) ?? null
}

function findOrCreateUser(db, email, authProvider) {
  const existing = db.users.find((u) => u.email === email && !u.deleted_at)
  if (existing) return existing
  const user = {
    id: newId('usr'),
    email,
    auth_provider: authProvider,
    created_at: nowISO(),
    deleted_at: null,
  }
  db.users.push(user)
  return user
}

function addAudit(db, householdId, actorId, action, entityType, entityId, metadata) {
  db.audit_events.push({
    id: newId('aud'),
    household_id: householdId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata_json: metadata ?? {},
    created_at: nowISO(),
  })
}

function seedCategories(db, householdId) {
  DEFAULT_CATEGORIES.forEach((c) => {
    db.categories.push({
      id: newId('cat'),
      household_id: householdId,
      name: c.name,
      icon: c.icon,
      kind: c.kind,
      system_key: c.key,
      parent_id: null,
      archived_at: null,
      created_at: nowISO(),
    })
  })
}

function addAccount(db, householdId, memberId, label, type) {
  const account = {
    id: newId('acc'),
    household_id: householdId,
    member_id: memberId ?? null,
    label,
    type,
    archived_at: null,
  }
  db.accounts.push(account)
  return account
}

function serializeMember(m) {
  return {
    id: m.id,
    household_id: m.household_id,
    user_id: m.user_id ?? null,
    display_name: m.display_name,
    role: m.role,
    slot: m.slot,
    status: m.status,
    profile_only: !m.user_id,
    created_by: m.created_by,
    created_at: m.created_at,
  }
}

/** Transaksi + nama kategori/anggota/akun supaya list & dashboard konsisten. */
function serializeTxn(t, db) {
  const cat = db.categories.find((c) => c.id === t.category_id)
  const member = db.household_members.find((m) => m.id === t.member_id)
  const from = db.accounts.find((a) => a.id === t.from_account_id)
  const to = db.accounts.find((a) => a.id === t.to_account_id)
  return {
    ...t,
    category_name: cat?.name ?? null,
    category_icon: cat?.icon ?? null,
    member_name: member?.display_name ?? null,
    member_slot: member?.slot ?? null,
    from_account_label: from?.label ?? null,
    to_account_label: to?.label ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

/** Dipanggil saat aplikasi dibuka. null = belum masuk. */
export async function getMe() {
  await delay(150)
  const db = load()
  if (!db.session) return null
  const user = db.users.find((u) => u.id === db.session.user_id && !u.deleted_at)
  if (!user) return null
  const household = householdFor(db, user.id)
  return {
    user: { id: user.id, email: user.email },
    household: household ? { id: household.id, name: household.name } : null,
  }
}

/**
 * Mode tanpa auth: pastikan keluarga demo selalu ada supaya Beranda bisa
 * dibuka langsung. Dipanggil sekali saat aplikasi dimuat.
 */
export async function ensureDemoHousehold() {
  await delay(150)
  const db = load()
  let user = db.session
    ? db.users.find((u) => u.id === db.session.user_id && !u.deleted_at)
    : null
  if (!user) {
    user = findOrCreateUser(db, 'keluarga@demo.local', 'demo')
    db.session = { token: newId('tok'), user_id: user.id, created_at: nowISO() }
  }

  let household = householdFor(db, user.id)
  if (!household) {
    household = {
      id: newId('hh'),
      name: 'Keluarga Kami',
      currency: CURRENCY,
      timezone: TIMEZONE,
      owner_user_id: user.id,
      created_at: nowISO(),
    }
    db.households.push(household)

    const created = DEFAULT_MEMBER_SLOTS.map((slot, index) => {
      const member = {
        id: newId('hm'),
        household_id: household.id,
        // Profil pertama ditautkan ke pemilik; sisanya profil tanpa login.
        user_id: index === 0 ? user.id : null,
        display_name: slot.display_name,
        role: slot.role,
        slot: slot.slot,
        status: MEMBER_STATUS.ACTIVE,
        created_by: user.id,
        created_at: nowISO(),
      }
      db.household_members.push(member)
      return member
    })

    seedCategories(db, household.id)
    created.forEach((member) => addAccount(db, household.id, member.id, 'Tunai', 'cash'))
    addAudit(db, household.id, user.id, 'household_created', 'household', household.id, {
      name: household.name,
      source: 'demo_bootstrap',
    })
  }

  save(db)
  return { user: { id: user.id, email: user.email }, household }
}

export async function signInWithGoogle() {
  await delay(600)
  const db = load()
  const user = findOrCreateUser(db, 'ayah.keluarga@gmail.com', 'google')
  db.session = { token: newId('tok'), user_id: user.id, created_at: nowISO() }
  save(db)
  const household = householdFor(db, user.id)
  return { user: { id: user.id, email: user.email }, household }
}

export async function requestMagicLink(email) {
  await delay(400)
  const clean = String(email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    throw new Error('Alamat email belum benar.')
  }
  const db = load()
  const token = newId('ml')
  db.magic_links.push({
    token,
    email: clean,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    used_at: null,
  })
  save(db)
  return { sent: true, email: clean, dev_token: token }
}

export async function consumeMagicLink(token) {
  await delay(500)
  const db = load()
  const link = db.magic_links.find((l) => l.token === token && !l.used_at)
  if (!link) throw new Error('Tautan tidak valid atau sudah dipakai.')
  if (new Date(link.expires_at) < new Date()) throw new Error('Tautan sudah kedaluwarsa.')
  link.used_at = nowISO()
  const user = findOrCreateUser(db, link.email, 'magic_link')
  db.session = { token: newId('tok'), user_id: user.id, created_at: nowISO() }
  save(db)
  const household = householdFor(db, user.id)
  return { user: { id: user.id, email: user.email }, household }
}

export async function signOut() {
  await delay(150)
  const db = load()
  db.session = null
  save(db)
}

/* ------------------------------------------------------------------ */
/* Household & anggota                                                 */
/* ------------------------------------------------------------------ */

export async function createHousehold({ name, members, budget_intent }) {
  await delay(500)
  const db = load()
  const user = requireUser(db)
  const cleanName = String(name ?? '').trim()
  if (cleanName.length < 2 || cleanName.length > 60) {
    throw new Error('Nama keluarga harus 2–60 karakter.')
  }
  const existing = householdFor(db, user.id)
  if (existing) return { household: existing, created: false }

  const household = {
    id: newId('hh'),
    name: cleanName,
    currency: CURRENCY,
    timezone: TIMEZONE,
    owner_user_id: user.id,
    created_at: nowISO(),
  }
  db.households.push(household)

  const slots = Array.isArray(members) ? members : []
  const created = []
  slots.forEach((slot, index) => {
    const displayName = String(slot.display_name ?? '').trim()
    if (!displayName || !slot.role) return
    const member = {
      id: newId('hm'),
      household_id: household.id,
      // Profil pertama (pemilik) ditautkan ke akun; sisanya profil tanpa login.
      user_id: index === 0 ? user.id : null,
      display_name: displayName,
      role: slot.role,
      slot: slot.slot ?? `member_${index}`,
      status: MEMBER_STATUS.ACTIVE,
      created_by: user.id,
      created_at: nowISO(),
    }
    db.household_members.push(member)
    created.push(member)
  })

  seedCategories(db, household.id)
  addAccount(db, household.id, created[0]?.id ?? null, 'Tunai', 'cash')
  if (created[1]) addAccount(db, household.id, created[1].id, 'Tunai', 'cash')

  if (budget_intent?.amount) {
    db.budgets.push({
      id: newId('bud'),
      household_id: household.id,
      owner_member_id: null,
      category_id: null,
      period_key: currentMonthKey(),
      amount: normalizeAmount(budget_intent.amount) ?? 0,
      rollover_policy: 'off',
      created_at: nowISO(),
    })
  }

  addAudit(db, household.id, user.id, 'household_created', 'household', household.id, {
    name: cleanName,
  })
  save(db)
  return { household, members: created.map(serializeMember), created: true }
}

export async function getHousehold(householdId) {
  await delay(180)
  const db = load()
  const { membership } = requireMembership(db, householdId)
  return {
    household: db.households.find((h) => h.id === householdId),
    members: db.household_members
      .filter((m) => m.household_id === householdId)
      .map(serializeMember),
    categories: db.categories.filter((c) => c.household_id === householdId),
    accounts: db.accounts.filter((a) => a.household_id === householdId),
    role: membership.role,
    my_member_id: membership.id,
  }
}

export async function addMember(householdId, { display_name, role, slot }) {
  await delay(350)
  const db = load()
  const { user, membership } = requireMembership(db, householdId)
  if (membership.role !== 'owner') throw new Error('Kamu tidak punya akses ke workspace ini.')
  const displayName = String(display_name ?? '').trim()
  if (!displayName) throw new Error('Nama anggota wajib diisi.')
  if (!role) throw new Error('Peran anggota wajib dipilih.')
  const count = db.household_members.filter((m) => m.household_id === householdId).length
  if (count >= 8) throw new Error('Maksimal 8 profil anggota pada pilot.')

  const member = {
    id: newId('hm'),
    household_id: householdId,
    user_id: null,
    display_name: displayName,
    role,
    slot: slot ?? 'custom',
    status: MEMBER_STATUS.ACTIVE,
    created_by: user.id,
    created_at: nowISO(),
  }
  db.household_members.push(member)
  addAudit(db, householdId, user.id, 'member_added', 'household_member', member.id, { role })
  save(db)
  return { member: serializeMember(member) }
}

export async function updateMember(householdId, memberId, patch) {
  await delay(300)
  const db = load()
  const { user } = requireMembership(db, householdId)
  const member = db.household_members.find(
    (m) => m.id === memberId && m.household_id === householdId,
  )
  if (!member) throw new Error('Anggota tidak ditemukan.')

  const changes = {}
  if (patch.display_name !== undefined) {
    const name = String(patch.display_name).trim()
    if (!name) throw new Error('Nama anggota tidak boleh kosong.')
    member.display_name = name
    changes.display_name = name
  }
  if (patch.role !== undefined) {
    if (!patch.role) throw new Error('Peran tidak boleh kosong.')
    if (member.role === 'owner' && patch.role !== 'owner') {
      throw new Error('Owner keluarga tidak bisa diubah perannya.')
    }
    changes.role = { from: member.role, to: patch.role }
    member.role = patch.role
  }
  if (patch.status !== undefined) {
    if (member.role === 'owner' && patch.status !== 'active') {
      throw new Error('Owner keluarga harus tetap aktif.')
    }
    member.status = patch.status
    changes.status = patch.status
  }
  addAudit(db, householdId, user.id, 'member_updated', 'household_member', member.id, changes)
  save(db)
  return { member: serializeMember(member) }
}

/* ------------------------------------------------------------------ */
/* Kategori                                                            */
/* ------------------------------------------------------------------ */

export async function createCategory(householdId, { name, icon }) {
  await delay(300)
  const db = load()
  const { user } = requireMembership(db, householdId)
  const clean = String(name ?? '').trim()
  if (clean.length < 2 || clean.length > 30) {
    throw new Error('Nama kategori harus 2–30 karakter.')
  }
  const dup = db.categories.find(
    (c) => c.household_id === householdId && !c.archived_at && c.name.toLowerCase() === clean.toLowerCase(),
  )
  if (dup) throw new Error('Kategori dengan nama itu sudah ada.')

  const category = {
    id: newId('cat'),
    household_id: householdId,
    name: clean,
    icon: icon || '🏷️',
    kind: 'expense',
    system_key: null,
    parent_id: null,
    archived_at: null,
    created_at: nowISO(),
  }
  db.categories.push(category)
  addAudit(db, householdId, user.id, 'category_created', 'category', category.id, { name: clean })
  save(db)
  return { category }
}

/* ------------------------------------------------------------------ */
/* Transaksi                                                           */
/* ------------------------------------------------------------------ */

export async function getTransactions(householdId, { month, member = 'all', status } = {}) {
  await delay(200)
  const db = load()
  requireMembership(db, householdId)
  let rows = db.transactions.filter((t) => t.household_id === householdId)
  if (month) rows = rows.filter((t) => t.occurred_at.slice(0, 7) === month)
  if (member !== 'all') rows = rows.filter((t) => t.member_id === member)
  if (status) rows = rows.filter((t) => t.status === status)
  rows.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
  return { transactions: rows.map((t) => serializeTxn(t, db)) }
}

export async function createTransaction(householdId, payload, idempotencyKey) {
  await delay(450)
  const db = load()
  const { user } = requireMembership(db, householdId)

  // Idempotency-Key: submit ulang tidak membuat duplikat.
  if (idempotencyKey && db.idempotency[`${householdId}:${idempotencyKey}`]) {
    const prior = db.transactions.find(
      (t) => t.id === db.idempotency[`${householdId}:${idempotencyKey}`],
    )
    if (prior) return { transaction: serializeTxn(prior, db), deduplicated: true }
  }

  const type = payload.type
  if (!Object.values(TXN_TYPE).includes(type)) throw new Error('Jenis transaksi wajib dipilih.')
  const amount = normalizeAmount(payload.amount)
  if (!amount || amount <= 0) throw new Error('Nominal harus lebih dari 0.')
  const occurredAt = String(payload.occurred_at ?? '').slice(0, 10) || todayISO()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) throw new Error('Tanggal belum benar.')

  const member = db.household_members.find(
    (m) => m.id === payload.member_id && m.household_id === householdId && m.status === 'active',
  )
  if (!member) throw new Error('Anggota transaksi harus anggota keluarga yang aktif.')

  let fromAccountId = null
  let toAccountId = null
  if (type === TXN_TYPE.TRANSFER) {
    fromAccountId = payload.from_account_id ?? null
    toAccountId = payload.to_account_id ?? null
    if (!fromAccountId || !toAccountId) throw new Error('Transfer butuh akun asal dan akun tujuan.')
    if (fromAccountId === toAccountId) throw new Error('Akun asal dan tujuan tidak boleh sama.')
    const validIds = db.accounts
      .filter((a) => a.household_id === householdId)
      .map((a) => a.id)
    if (!validIds.includes(fromAccountId) || !validIds.includes(toAccountId)) {
      throw new Error('Akun asal atau tujuan tidak dikenal.')
    }
  }

  if (type !== TXN_TYPE.TRANSFER && payload.category_id) {
    const cat = db.categories.find(
      (c) => c.id === payload.category_id && c.household_id === householdId,
    )
    if (!cat) throw new Error('Kategori tidak dikenal.')
  }

  const txn = {
    id: newId('txn'),
    household_id: householdId,
    member_id: member.id,
    account_id: fromAccountId ?? payload.account_id ?? null,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    type,
    amount,
    currency: CURRENCY,
    occurred_at: occurredAt,
    merchant: String(payload.merchant ?? '').trim() || null,
    category_id: type === TXN_TYPE.TRANSFER ? null : (payload.category_id ?? null),
    note: String(payload.note ?? '').trim() || null,
    status: 'approved',
    source_document_id: null,
    source: 'manual',
    created_by: user.id,
    approved_by: user.id,
    created_at: nowISO(),
    updated_at: nowISO(),
  }
  db.transactions.push(txn)
  if (idempotencyKey) db.idempotency[`${householdId}:${idempotencyKey}`] = txn.id
  addAudit(db, householdId, user.id, 'transaction_created', 'transaction', txn.id, { type, amount })
  save(db)
  return { transaction: serializeTxn(txn, db) }
}

export async function updateTransaction(householdId, txnId, patch) {
  await delay(400)
  const db = load()
  const { user } = requireMembership(db, householdId)
  const txn = db.transactions.find((t) => t.id === txnId && t.household_id === householdId)
  if (!txn) throw new Error('Transaksi tidak ditemukan.')

  if (patch.amount !== undefined) {
    const amount = normalizeAmount(patch.amount)
    if (!amount || amount <= 0) throw new Error('Nominal harus lebih dari 0.')
    txn.amount = amount
  }
  const editable = ['occurred_at', 'merchant', 'note', 'category_id', 'member_id', 'type']
  editable.forEach((key) => {
    if (patch[key] !== undefined) txn[key] = patch[key]
  })
  txn.updated_at = nowISO()
  txn.updated_by = user.id
  addAudit(db, householdId, user.id, 'transaction_updated', 'transaction', txn.id, {
    fields: Object.keys(patch),
  })
  save(db)
  return { transaction: serializeTxn(txn, db) }
}

/** Void, bukan hard delete — histori tetap dapat diaudit. */
export async function voidTransaction(householdId, txnId) {
  await delay(350)
  const db = load()
  const { user } = requireMembership(db, householdId)
  const txn = db.transactions.find((t) => t.id === txnId && t.household_id === householdId)
  if (!txn) throw new Error('Transaksi tidak ditemukan.')
  txn.status = 'void'
  txn.voided_at = nowISO()
  txn.voided_by = user.id
  addAudit(db, householdId, user.id, 'transaction_voided', 'transaction', txn.id, {})
  save(db)
  return { transaction: serializeTxn(txn, db) }
}

/* ------------------------------------------------------------------ */
/* Dashboard & budget                                                  */
/* ------------------------------------------------------------------ */

export async function getDashboard(householdId, { month, member = 'all' } = {}) {
  await delay(320)
  if (failMode('dashboard')) throw new Error('Gagal memuat ringkasan. Coba lagi.')
  const db = load()
  requireMembership(db, householdId)
  const monthKey = month || currentMonthKey()

  const payload = buildDashboardPayload({
    transactions: db.transactions.filter((t) => t.household_id === householdId),
    members: db.household_members.filter((m) => m.household_id === householdId),
    categories: db.categories.filter((c) => c.household_id === householdId),
    budgets: db.budgets.filter((b) => b.household_id === householdId),
    monthKey,
    memberFilter: member,
  })

  // Lengkapi baris "terbaru" dengan nama kategori/anggota/akun
  // supaya bentuknya sama dengan daftar di halaman Transaksi.
  payload.recent = payload.recent.map((t) => serializeTxn(t, db))
  payload.generated_at = nowISO()
  return payload
}

export async function getBudgets(householdId, { month } = {}) {
  await delay(220)
  if (failMode('budgets')) throw new Error('Gagal memuat budget. Coba lagi.')
  const db = load()
  requireMembership(db, householdId)
  const monthKey = month || currentMonthKey()
  const budgets = db.budgets
    .filter((b) => b.household_id === householdId && b.period_key === monthKey)
    .map((b) => {
      const cat = db.categories.find((c) => c.id === b.category_id)
      return { ...b, category_name: cat?.name ?? null, category_icon: cat?.icon ?? null }
    })
  return { budgets, month_key: monthKey }
}

export async function createBudget(householdId, { amount, category_id, period_key }) {
  await delay(350)
  const db = load()
  const { user } = requireMembership(db, householdId)
  const cleanAmount = normalizeAmount(amount)
  if (!cleanAmount || cleanAmount <= 0) throw new Error('Nominal budget harus lebih dari 0.')
  const periodKey = period_key || currentMonthKey()
  const categoryId = category_id ?? null

  const dup = db.budgets.find(
    (b) =>
      b.household_id === householdId &&
      b.period_key === periodKey &&
      (b.category_id ?? null) === categoryId,
  )
  if (dup) {
    dup.amount = cleanAmount
    dup.updated_at = nowISO()
    addAudit(db, householdId, user.id, 'budget_updated', 'budget', dup.id, { amount: cleanAmount })
    save(db)
    return { budget: dup }
  }

  const budget = {
    id: newId('bud'),
    household_id: householdId,
    owner_member_id: null,
    category_id: categoryId,
    period_key: periodKey,
    amount: cleanAmount,
    rollover_policy: 'off',
    created_at: nowISO(),
  }
  db.budgets.push(budget)
  addAudit(db, householdId, user.id, 'budget_created', 'budget', budget.id, {
    amount: cleanAmount,
    periodKey,
  })
  save(db)
  return { budget }
}

/* ------------------------------------------------------------------ */
/* Hapus data (Privasi & Data)                                         */
/* ------------------------------------------------------------------ */

export function wipeAllData() {
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    /* noop */
  }
}
