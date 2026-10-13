// adapters.js, jembatan antara bentuk data frontend dan kontrak API backend.
//
// Dokumen target: KeluargaFin_Backend_Supabase_v4_Logic_di_Backend.docx
// Kontrak backend memakai snake_case, id UUID, dan household_id pada setiap baris.
// Frontend saat ini memakai nama sebagai key relasi (category, member, account)
// dan nama field pendek (date, limit, target, current, archived, balance).
//
// Berkas ini hanya melakukan penerjemahan bentuk data. Tidak ada perhitungan
// ringkasan di sini karena backend sudah mengirimkannya sebagai kolom turunan.

// ---------------------------------------------------------------- kamus field

export const FIELD_MAP = {
  transaction: {
    date: 'txn_date',
    amount: 'amount',
    merchant: 'merchant',
    notes: 'notes',
    type: 'type',
  },
  account: {
    balance: 'opening_balance',
  },
  budget: {
    limit: 'limit_amount',
    category: 'category_id',
    period: 'period_month',
  },
  goal: {
    target: 'target_amount',
    current: 'saved_amount',
    deadline: 'deadline',
  },
  category: {
    archived: 'is_archived',
  },
};

export const COMPUTED_FIELDS = {
  account: ['current_balance'],
  budget: ['spent', 'remaining', 'usage_percent', 'status'],
  goal: ['saved_amount', 'progress_percent', 'remaining'],
  transactionList: ['meta.total_amount'],
};

// Pemetaan status transaksi sementara.
// Backend belum punya kolom status, jadi baris yang dihapus lunak dibaca sebagai
// dibatalkan. Nilai pending belum punya wakil di backend dan perlu keputusan tim.
export const STATUS_MAP = {
  dibatalkanDariBackend: (row) => (row.deleted_at ? 'dibatalkan' : 'selesai'),
  payloadKeBackend: { selesai: null, pending: null, dibatalkan: 'deleted_at' },
  pendingDidukungBackend: false,
};

const ROLE_LABEL = { ayah: 'Ayah', ibu: 'Ibu', anak: 'Anak' };

// ------------------------------------------------------------------- penolong

export function periodFromMonthKey(monthKey) {
  // '2026-09' menjadi '2026-09-01' sesuai tipe DATE pada kontrak backend
  if (!monthKey) return null;
  const bagian = String(monthKey).split('-');
  return `${bagian[0]}-${bagian[1]}-01`;
}

export function monthKeyFromPeriod(period) {
  // '2026-09-01' menjadi '2026-09' untuk pemilih bulan di antarmuka
  if (!period) return null;
  return String(period).slice(0, 7);
}

export function queryString(params = {}) {
  const bersih = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (bersih.length === 0) return '';
  return '?' + bersih.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

function butuh(nilai, pesan) {
  if (nilai === undefined || nilai === null || nilai === '') {
    throw new Error(`adapters: ${pesan}`);
  }
  return nilai;
}

// -------------------------------------------------------------------- lookups

// Membangun kamus dua arah antara nama yang dipakai antarmuka dan id dari backend.
export function createLookups({ categories = [], members = [], accounts = [], household = null } = {}) {
  const categoryIdByName = new Map();
  const categoryById = new Map();
  const memberIdByName = new Map();
  const memberById = new Map();
  const accountIdByName = new Map();
  const accountById = new Map();

  categories.forEach((c) => {
    categoryIdByName.set(c.name, c.id);
    categoryById.set(c.id, c);
  });
  members.forEach((m) => {
    const nama = m.display_name ?? m.name;
    memberIdByName.set(nama, m.id);
    memberById.set(m.id, m);
  });
  accounts.forEach((a) => {
    accountIdByName.set(a.name, a.id);
    accountById.set(a.id, a);
  });

  return {
    householdId: household?.id ?? null,
    categoryIdByName,
    categoryById,
    memberIdByName,
    memberById,
    accountIdByName,
    accountById,
    resolveCategoryId: (nama) => butuh(categoryIdByName.get(nama), `kategori "${nama}" tidak ditemukan`),
    resolveMemberId: (nama) => butuh(memberIdByName.get(nama), `anggota "${nama}" tidak ditemukan`),
    resolveAccountId: (nama) => butuh(accountIdByName.get(nama), `dompet "${nama}" tidak ditemukan`),
    categoryName: (id) => categoryById.get(id)?.name ?? '',
    memberName: (id) => memberById.get(id)?.display_name ?? memberById.get(id)?.name ?? '',
    accountName: (id) => accountById.get(id)?.name ?? '',
  };
}

export function withHousehold(payload, lookups) {
  return { ...payload, household_id: butuh(lookups.householdId, 'household_id belum diisi pada lookups') };
}

// --------------------------------------------------------------- transactions

// Baris backend menjadi bentuk yang dipakai halaman Transaksi, Dashboard, dan Reports.
export function transactionFromApi(row, lookups) {
  return {
    id: row.id,
    date: row.txn_date,
    type: row.type,
    amount: row.amount,
    category: lookups.categoryName(row.category_id),
    categoryId: row.category_id ?? null,
    member: lookups.memberName(row.member_id),
    memberId: row.member_id ?? null,
    account: lookups.accountName(row.account_id),
    accountId: row.account_id ?? null,
    toAccount: row.to_account_id ? lookups.accountName(row.to_account_id) : null,
    toAccountId: row.to_account_id ?? null,
    merchant: row.merchant ?? '',
    notes: row.notes ?? '',
    status: STATUS_MAP.dibatalkanDariBackend(row),
    createdAt: row.created_at ?? null,
  };
}

export function transactionListFromApi(response, lookups) {
  const data = Array.isArray(response) ? response : response?.data ?? [];
  return {
    items: data.map((row) => transactionFromApi(row, lookups)),
    meta: response?.meta ?? {},
  };
}

// Formulir frontend menjadi payload POST atau PATCH.
export function transactionToApi(form, lookups) {
  const tipe = butuh(form.type, 'jenis transaksi wajib diisi');
  const payload = {
    type: tipe,
    amount: Number(String(form.amount ?? '').replace(/\D/g, '')) || 0,
    txn_date: butuh(form.date, 'tanggal transaksi wajib diisi'),
    account_id: lookups.resolveAccountId(butuh(form.account, 'dompet wajib dipilih')),
    member_id: lookups.resolveMemberId(butuh(form.member, 'anggota wajib dipilih')),
    merchant: form.merchant ?? '',
    notes: form.notes ?? '',
  };

  if (payload.amount <= 0) throw new Error('adapters: nominal transaksi harus lebih besar dari nol');
  if (tipe === 'transfer') {
    payload.to_account_id = lookups.resolveAccountId(butuh(form.toAccount, 'dompet tujuan wajib dipilih untuk transfer'));
    if (payload.to_account_id === payload.account_id) {
      throw new Error('adapters: dompet asal dan dompet tujuan tidak boleh sama');
    }
  } else {
    payload.category_id = lookups.resolveCategoryId(butuh(form.category, 'kategori wajib dipilih'));
  }

  // Status transaksi belum punya kolom di backend. Pembatalan dikirim lewat DELETE,
  // bukan lewat kolom deleted_at pada body, karena model backend menolak kolom tambahan.
  // Nilai pending juga belum ada wakilnya di backend dan masih menunggu keputusan tim.

  return withHousehold(payload, lookups);
}

// Formulir frontend menjadi payload PATCH. Hanya kolom yang benar benar dikirim yang
// ikut, supaya pengubahan sebagian seperti hanya nominal atau hanya merchant tetap jalan.
export function transactionPatchToApi(form, lookups) {
  const payload = {};

  if (form.type !== undefined) {
    payload.type = butuh(form.type, 'jenis transaksi wajib diisi');
    if (payload.type === 'transfer') {
      payload.to_account_id = lookups.resolveAccountId(butuh(form.toAccount, 'dompet tujuan wajib dipilih untuk transfer'));
    } else {
      payload.category_id = lookups.resolveCategoryId(butuh(form.category, 'kategori wajib dipilih'));
    }
  } else if (form.category !== undefined) {
    payload.category_id = lookups.resolveCategoryId(butuh(form.category, 'kategori wajib dipilih'));
  }

  if (form.amount !== undefined) {
    const nominal = Number(String(form.amount).replace(/\D/g, '')) || 0;
    if (nominal <= 0) throw new Error('adapters: nominal transaksi harus lebih besar dari nol');
    payload.amount = nominal;
  }
  if (form.date !== undefined) payload.txn_date = butuh(form.date, 'tanggal transaksi wajib diisi');
  if (form.account !== undefined) payload.account_id = lookups.resolveAccountId(butuh(form.account, 'dompet wajib dipilih'));
  if (form.member !== undefined) payload.member_id = lookups.resolveMemberId(butuh(form.member, 'anggota wajib dipilih'));
  if (form.merchant !== undefined) payload.merchant = form.merchant ?? '';
  if (form.notes !== undefined) payload.notes = form.notes ?? '';

  return payload;
}

// ------------------------------------------------------------ dompet accounts

export function accountFromApi(row) {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider ?? '',
    type: row.type,
    icon: row.icon ?? '',
    balance: row.current_balance ?? row.opening_balance ?? 0,
    openingBalance: row.opening_balance ?? 0,
    isActive: row.is_active ?? true,
  };
}

// Formulir frontend menjadi payload POST dompet. is_active tidak ikut karena model
// DompetBaru menolak kolom tambahan, dan dompet baru selalu aktif.
export function accountToApi(form) {
  const tipe = butuh(form.type, 'jenis dompet wajib diisi');
  return {
    name: butuh(form.name, 'nama dompet wajib diisi').trim(),
    type: tipe,
    provider: form.provider ?? '',
    opening_balance: Number(String(form.balance ?? form.opening_balance ?? '').replace(/\D/g, '')) || 0,
  };
}

// Formulir frontend menjadi payload PATCH dompet. Hanya kolom yang dikirim yang ikut,
// supaya pengubahan sebagian tidak ikut mengirim jenis dompet kosong.
export function accountPatchToApi(form) {
  const payload = {};
  if (form.name !== undefined) payload.name = butuh(form.name, 'nama dompet wajib diisi').trim();
  if (form.type !== undefined) payload.type = butuh(form.type, 'jenis dompet wajib diisi');
  if (form.provider !== undefined) payload.provider = form.provider ?? '';
  if (form.balance !== undefined || form.openingBalance !== undefined) {
    payload.opening_balance = Number(String(form.balance ?? form.openingBalance ?? '').replace(/\D/g, '')) || 0;
  }
  if (form.isActive !== undefined) payload.is_active = form.isActive;
  return payload;
}

// -------------------------------------------------------- kategori categories

export function categoryFromApi(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind ?? 'expense',
    icon: row.icon ?? '',
    color: row.color ?? '#94A3B8',
    archived: row.is_archived ?? false,
    isSystem: row.is_system ?? false,
  };
}

// Formulir frontend menjadi payload POST kategori. is_archived tidak ikut karena model
// KategoriBaru menolak kolom tambahan, dan kategori baru selalu belum diarsipkan.
export function categoryToApi(form) {
  return {
    name: butuh(form.name, 'nama kategori wajib diisi').trim(),
    kind: form.kind ?? 'expense',
    icon: form.icon ?? '',
    color: form.color ?? '#94A3B8',
  };
}

// Formulir frontend menjadi payload PATCH kategori. Hanya kolom yang dikirim yang ikut.
export function categoryPatchToApi(form) {
  const payload = {};
  if (form.name !== undefined) payload.name = butuh(form.name, 'nama kategori wajib diisi').trim();
  if (form.kind !== undefined) payload.kind = form.kind;
  if (form.icon !== undefined) payload.icon = form.icon ?? '';
  if (form.color !== undefined) payload.color = form.color ?? '#94A3B8';
  if (form.archived !== undefined) payload.is_archived = form.archived;
  return payload;
}

// ---------------------------------------------------------- anggaran budgets

// spent, remaining, usage_percent, dan status datang dari backend, bukan dihitung di sini.
export function budgetFromApi(row, lookups) {
  return {
    id: row.id,
    category: lookups.categoryName(row.category_id),
    categoryId: row.category_id,
    icon: lookups.categoryById.get(row.category_id)?.icon ?? '',
    color: lookups.categoryById.get(row.category_id)?.color ?? '#94A3B8',
    limit: row.limit_amount,
    spent: row.spent ?? 0,
    remaining: row.remaining ?? Math.max((row.limit_amount ?? 0) - (row.spent ?? 0), 0),
    usagePercent: row.usage_percent ?? 0,
    status: row.status ?? 'aman',
    period: monthKeyFromPeriod(row.period_month),
    periodMonth: row.period_month,
  };
}

export function budgetToApi(form, lookups) {
  return withHousehold({
    category_id: lookups.resolveCategoryId(butuh(form.category, 'kategori anggaran wajib dipilih')),
    period_month: periodFromMonthKey(butuh(form.period, 'periode anggaran wajib diisi, contoh 2026-09')),
    limit_amount: Number(String(form.limit ?? '').replace(/\D/g, '')) || 0,
  }, lookups);
}

// ------------------------------------------------------------- tujuan goals

export function goalFromApi(row) {
  const target = row.target_amount ?? 0;
  const terkumpul = row.saved_amount ?? 0;
  return {
    id: row.id,
    name: row.name,
    target,
    current: terkumpul,
    progressPercent: row.progress_percent ?? (target > 0 ? Math.round((terkumpul / target) * 100) : 0),
    remaining: row.remaining ?? Math.max(target - terkumpul, 0),
    deadline: row.deadline ?? '',
    icon: row.icon ?? '',
    color: row.color ?? '#10B981',
    status: row.status ?? 'active',
  };
}

export function goalToApi(form) {
  return {
    name: butuh(form.name, 'nama tujuan wajib diisi').trim(),
    target_amount: Number(String(form.target ?? '').replace(/\D/g, '')) || 0,
    deadline: form.deadline || null,
    icon: form.icon ?? '',
    color: form.color ?? '#10B981',
    status: form.status ?? 'active',
  };
}

// Formulir frontend menjadi payload PATCH tujuan. Hanya kolom yang dikirim yang ikut,
// supaya pengubahan sebagian tidak ikut mengirim target bernilai nol.
export function goalPatchToApi(form) {
  const payload = {};
  if (form.name !== undefined) payload.name = butuh(form.name, 'nama tujuan wajib diisi').trim();
  if (form.target !== undefined) {
    const target = Number(String(form.target).replace(/\D/g, '')) || 0;
    if (target <= 0) throw new Error('adapters: target tujuan harus lebih besar dari nol');
    payload.target_amount = target;
  }
  if (form.deadline !== undefined) payload.deadline = form.deadline || null;
  if (form.icon !== undefined) payload.icon = form.icon ?? '';
  if (form.color !== undefined) payload.color = form.color ?? '';
  if (form.status !== undefined) payload.status = form.status;
  return payload;
}

export function contributionToApi({ goalId, amount, memberName, accountName }, lookups) {
  const payload = {
    goal_id: butuh(goalId, 'id tujuan wajib diisi'),
    amount: Number(String(amount ?? '').replace(/\D/g, '')) || 0,
    member_id: lookups.resolveMemberId(butuh(memberName, 'anggota penyetor wajib dipilih')),
  };
  if (payload.amount <= 0) throw new Error('adapters: nominal setoran harus lebih besar dari nol');
  if (accountName) payload.account_id = lookups.resolveAccountId(accountName);
  return withHousehold(payload, lookups);
}

// ------------------------------------------------ rumah tangga dan anggota

export function householdFromApi(row, members = []) {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency ?? 'IDR',
    monthlyStartDay: row.monthly_start_day ?? 1,
    members: members.map(memberFromApi),
  };
}

export function memberFromApi(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
    role: ROLE_LABEL[row.role] ?? row.role,
    roleRaw: row.role,
    canApproveBudget: row.can_approve_budget ?? false,
    joinedAt: row.joined_at ?? null,
  };
}

export function memberToApi(form, lookups) {
  return withHousehold({
    user_id: butuh(form.userId, 'user_id anggota wajib diisi, diambil dari Supabase Auth'),
    role: butuh((form.roleRaw ?? form.role ?? '').toLowerCase(), 'peran anggota wajib dipilih'),
    display_name: butuh(form.name, 'nama tampilan anggota wajib diisi').trim(),
    can_approve_budget: form.canApproveBudget ?? false,
  }, lookups);
}

export function profileFromApi(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatar: row.avatar_emoji ?? '',
  };
}

// --------------------------------------------------------------- laporan

// GET /reports/cashflow menjadi deret bulan yang dipakai grafik halaman Laporan.
// Backend memakai nama kolom bahasa Indonesia, yaitu bulan, pemasukan, pengeluaran, selisih.
export function cashflowFromApi(response) {
  const rows = Array.isArray(response) ? response : response?.data ?? [];
  return rows.map((r) => ({
    month: r.bulan ?? r.month ?? '',
    label: r.bulan ?? r.month ?? '',
    income: r.pemasukan ?? 0,
    expense: r.pengeluaran ?? 0,
    net: r.selisih ?? 0,
  }));
}

// GET /reports/categories. Backend mengirim category_id, nama, dan total pengeluaran.
export function categoryReportFromApi(response) {
  const rows = Array.isArray(response) ? response : response?.data ?? [];
  const total = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  return rows.map((r) => {
    const nilai = Number(r.total) || 0;
    return {
      category: r.nama ?? r.name ?? '',
      categoryId: r.category_id ?? null,
      spent: nilai,
      total: nilai,
      pct: total > 0 ? Math.round((nilai / total) * 100) : 0,
    };
  });
}

// GET /reports/members. Backend menjumlahkan pengeluaran saja, jadi masukannya nol.
export function memberReportFromApi(response) {
  const rows = Array.isArray(response) ? response : response?.data ?? [];
  return rows.map((r) => ({
    name: r.nama ?? r.display_name ?? '',
    memberId: r.member_id ?? null,
    inc: 0,
    exp: Number(r.total) || 0,
    total: Number(r.total) || 0,
    count: r.jumlah_transaksi ?? 0,
  }));
}

// GET /dashboard/summary. Backend mengirim delapan kolom jadi, tidak ada daftar di dalamnya.
// Daftar seperti kategori teratas, peringatan anggaran, dan transaksi terbaru dibangun
// halaman dari getReportsCategories, getBudgets, dan getTransactions.
export function summaryFromApi(response) {
  const d = response?.data ?? response ?? {};
  return {
    period: d.bulan ?? '',
    totalIncome: d.pemasukan ?? 0,
    totalExpense: d.pengeluaran ?? 0,
    netFlow: d.selisih ?? 0,
    budgetLimit: d.batas_anggaran ?? 0,
    budgetSpent: d.anggaran_terpakai ?? 0,
    budgetRemaining: d.anggaran_tersisa ?? 0,
    savingsCollected: d.tabungan_terkumpul ?? 0,
  };
}
