// getData.js, lapisan data fetching
// Alur: halaman lalu getData lalu backend atau localStorage lalu tampilan
//
// Berkas ini satu satunya tempat pemanggilan HTTP ke backend. Halaman tidak boleh
// memanggil axios atau fetch langsung. Pemetaan nama field dan nama relasi ke id
// ada di adapters.js, bukan di sini dan bukan di halaman.
//
// Ada dua mode yang berjalan berdampingan:
//   1. Mode backend. Dipakai setelah pengguna masuk. Sesi diisi lewat setSession,
//      lalu setiap permintaan membawa header Authorization berisi token Supabase.
//   2. Mode demo. Dipakai saat belum ada sesi. Datanya dari localStorage dan
//      mockData, supaya alur lama tetap dapat didemokan tanpa backend.
// Setel save('kf_mode_demo', false) untuk memaksa lapisan ini selalu memakai backend.

import axios from 'axios';

import { load, save } from '../utils/localStorage';
import { track } from '../utils/analytics';
import {
  transactions as mockTransactions,
  budgets as mockBudgets,
  goals as mockGoals,
  categories as mockCategories,
  mockAccounts,
} from '../data/mockData';
import {
  createLookups,
  withHousehold,
  queryString,
  transactionFromApi,
  transactionToApi,
  transactionPatchToApi,
  accountFromApi,
  accountToApi,
  accountPatchToApi,
  categoryFromApi,
  categoryToApi,
  categoryPatchToApi,
  budgetFromApi,
  budgetToApi,
  goalFromApi,
  goalToApi,
  goalPatchToApi,
  contributionToApi,
  householdFromApi,
  memberFromApi,
  memberToApi,
  profileFromApi,
  cashflowFromApi,
  categoryReportFromApi,
  memberReportFromApi,
  summaryFromApi,
} from './adapters';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Ukuran halaman backend paling besar 100. Daftar panjang diambil berulang halaman.
const PER_PAGE = 100;
const HALAMAN_MAKS = 20;

// ------------------------------------------------------------------ keadaan sesi

const sesi = {
  token: null,
  userId: null,
  householdId: null,
  kategori: [],
  anggota: [],
  dompet: [],
  lookups: createLookups(),
};

function segarkanLookups() {
  sesi.lookups = createLookups({
    categories: sesi.kategori,
    members: sesi.anggota,
    accounts: sesi.dompet,
    household: sesi.householdId ? { id: sesi.householdId } : null,
  });
}

// Membaca klaim sub dari token supaya pemanggil tidak wajib mengirim userId.
function subDariToken(token) {
  if (!token) return null;
  try {
    let bagian = String(token).split('.')[1] ?? '';
    bagian = bagian.replace(/-/g, '+').replace(/_/g, '/');
    while (bagian.length % 4 !== 0) bagian += '=';
    const isi = JSON.parse(atob(bagian));
    return isi.sub ?? null;
  } catch {
    return null;
  }
}

function normalAnggota(m) {
  return {
    id: m.id,
    userId: m.userId ?? m.user_id ?? null,
    name: m.name ?? m.display_name ?? '',
    roleRaw: m.roleRaw ?? (m.role ? String(m.role).toLowerCase() : ''),
    canApproveBudget: m.canApproveBudget ?? m.can_approve_budget ?? false,
  };
}

// Dipanggil sekali setelah masuk, dengan data yang sudah diambil halaman pembuka.
export function setSession({ token, userId, householdId, categories, members, accounts, household } = {}) {
  sesi.token = token ?? null;
  sesi.userId = userId ?? subDariToken(token);
  sesi.householdId = householdId ?? household?.id ?? null;
  sesi.kategori = categories ?? [];
  sesi.anggota = (members ?? []).map(normalAnggota);
  sesi.dompet = accounts ?? [];
  segarkanLookups();
  track('getData:setSession', { adaToken: Boolean(sesi.token), householdId: sesi.householdId });
}

export function clearSession() {
  sesi.token = null;
  sesi.userId = null;
  sesi.householdId = null;
  sesi.kategori = [];
  sesi.anggota = [];
  sesi.dompet = [];
  segarkanLookups();
  track('getData:clearSession');
}

// Halaman pembuka memakai ini untuk tahu siapa yang sedang masuk dan perannya.
export function infoSesi() {
  const anggota = sesi.anggota.find((a) => a.userId === sesi.userId) ?? null;
  return {
    userId: sesi.userId,
    householdId: sesi.householdId,
    memberId: anggota?.id ?? null,
    role: anggota?.roleRaw ?? null,
    displayName: anggota?.name ?? '',
  };
}

function adaSesi() {
  return Boolean(sesi.token);
}

function modeDemo() {
  if (adaSesi()) return false;
  return load('kf_mode_demo', true) !== false;
}

function wajibRumah() {
  if (!sesi.householdId) {
    throw new Error('Rumah tangga belum dipilih. Muat rumah tangga lebih dulu di halaman pembuka.');
  }
  return sesi.householdId;
}

function anggotaSesi() {
  const anggota = sesi.anggota.find((a) => a.userId === sesi.userId);
  if (!anggota) {
    throw new Error('Akun ini belum terdaftar sebagai anggota rumah tangga.');
  }
  return anggota.id;
}

// ------------------------------------------------------------------- lalu lintas HTTP

const http = axios.create({ baseURL: BASE_URL, timeout: 20000 });

http.interceptors.request.use((config) => {
  if (sesi.token) config.headers.Authorization = `Bearer ${sesi.token}`;
  return config;
});

function pesanEror(err) {
  const jawaban = err?.response;
  const pesanBackend = jawaban?.data?.error?.message;
  if (pesanBackend) return pesanBackend;
  if (jawaban?.status === 401) return 'Sesi berakhir, silakan masuk kembali.';
  if (jawaban?.status === 403) return 'Kamu tidak punya izin untuk aksi ini pada data itu.';
  if (jawaban?.status === 404) return 'Data yang diminta tidak ditemukan.';
  if (err?.code === 'ERR_NETWORK') {
    return 'Tidak bisa menghubungi server. Pastikan backend sudah berjalan.';
  }
  return err?.message ?? 'Terjadi kesalahan saat menghubungi server.';
}

// Semua fungsi di bawah lewat sini supaya pesan eror selalu seragam dan ramah.
async function jalankan(aksi) {
  try {
    return await aksi();
  } catch (err) {
    track('getData:eror', { pesan: err?.message, status: err?.response?.status });
    throw new Error(pesanEror(err));
  }
}

// Mengambil seluruh baris pada satu jalur daftar, mengikuti halaman sampai habis.
async function ambilSemua(jalur, params = {}) {
  const semua = [];
  for (let halaman = 1; halaman <= HALAMAN_MAKS; halaman += 1) {
    const { data } = await http.get(jalur + queryString({ ...params, page: halaman, per_page: PER_PAGE }));
    const baris = Array.isArray(data?.data) ? data.data : [];
    semua.push(...baris);
    const total = data?.meta?.total;
    if (baris.length === 0) break;
    if (typeof total === 'number' && semua.length >= total) break;
  }
  return semua;
}

// ---------------------------------------------------------------------- mode demo
// Isi di bawah hanya jalan saat belum ada sesi. Bentuk keluarannya sama dengan
// keluaran mode backend supaya halaman tidak perlu tahu sedang di mode mana.

function tunggu(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function demoDaftar(key, isiAwal) {
  const tersimpan = load(key, null);
  if (tersimpan) return tersimpan;
  await tunggu();
  save(key, isiAwal);
  return isiAwal;
}

function bulanBerjalan() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// -------------------------------------------------------------------- transactions

export async function getTransactions() {
  track('getData:getTransactions');
  if (modeDemo()) return demoDaftar('kf_transactions', mockTransactions);
  return jalankan(async () => {
    const baris = await ambilSemua('/transactions', { household_id: wajibRumah() });
    return baris.map((r) => transactionFromApi(r, sesi.lookups));
  });
}

export async function postTransaction(txn) {
  track('getData:postTransaction', { merchant: txn?.merchant, amount: txn?.amount });
  if (modeDemo()) {
    const lama = load('kf_transactions', mockTransactions);
    save('kf_transactions', [txn, ...lama]);
    return txn;
  }
  return jalankan(async () => {
    const payload = transactionToApi(txn, sesi.lookups);
    const { data } = await http.post('/transactions', payload);
    const hasil = transactionFromApi(data?.data ?? data, sesi.lookups);
    // Catatan yang langsung diminta dibatalkan dibuat dulu, lalu ditandai lewat DELETE.
    if (txn?.status === 'dibatalkan') {
      await http.delete(`/transactions/${hasil.id}`);
      return { ...hasil, status: 'dibatalkan' };
    }
    return hasil;
  });
}

export async function putTransaction(id, changes) {
  track('getData:putTransaction', { id });
  if (modeDemo()) {
    const lama = load('kf_transactions', mockTransactions);
    const baru = lama.map((t) => (t.id === id ? { ...t, ...changes } : t));
    save('kf_transactions', baru);
    return baru;
  }
  return jalankan(async () => {
    // Pembatalan bukan pengubahan kolom. Backend menandai baris lewat DELETE, dan
    // daftar transaksi menyaring baris bertanda itu, jadi barisnya hilang dari daftar.
    if (changes?.status === 'dibatalkan') {
      await http.delete(`/transactions/${id}`);
      return { id, status: 'dibatalkan' };
    }
    const payload = transactionPatchToApi(changes, sesi.lookups);
    const { data } = await http.patch(`/transactions/${id}`, payload);
    return transactionFromApi(data?.data ?? data, sesi.lookups);
  });
}

// ------------------------------------------------------------------------ budgets

export async function getBudgets() {
  track('getData:getBudgets');
  if (modeDemo()) return demoDaftar('kf_budgets', mockBudgets);
  return jalankan(async () => {
    const baris = await ambilSemua('/budgets', { household_id: wajibRumah() });
    return baris.map((r) => budgetFromApi(r, sesi.lookups));
  });
}

// Batas anggaran diubah lewat nama kategori, sama seperti pemakaian di halaman Anggaran.
// Kalau anggaran bulan berjalan untuk kategori itu belum ada, dibuat baru.
export async function putBudget(category, limit) {
  track('getData:putBudget', { category, limit });
  if (modeDemo()) {
    const lama = load('kf_budgets', mockBudgets);
    const baru = lama.map((b) => (b.category === category ? { ...b, limit } : b));
    save('kf_budgets', baru);
    return baru;
  }
  return jalankan(async () => {
    const bulan = bulanBerjalan();
    const daftar = await getBudgets();
    const ada = daftar.find((b) => b.category === category && b.period === bulan);
    if (ada) {
      const { data } = await http.patch(`/budgets/${ada.id}`, { limit_amount: Number(limit) || 0 });
      return budgetFromApi(data?.data ?? data, sesi.lookups);
    }
    const payload = budgetToApi({ category, limit, period: bulan }, sesi.lookups);
    const { data } = await http.post('/budgets', payload);
    return budgetFromApi(data?.data ?? data, sesi.lookups);
  });
}

// --------------------------------------------------------------------------- goals

export async function getGoals() {
  track('getData:getGoals');
  if (modeDemo()) return demoDaftar('kf_goals', mockGoals);
  return jalankan(async () => {
    const baris = await ambilSemua('/goals', { household_id: wajibRumah() });
    return baris.map((r) => goalFromApi(r));
  });
}

export async function postGoal(form) {
  track('getData:postGoal', { name: form?.name });
  if (modeDemo()) {
    const lama = load('kf_goals', mockGoals);
    const baru = [...lama, form];
    save('kf_goals', baru);
    return form;
  }
  return jalankan(async () => {
    const { data } = await http.post('/goals', withHousehold(goalToApi(form), sesi.lookups));
    return goalFromApi(data?.data ?? data);
  });
}

export async function putGoal(id, changes) {
  track('getData:putGoal', { id });
  if (modeDemo()) {
    const lama = load('kf_goals', mockGoals);
    const baru = lama.map((g) => (g.id === id ? { ...g, ...changes } : g));
    save('kf_goals', baru);
    return baru;
  }
  return jalankan(async () => {
    const { data } = await http.patch(`/goals/${id}`, goalPatchToApi(changes));
    return goalFromApi(data?.data ?? data);
  });
}

// Setoran memakai id anggota milik akun yang sedang masuk.
export async function postGoalContribution(goalId, amount) {
  track('getData:postGoalContribution', { goalId, amount });
  if (modeDemo()) {
    const lama = load('kf_goals', mockGoals);
    const baru = lama.map((g) =>
      g.id === goalId ? { ...g, current: Math.min(g.current + amount, g.target) } : g
    );
    save('kf_goals', baru);
    return baru;
  }
  return jalankan(async () => {
    const memberId = anggotaSesi();
    const payload = contributionToApi(
      { goalId, amount, memberName: sesi.lookups.memberName(memberId) },
      sesi.lookups
    );
    const { data } = await http.post('/goal_contributions', payload);
    return data?.data ?? data;
  });
}

// ---------------------------------------------------------------------- categories

export async function getCategories() {
  track('getData:getCategories');
  if (modeDemo()) return demoDaftar('kf_categories', mockCategories);
  return jalankan(async () => {
    const baris = await ambilSemua('/categories', { household_id: wajibRumah() });
    const hasil = baris.map((r) => categoryFromApi(r));
    sesi.kategori = hasil;
    segarkanLookups();
    return hasil;
  });
}

export async function postCategory(cat) {
  track('getData:postCategory', { name: cat?.name });
  if (modeDemo()) {
    const lama = load('kf_categories', mockCategories);
    const baru = [...lama, cat];
    save('kf_categories', baru);
    return baru;
  }
  return jalankan(async () => {
    const { data } = await http.post('/categories', withHousehold(categoryToApi(cat), sesi.lookups));
    const hasil = categoryFromApi(data?.data ?? data);
    sesi.kategori = [...sesi.kategori, hasil];
    segarkanLookups();
    return hasil;
  });
}

export async function putCategory(name, changes) {
  track('getData:putCategory', { name });
  if (modeDemo()) {
    const lama = load('kf_categories', mockCategories);
    const baru = lama.map((c) => (c.name === name ? { ...c, ...changes } : c));
    save('kf_categories', baru);
    return baru;
  }
  return jalankan(async () => {
    const daftar = sesi.kategori.length ? sesi.kategori : await getCategories();
    const ada = daftar.find((c) => c.name === name);
    if (!ada) throw new Error(`Kategori "${name}" tidak ditemukan.`);
    const { data } = await http.patch(`/categories/${ada.id}`, categoryPatchToApi({ ...changes }));
    const hasil = categoryFromApi(data?.data ?? data);
    sesi.kategori = sesi.kategori.map((c) => (c.id === hasil.id ? hasil : c));
    segarkanLookups();
    return hasil;
  });
}

// ------------------------------------------------------------------------ accounts

export async function getAccounts() {
  track('getData:getAccounts');
  if (modeDemo()) return demoDaftar('kf_accounts', mockAccounts);
  return jalankan(async () => {
    const baris = await ambilSemua('/accounts', { household_id: wajibRumah() });
    const hasil = baris.map((r) => accountFromApi(r));
    sesi.dompet = hasil;
    segarkanLookups();
    return hasil;
  });
}

export async function postAccount(acc) {
  track('getData:postAccount', { name: acc?.name });
  if (modeDemo()) {
    const lama = load('kf_accounts', mockAccounts);
    const baru = [...lama, acc];
    save('kf_accounts', baru);
    return baru;
  }
  return jalankan(async () => {
    const { data } = await http.post('/accounts', withHousehold(accountToApi(acc), sesi.lookups));
    const hasil = accountFromApi(data?.data ?? data);
    sesi.dompet = [...sesi.dompet, hasil];
    segarkanLookups();
    return hasil;
  });
}

export async function putAccount(id, changes) {
  track('getData:putAccount', { id });
  if (modeDemo()) {
    const lama = load('kf_accounts', mockAccounts);
    const baru = lama.map((a) => (a.id === id ? { ...a, ...changes } : a));
    save('kf_accounts', baru);
    return baru;
  }
  return jalankan(async () => {
    const { data } = await http.patch(`/accounts/${id}`, accountPatchToApi(changes));
    const hasil = accountFromApi(data?.data ?? data);
    sesi.dompet = sesi.dompet.map((a) => (a.id === hasil.id ? hasil : a));
    segarkanLookups();
    return hasil;
  });
}

export async function deleteAccount(id) {
  track('getData:deleteAccount', { id });
  if (modeDemo()) {
    const lama = load('kf_accounts', mockAccounts);
    const baru = lama.filter((a) => a.id !== id);
    save('kf_accounts', baru);
    return baru;
  }
  return jalankan(async () => {
    await http.delete(`/accounts/${id}`);
    sesi.dompet = sesi.dompet.filter((a) => a.id !== id);
    segarkanLookups();
    return { id };
  });
}

// ------------------------------------------------------------------------- profiles

export async function getProfile() {
  track('getData:getProfile');
  if (modeDemo()) return { id: 'demo', email: 'demo@lokal', fullName: 'Pengguna Demo', avatar: '' };
  return jalankan(async () => {
    const { data } = await http.get('/profiles/me');
    return profileFromApi(data?.data ?? data);
  });
}

export async function putProfile(changes) {
  track('getData:putProfile');
  if (modeDemo()) return { ...changes };
  return jalankan(async () => {
    const { data } = await http.patch('/profiles/me', {
      full_name: changes?.fullName,
      avatar_emoji: changes?.avatar,
    });
    return profileFromApi(data?.data ?? data);
  });
}

// -------------------------------------------------------- rumah tangga dan anggota

export async function getHouseholds() {
  track('getData:getHouseholds');
  if (modeDemo()) return [];
  return jalankan(async () => {
    const baris = await ambilSemua('/households');
    const hasil = baris.map((r) => householdFromApi(r));
    if (!sesi.householdId && hasil.length) {
      sesi.householdId = hasil[0].id;
      segarkanLookups();
    }
    return hasil;
  });
}

export async function postHousehold(form) {
  track('getData:postHousehold', { name: form?.name });
  if (modeDemo()) return { ...form, id: 'demo' };
  return jalankan(async () => {
    const { data } = await http.post('/households', {
      name: form?.name,
      currency: form?.currency ?? 'IDR',
      monthly_start_day: form?.monthlyStartDay ?? 1,
    });
    const hasil = householdFromApi(data?.data ?? data);
    sesi.householdId = hasil.id;
    segarkanLookups();
    return hasil;
  });
}

export async function putHousehold(id, changes) {
  track('getData:putHousehold', { id });
  if (modeDemo()) return { ...changes, id };
  return jalankan(async () => {
    const { data } = await http.patch(`/households/${id}`, {
      name: changes?.name,
      currency: changes?.currency,
      monthly_start_day: changes?.monthlyStartDay,
    });
    return householdFromApi(data?.data ?? data);
  });
}

export async function getMembers() {
  track('getData:getMembers');
  if (modeDemo()) return [];
  return jalankan(async () => {
    const baris = await ambilSemua('/household_members', { household_id: wajibRumah() });
    const hasil = baris.map((r) => memberFromApi(r));
    sesi.anggota = hasil.map(normalAnggota);
    segarkanLookups();
    return hasil;
  });
}

export async function postMember(form) {
  track('getData:postMember', { name: form?.name });
  if (modeDemo()) return { ...form, id: 'demo' };
  return jalankan(async () => {
    const { data } = await http.post('/household_members', memberToApi(form, sesi.lookups));
    const hasil = memberFromApi(data?.data ?? data);
    sesi.anggota = [...sesi.anggota, normalAnggota(hasil)];
    segarkanLookups();
    return hasil;
  });
}

export async function putMember(id, changes) {
  track('getData:putMember', { id });
  if (modeDemo()) return { ...changes, id };
  return jalankan(async () => {
    const { data } = await http.patch(`/household_members/${id}`, {
      role: changes?.roleRaw ?? changes?.role?.toLowerCase(),
      display_name: changes?.name,
      can_approve_budget: changes?.canApproveBudget,
    });
    const hasil = memberFromApi(data?.data ?? data);
    sesi.anggota = sesi.anggota.map((a) => (a.id === hasil.id ? normalAnggota(hasil) : a));
    segarkanLookups();
    return hasil;
  });
}

export async function deleteMember(id) {
  track('getData:deleteMember', { id });
  if (modeDemo()) return { id };
  return jalankan(async () => {
    await http.delete(`/household_members/${id}`);
    sesi.anggota = sesi.anggota.filter((a) => a.id !== id);
    segarkanLookups();
    return { id };
  });
}

// ------------------------------------------------------------- ringkasan dan laporan

export async function getDashboardSummary(bulan) {
  track('getData:getDashboardSummary', { bulan });
  if (modeDemo()) {
    return summaryFromApi({ data: { bulan: bulan ?? bulanBerjalan() } });
  }
  return jalankan(async () => {
    const { data } = await http.get('/dashboard/summary' + queryString({
      household_id: wajibRumah(),
      bulan: bulan ?? bulanBerjalan(),
    }));
    return summaryFromApi(data);
  });
}

function rentang(dari, sampai) {
  return queryString({ household_id: wajibRumah(), from: dari, to: sampai });
}

export async function getReportsCashflow(dari, sampai) {
  track('getData:getReportsCashflow', { dari, sampai });
  if (modeDemo()) return [];
  return jalankan(async () => {
    const { data } = await http.get('/reports/cashflow' + rentang(dari, sampai));
    return cashflowFromApi(data);
  });
}

export async function getReportsCategories(dari, sampai) {
  track('getData:getReportsCategories', { dari, sampai });
  if (modeDemo()) return [];
  return jalankan(async () => {
    const { data } = await http.get('/reports/categories' + rentang(dari, sampai));
    return categoryReportFromApi(data);
  });
}

export async function getReportsMembers(dari, sampai) {
  track('getData:getReportsMembers', { dari, sampai });
  if (modeDemo()) return [];
  return jalankan(async () => {
    const { data } = await http.get('/reports/members' + rentang(dari, sampai));
    return memberReportFromApi(data);
  });
}

// Mengunduh berkas CSV yang dibuat backend. Di luar peramban, isinya dikembalikan saja.
export async function exportReportsCsv(dari, sampai) {
  track('getData:exportReportsCsv', { dari, sampai });
  if (modeDemo()) throw new Error('Ekspor CSV hanya tersedia setelah masuk.');
  return jalankan(async () => {
    const res = await http.get('/reports/export.csv' + rentang(dari, sampai), {
      responseType: 'text',
      transformResponse: [(v) => v],
    });
    const nama = `transaksi_${dari ?? 'awal'}_${sampai ?? 'kini'}.csv`;
    if (typeof document !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
      const tautan = document.createElement('a');
      tautan.href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      tautan.download = nama;
      document.body.appendChild(tautan);
      tautan.click();
      document.body.removeChild(tautan);
      URL.revokeObjectURL(tautan.href);
    }
    return { nama, teks: res.data };
  });
}
