import { useState } from 'react';
import { transactions, budgets, formatRupiah } from '../data/mockData';

const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

const chartData = [
  { label: 'Agu', income: 18000000, expense: 9500000 },
  { label: 'Sep', income: 20000000, expense: 11200000 },
  { label: 'Okt', income: 19500000, expense: 10800000 },
  { label: 'Nov', income: 21000000, expense: 12000000 },
  { label: 'Des', income: 22000000, expense: 14500000 },
  { label: 'Jan', income: totalIncome, expense: totalExpense },
];
const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)));

function Bar({ label, income, expense }) {
  const incPct = maxVal > 0 ? (income / maxVal) * 100 : 0;
  const expPct = maxVal > 0 ? (expense / maxVal) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 min-w-[40px]">
      <div className="flex items-end gap-0.5 h-32">
        <div className="w-3 rounded-t-sm bg-emerald-400 transition-all" style={{ height: `${incPct}%` }} />
        <div className="w-3 rounded-t-sm bg-red-400 transition-all" style={{ height: `${expPct}%` }} />
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('2024-01');

  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const byCategory = budgets
    .map(b => ({ ...b, pct: Math.round((b.spent / totalExpense) * 100) }))
    .sort((a, b) => b.spent - a.spent);

  const handleExportCSV = () => {
    const header = 'Tanggal,Jenis,Jumlah,Kategori,Anggota,Merchant,Catatan,Rekening\n';
    const rows = transactions.map(t =>
      `${t.date},${t.type},${t.amount},${t.category},${t.member},${t.merchant},"${t.notes}",${t.account}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keluargafin_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Analisis</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan Keuangan</h1>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>📤</span> Ekspor CSV
        </button>
      </div>

      {/* Period selector */}
      <select
        value={period}
        onChange={e => setPeriod(e.target.value)}
        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none"
      >
        {['2024-01', '2023-12', '2023-11', '2023-10'].map(p => {
          const [y, m] = p.split('-');
          return <option key={p} value={p}>{months[parseInt(m) - 1]} {y}</option>;
        })}
      </select>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pemasukan', value: formatRupiah(totalIncome), color: '#10B981' },
          { label: 'Pengeluaran', value: formatRupiah(totalExpense), color: '#EF4444' },
          { label: 'Tabungan', value: formatRupiah(totalIncome - totalExpense), color: '#3B82F6' },
          { label: 'Rasio Hemat', value: `${savingsRate}%`, color: savingsRate >= 20 ? '#10B981' : '#F59E0B' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{k.label}</p>
            <p className="text-xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
          <h2 className="font-bold text-slate-900 mb-2">Tren 6 Bulan Terakhir</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /><span className="text-xs text-slate-500">Pemasukan</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /><span className="text-xs text-slate-500">Pengeluaran</span></div>
          </div>
          <div className="flex items-end gap-4 pb-2 overflow-x-auto">
            {chartData.map(d => <Bar key={d.label} label={d.label} income={d.income} expense={d.expense} />)}
          </div>
        </div>

        {/* Komposisi kategori */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
          <h2 className="font-bold text-slate-900 mb-5">Komposisi Pengeluaran</h2>
          <div className="space-y-3">
            {byCategory.slice(0, 6).map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-sm text-slate-700">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{cat.pct}%</span>
                    <span className="text-sm font-semibold text-slate-900">{formatRupiah(cat.spent)}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabel per anggota */}
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
        <h2 className="font-bold text-slate-900 mb-5">Ringkasan per Anggota</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 pb-3">Anggota</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400 pb-3">Pemasukan</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400 pb-3">Pengeluaran</th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400 pb-3">Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { name: 'Ayah', avatar: '👨' },
                { name: 'Ibu', avatar: '👩' },
                { name: 'Anak', avatar: '🧒' },
              ].map(({ name, avatar }) => {
                const inc = transactions.filter(t => t.member === name && t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const exp = transactions.filter(t => t.member === name && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                const count = transactions.filter(t => t.member === name).length;
                return (
                  <tr key={name}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{avatar}</span>
                        <span className="font-medium text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-600">{inc > 0 ? formatRupiah(inc) : '—'}</td>
                    <td className="py-3 text-right font-semibold text-red-500">{exp > 0 ? formatRupiah(exp) : '—'}</td>
                    <td className="py-3 text-right text-slate-500">{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
