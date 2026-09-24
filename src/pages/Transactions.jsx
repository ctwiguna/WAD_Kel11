// Alur data: Transactions (luar fetch) → getTransactions → localStorage → tampilan

import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getTransactions, postTransaction } from '../API/getData';
import { track } from '../utils/analytics';
import { categories, members, accounts, formatRupiah, formatDate } from '../data/mockData';
import Card from '../components/Card';
import Button from '../components/Button';

const typeColors  = { expense: '#EF4444', income: '#10B981', transfer: '#3B82F6' };
const typeLabels  = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' };
const filterChips = ['all', 'expense', 'income', 'transfer'];

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  type: 'expense',
  amount: '',
  category: categories[0].name,
  member: members[0],
  merchant: '',
  notes: '',
  account: accounts[0],
};

export default function Transactions() {
  // useState → filter + form state
  const [filter, setFilter]       = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // useFetch → ambil dari getData → localStorage
  const { data: transactions, loading, error, refetch } = useFetch(getTransactions);

  track('Transactions:render', { filter, memberFilter });

  // loading — ternary
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return <Card><p className="text-red-500 text-sm">⚠️ {error}</p></Card>;

  const txns = transactions ?? [];

  // useState → filter transaksi
  const filtered = txns
    .filter(t => (filter === 'all' || t.type === filter) && (memberFilter === 'all' || t.member === memberFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const newTxn = {
      id: String(Date.now()),
      ...form,
      amount: parseInt(form.amount.replace(/\D/g, ''), 10) || 0,
    };

    track('Transactions:addTransaction', { type: newTxn.type, amount: newTxn.amount });

    await postTransaction(newTxn);
    refetch(); // deps trigger → useFetch fetch ulang

    setShowForm(false);
    setForm(emptyForm);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Keuangan</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaksi</h1>
        </div>
        {/* Button — props + default value */}
        <Button onClick={() => { track('Transactions:openForm'); setShowForm(true); }}>
          + Tambah Transaksi
        </Button>
      </div>

      {/* Filter chips — map */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-white rounded-xl p-1 border border-slate-100 gap-1">
          {filterChips.map((f) => (
            <button
              key={f}
              onClick={() => { track('Transactions:filter', { value: f }); setFilter(f); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: filter === f ? '#0F172A' : 'transparent',
                color: filter === f ? '#fff' : '#64748B',
              }}
            >
              {f === 'all' ? 'Semua' : typeLabels[f]}
            </button>
          ))}
        </div>
        <select
          value={memberFilter}
          onChange={e => setMemberFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none"
        >
          <option value="all">Semua Anggota</option>
          {/* map → anggota */}
          {members.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Daftar transaksi — map + ternary empty state */}
      <Card padding="p-0" className="overflow-hidden">
        {filtered.length === 0 ? (
          // ternary → empty state
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-slate-400">Tidak ada transaksi ditemukan.</p>
          </div>
        ) : (
          // map → daftar transaksi
          filtered.map((txn) => {
            const cat = categories.find(c => c.name === txn.category);
            return (
              <div
                key={txn.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: txn.type === 'income' ? '#D1FAE5' : txn.type === 'transfer' ? '#DBEAFE' : '#FEF2F2' }}
                >
                  {txn.type === 'income' ? '💰' : txn.type === 'transfer' ? '🔄' : (cat?.icon ?? '📦')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{txn.merchant}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{txn.category} · {txn.member} · {txn.account}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: typeColors[txn.type] }}>
                    {txn.type === 'income' ? '+' : txn.type === 'transfer' ? '' : '-'}{formatRupiah(txn.amount)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(txn.date)}</p>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Modal tambah transaksi */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 32px 64px -12px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-900 text-lg">Tambah Transaksi Baru</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Tipe — map */}
              <div className="flex gap-2">
                {['expense', 'income', 'transfer'].map((t) => (
                  <button type="button" key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={{
                      backgroundColor: form.type === t ? typeColors[t] : 'transparent',
                      color: form.type === t ? '#fff' : '#64748B',
                      borderColor: form.type === t ? typeColors[t] : '#E2E8F0',
                    }}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Jumlah (Rp)</label>
                <input type="text" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tanggal</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Anggota</label>
                  <select value={form.member} onChange={e => setForm({ ...form, member: e.target.value })}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                    {members.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Kategori</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                  {/* map → kategori */}
                  {categories.map(c => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Merchant / Toko</label>
                <input type="text" value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })}
                  placeholder="cth: Indomaret, Grab, PLN..." required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Rekening</label>
                <select value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                  {accounts.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Catatan (opsional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Tambahkan catatan..." rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                {/* Button — props + variant */}
                <Button variant="outline" fullWidth onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
