// Alur data: Budget (luar fetch) → getBudgets + getTransactions → localStorage → tampilan
// spent dihitung OTOMATIS dari transaksi, bukan dari data statis

import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getBudgets, getTransactions, putBudget } from '../API/getData';
import { track } from '../utils/analytics';
import { categories, formatRupiah } from '../data/mockData';
import Card from '../components/Card';
import Button from '../components/Button';

function hitungSpentPerKategori(transactions) {
  const result = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      result[t.category] = (result[t.category] ?? 0) + t.amount;
    });
  return result;
}

export default function Budget() {
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [form, setForm] = useState({ category: categories[0].name, limit: '' });

  const { data: budgets, loading: loadB, error: errB, refetch: refetchB } = useFetch(getBudgets);
  const { data: transactions, loading: loadT, error: errT } = useFetch(getTransactions);

  track('Budget:render');

  if (loadB || loadT) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (errB || errT) return <Card><p className="text-red-500 text-sm">⚠️ {errB ?? errT}</p></Card>;

  const bdgs = budgets ?? [];
  const txns = transactions ?? [];

  const spentMap = hitungSpentPerKategori(txns);

  const bdgsWithSpent = bdgs.map(b => ({
    ...b,
    spent: spentMap[b.category] ?? 0,
  }));

  const totalBudget = bdgsWithSpent.reduce((s, b) => s + b.limit, 0);
  const totalSpent  = bdgsWithSpent.reduce((s, b) => s + b.spent, 0);
  const overBudget  = bdgsWithSpent.filter(b => b.spent > b.limit);

  const handleSave = async (e) => {
    e.preventDefault();
    const limitVal = parseInt(form.limit.replace(/\D/g, ''), 10) || 0;
    track('Budget:save', { category: editCategory ?? form.category, limit: limitVal });
    await putBudget(editCategory ?? form.category, limitVal);
    refetchB();
    setShowForm(false);
    setEditCategory(null);
    setForm({ category: categories[0].name, limit: '' });
  };

  const openEdit = (b) => {
    setEditCategory(b.category);
    setForm({ category: b.category, limit: String(b.limit) });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Januari 2024</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Anggaran</h1>
        </div>
        <Button onClick={() => { setEditCategory(null); setShowForm(true); }}>+ Tambah Anggaran</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Anggaran', value: formatRupiah(totalBudget),             color: '#0F172A' },
          { label: 'Total Terpakai', value: formatRupiah(totalSpent),              color: '#EF4444' },
          { label: 'Sisa Anggaran', value: formatRupiah(totalBudget - totalSpent), color: '#10B981' },
        ].map(s => (
          <Card key={s.label} padding="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{s.label}</p>
            <p className="text-xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      {overBudget.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">Anggaran terlampaui!</p>
            <p className="text-xs text-red-500 mt-0.5">
              {overBudget.map(b => b.category).join(', ')} melebihi batas anggaran.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {bdgsWithSpent.map((b) => {
          const pct       = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
          const isOver    = b.spent > b.limit;
          const isWarning = pct >= 75 && !isOver;
          const barColor   = isOver ? '#EF4444' : isWarning ? '#F59E0B' : b.color;
          const badgeBg    = isOver ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#F0FDF4';
          const badgeColor = isOver ? '#DC2626' : isWarning ? '#D97706' : '#16A34A';

          return (
            <Card key={b.category} padding="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: b.color + '20' }}>
                    {b.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{b.category}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatRupiah(b.spent)} dari {formatRupiah(b.limit)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: badgeBg, color: badgeColor }}>
                    {pct}%
                  </span>
                  <Button variant="ghost" className="px-2! py-1! text-xs" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
              </div>

              {isOver && (
                <p className="text-xs text-red-500 mt-2">
                  Kelebihan {formatRupiah(b.spent - b.limit)} dari anggaran
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6"
            style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 32px 64px -12px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-900">
                {editCategory ? 'Edit Anggaran' : 'Tambah Anggaran'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-xl">x</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {editCategory ? (
                <p className="font-semibold text-slate-900">{editCategory}</p>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Kategori</label>
                  <select value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                    {categories.map(c => <option key={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Batas Anggaran (Rp)</label>
                <input type="text" value={form.limit}
                  onChange={e => setForm({ ...form, limit: e.target.value })}
                  placeholder="cth: 2000000" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" fullWidth>Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
