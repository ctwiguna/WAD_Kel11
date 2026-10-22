// Alur data: Budget → getBudgets dan getCategories → backend lewat getData.js.
// Pemakaian, sisa, persentase, dan status tiap anggaran sudah dihitung backend.
// Tambah dan ubah batas anggaran memakai putBudget supaya tersimpan di backend.

import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getBudgets, putBudget, getCategories } from '../API/getData';
import { track } from '../utils/analytics';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../data/mockData';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Budget() {
  const { showToast } = useToast();
  const [editingCategory, setEditingCategory] = useState(null);
  const [newLimit, setNewLimit]               = useState('');
  const [saving, setSaving]                   = useState(false);
  const [showAddForm, setShowAddForm]         = useState(false);
  const [addForm, setAddForm]                 = useState({ category: '', limit: '' });

  // state bulan berjalan, dipakai sebagai deps useFetch di bawah
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: budgets,      loading: loadBdg, refetch: refetchBdg } = useFetch(getBudgets);
  const { data: categoriesData }                                      = useFetch(getCategories);

  track('Budget:render');

  if (loadBdg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const allCats = (categoriesData ?? []).filter(c => !c.archived);

  // getBudgets mengembalikan anggaran semua bulan, jadi disaring dulu sesuai pemilih bulan.
  // Nilai spent, remaining, usagePercent, dan status dipakai apa adanya dari backend.
  const bdgs = (budgets ?? []).filter(b => b.period === period);

  // kategori yang belum punya anggaran pada bulan yang dipilih
  const usedCategories = new Set(bdgs.map(b => b.category));
  const availableCats  = allCats.filter(c => !usedCategories.has(c.name));

  const totalLimit = bdgs.reduce((s, b) => s + Number(b.limit ?? 0), 0);
  const totalSpent = bdgs.reduce((s, b) => s + Number(b.spent ?? 0), 0);
  const totalPct   = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const handleAddBudget = async () => {
    const limit = parseInt(String(addForm.limit).replace(/\D/g, ''), 10);
    if (!addForm.category || !limit || limit <= 0) return;
    track('Budget:addBudget', { category: addForm.category, limit });
    setSaving(true);
    try {
      // putBudget menyimpan ke backend, dan membuat anggaran baru bila belum ada
      await putBudget(addForm.category, limit, period);
      refetchBdg();
      showToast(`Anggaran ${addForm.category} berhasil ditambahkan`);
      setShowAddForm(false);
      setAddForm({ category: '', limit: '' });
    } catch (err) {
      showToast(err.message ?? 'Anggaran gagal disimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLimit = async () => {
    const limit = parseInt(newLimit.replace(/\D/g, ''), 10);
    if (!limit || limit <= 0) return;
    setSaving(true);
    track('Budget:updateLimit', { category: editingCategory, limit });
    try {
      await putBudget(editingCategory, limit, period);
      refetchBdg();
      showToast(`Anggaran ${editingCategory} diperbarui`);
      setEditingCategory(null);
      setNewLimit('');
    } catch (err) {
      showToast(err.message ?? 'Anggaran gagal diperbarui', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Keuangan</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Anggaran</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Bulan
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white"
            />
          </label>
          {availableCats.length > 0 && (
            <Button onClick={() => { setAddForm({ category: availableCats[0].name, limit: '' }); setShowAddForm(true); }}>
              + Tambah Anggaran
            </Button>
          )}
        </div>
      </div>

      {/* Ringkasan total */}
      <Card padding="p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Terpakai</p>
            <p className="text-2xl font-bold text-slate-900">{formatRupiah(totalSpent)}</p>
            <p className="text-xs text-slate-400 mt-0.5">dari {formatRupiah(totalLimit)} ({totalPct}%)</p>
          </div>
          <span className="text-3xl font-black text-slate-100">{totalPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(totalPct, 100)}%`,
              backgroundColor: totalPct >= 90 ? '#EF4444' : totalPct >= 75 ? '#F59E0B' : '#10B981',
            }} />
        </div>
      </Card>

      {/* Daftar kategori */}
      <div className="space-y-3">
        {bdgs.map(b => {
          // nilai turunan dipakai apa adanya dari backend: usagePercent, status, dan remaining
          const pct      = Number(b.usagePercent ?? 0);
          const isOver   = b.status === 'lewat batas' || pct >= 100;
          const isWarn   = b.status === 'perhatian' || pct >= 80;
          const barColor = isOver ? '#EF4444' : isWarn ? '#F59E0B' : b.color;
          const sisa     = Number(b.remaining ?? Math.max(Number(b.limit ?? 0) - Number(b.spent ?? 0), 0));

          return (
            <Card key={b.category} padding="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: b.color + '20' }}>
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-slate-900 text-sm">{b.category}</p>
                    {/* ternary → badge status */}
                    {isOver ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Terlampaui</span>
                    ) : isWarn ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Hampir habis</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>{formatRupiah(b.spent)} terpakai</span>
                    <span>Sisa {formatRupiah(sisa)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Limit: {formatRupiah(b.limit)}</span>
                    <button
                      onClick={() => { setEditingCategory(b.category); setNewLimit(String(b.limit)); }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                      Edit limit
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal tambah anggaran baru */}
      {showAddForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6"
            style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 32px 64px -12px' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">Tambah Anggaran</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Kategori</label>
                <select value={addForm.category}
                  onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-slate-400">
                  {availableCats.map(c => (
                    <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Limit per Bulan (Rp)</label>
                <input type="text" value={addForm.limit} autoFocus
                  onChange={e => setAddForm({ ...addForm, limit: e.target.value })}
                  placeholder="cth: 500000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowAddForm(false)}>Batal</Button>
                <Button fullWidth onClick={handleAddBudget}
                  disabled={saving || !addForm.category || !addForm.limit}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit limit */}
      {editingCategory && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6"
            style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 32px 64px -12px' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">Edit Limit Anggaran</h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 text-xl">×</button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Kategori: <strong>{editingCategory}</strong></p>
            <div className="mb-5">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Limit Baru (Rp)</label>
              <input type="text" value={newLimit}
                onChange={e => setNewLimit(e.target.value)}
                placeholder="0" autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setEditingCategory(null)}>Batal</Button>
              <Button fullWidth disabled={saving} onClick={handleSaveLimit}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
