import { useState, useEffect } from 'react';
import Card from '../components/Card';
import { track } from '../utils/analytics';
import { formatRupiah } from '../data/mockData';
import {
  getReportsCashflow,
  getReportsCategories,
  getReportsMembers,
  exportReportsCsv,
} from '../services/reports';

const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function Bar({ label, income, expense, maxVal, isCurrentMonth }) {
  const incPct = maxVal > 0 ? (income / maxVal) * 100 : 0;
  const expPct = maxVal > 0 ? (expense / maxVal) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-2 min-w-[44px]">
      <div className="flex items-end gap-1 h-32">
        <div className="w-4 rounded-t-md transition-all"
          style={{ height: `${incPct}%`, backgroundColor: isCurrentMonth ? '#10B981' : '#A7F3D0' }} />
        <div className="w-4 rounded-t-md transition-all"
          style={{ height: `${expPct}%`, backgroundColor: isCurrentMonth ? '#EF4444' : '#FECACA' }} />
      </div>
      <span className={`text-xs font-medium ${isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('all');
  const [cashflow, setCashflow] = useState(null);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  track('Reports:render');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getReportsCashflow(period),
      getReportsCategories(period),
      getReportsMembers(period)
    ])
      .then(([cashflowData, categoriesData, membersData]) => {
        if (!isMounted) return;
        setCashflow(cashflowData);
        setCategories(categoriesData || []);
        setMembers(membersData || []);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Gagal memuat laporan dari backend.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [period]);

  const handleExportCSV = async () => {
    try {
      track('Reports:exportCSV', { period });
      await exportReportsCsv(period);
    } catch (err) {
      alert('Gagal mengekspor CSV: ' + (err.message || err));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (error) return <Card><p className="text-red-500 text-sm">⚠️ {error}</p></Card>;

  const totalIncome  = cashflow?.total_income ?? cashflow?.income ?? 0;
  const totalExpense = cashflow?.total_expense ?? cashflow?.expense ?? 0;
  const totalSaving  = cashflow?.total_saving ?? cashflow?.saving ?? (totalIncome - totalExpense);
  const savingsRate  = cashflow?.savings_rate ?? (totalIncome > 0 ? Math.round((totalSaving / totalIncome) * 100) : 0);

  const chartData = cashflow?.chart_data ?? cashflow?.monthly ?? [];
  const maxVal = Math.max(...chartData.map(d => Math.max(d.income || 0, d.expense || 0)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Analisis</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan Keuangan</h1>
        </div>
        <button onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          <span>📤</span> Ekspor CSV
        </button>
      </div>

      <select value={period} onChange={e => setPeriod(e.target.value)}
        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none">
        <option value="all">Semua Periode</option>
        {cashflow?.available_periods?.map(p => {
          const [y, m] = p.split('-');
          return <option key={p} value={p}>{months[parseInt(m) - 1]} {y}</option>;
        }) ?? (
          <option value={new Date().toISOString().slice(0, 7)}>Bulan Ini</option>
        )}
      </select>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pemasukan',   value: formatRupiah(totalIncome),  color: '#10B981' },
          { label: 'Pengeluaran', value: formatRupiah(totalExpense), color: '#EF4444' },
          { label: 'Tabungan',    value: formatRupiah(totalSaving),  color: '#3B82F6' },
          { label: 'Rasio Hemat', value: `${savingsRate}%`,          color: savingsRate >= 20 ? '#10B981' : '#F59E0B' },
        ].map(k => (
          <Card key={k.label} padding="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{k.label}</p>
            <p className="text-xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="p-6">
          <h2 className="font-bold text-slate-900 mb-2">Tren 6 Bulan Terakhir</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
              <span className="text-xs text-slate-500">Pemasukan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
              <span className="text-xs text-slate-500">Pengeluaran</span>
            </div>
          </div>
          <div className="flex items-end gap-4 pb-2 overflow-x-auto">
            {chartData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 w-full">Belum ada data tren.</p>
            ) : (
              chartData.map((d, i) => (
                <Bar key={d.label || i} label={d.label} income={d.income} expense={d.expense} maxVal={maxVal} isCurrentMonth={d.isCurrent} />
              ))
            )}
          </div>
        </Card>

        <Card padding="p-6">
          <h2 className="font-bold text-slate-900 mb-5">Komposisi Pengeluaran</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada transaksi pengeluaran.</p>
          ) : (
            <div className="space-y-4">
              {categories.slice(0, 6).map(cat => {
                const categoryName = cat.category || cat.name;
                const spent = cat.spent || cat.amount || 0;
                const pct = cat.pct || cat.percentage || 0;
                const icon = cat.icon || '📦';
                const color = cat.color || '#94A3B8';

                return (
                  <div key={categoryName}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{icon}</span>
                        <span className="text-sm font-medium text-slate-700">{categoryName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{pct}%</span>
                        <span className="text-sm font-semibold text-slate-900">{formatRupiah(spent)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card padding="p-6">
        <h2 className="font-bold text-slate-900 mb-5">Ringkasan per Anggota</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Anggota','Pemasukan','Pengeluaran','Transaksi'].map((h, i) => (
                  <th key={h} className={`text-xs font-semibold uppercase tracking-wider text-slate-400 pb-3 ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">Tidak ada data anggota.</td>
                </tr>
              ) : (
                members.map((m) => {
                  const name = m.name || m.member;
                  const avatar = m.avatar || '👤';
                  const inc = m.income ?? m.total_income ?? 0;
                  const exp = m.expense ?? m.total_expense ?? 0;
                  const count = m.count ?? m.transaction_count ?? 0;

                  return (
                    <tr key={name}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{avatar}</span>
                          <span className="font-medium text-slate-900">{name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold text-emerald-600">{inc > 0 ? formatRupiah(inc) : '-'}</td>
                      <td className="py-3 text-right font-semibold text-red-500">{exp > 0 ? formatRupiah(exp) : '-'}</td>
                      <td className="py-3 text-right text-slate-500">{count}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}