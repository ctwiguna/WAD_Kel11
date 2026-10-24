// Alur data: Reports memakai getReportsCashflow, getReportsCategories, dan getReportsMembers
// dari getData.js. Token dan household_id diambil dari sesi di dalam modul itu, dan pemetaan
// nama kolom backend dilakukan adapter. Halaman hanya menampilkan hasilnya.

import { useState } from 'react';
import Card from '../components/Card';
import { useFetch } from '../hooks/useFetch';
import {
  getReportsCashflow,
  getReportsCategories,
  getReportsMembers,
  exportReportsCsv,
  getCategories,
  getMembers,
} from '../API/getData';
import { track } from '../utils/analytics';
import { formatRupiah } from '../data/mockData';

const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const roleAvatar = { ayah: '👨', ibu: '👩', anak: '🧒' };

// tanggal ISO panjang, contoh 2026-10-23
function keTanggal(d) {
  const bulan = String(d.getMonth() + 1).padStart(2, '0');
  const hari = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${bulan}-${hari}`;
}

// Rentang dua belas bulan terakhir, dipakai grafik tren dan daftar pilihan periode.
function rentangDuaBelasBulan() {
  const kini = new Date();
  const awal = new Date(kini.getFullYear(), kini.getMonth() - 11, 1);
  return { dari: keTanggal(awal), sampai: keTanggal(kini) };
}

// Satu bulan penuh, contoh 2026-10 menjadi 2026-10-01 sampai 2026-10-31.
function rentangSatuBulan(bulan) {
  const [tahun, nomor] = bulan.split('-').map(Number);
  const akhir = new Date(tahun, nomor, 0);
  return { dari: `${bulan}-01`, sampai: keTanggal(akhir) };
}

function labelBulan(bulan) {
  const [tahun, nomor] = String(bulan).split('-');
  const nama = months[Number(nomor) - 1];
  return nama ? `${nama} ${tahun}` : String(bulan);
}

// Label pendek untuk sumbu grafik, contoh Okt 26
function labelPendek(bulan) {
  const [tahun, nomor] = String(bulan).split('-');
  const nama = months[Number(nomor) - 1];
  if (!nama) return String(bulan);
  return `${nama.slice(0, 3)} ${String(tahun).slice(2)}`;
}

// Komponen batang grafik tren bulanan
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

  const duaBelas = rentangDuaBelasBulan();
  const rentang = period === 'all' ? duaBelas : rentangSatuBulan(period);

  track('Reports:render');

  // Grafik tren dan daftar periode selalu memakai dua belas bulan terakhir.
  const { data: cashflow, loading: loadCash, error: errCash } = useFetch(
    () => getReportsCashflow(duaBelas.dari, duaBelas.sampai),
    [duaBelas.dari, duaBelas.sampai]
  );

  // Kategori dan anggota mengikuti periode yang dipilih.
  const { data: categories, loading: loadCat } = useFetch(
    () => getReportsCategories(rentang.dari, rentang.sampai),
    [rentang.dari, rentang.sampai]
  );

  const { data: members, loading: loadMember } = useFetch(
    () => getReportsMembers(rentang.dari, rentang.sampai),
    [rentang.dari, rentang.sampai]
  );

  // Ikon dan warna kategori, serta avatar anggota, diambil dari daftar master.
  const { data: masterKategori } = useFetch(getCategories);
  const { data: daftarAnggota } = useFetch(getMembers);

  const handleExportCSV = async () => {
    try {
      track('Reports:exportCSV', { dari: rentang.dari, sampai: rentang.sampai });
      await exportReportsCsv(rentang.dari, rentang.sampai);
    } catch (err) {
      alert('Gagal mengekspor CSV: ' + (err.message || err));
    }
  };

  if (loadCash || loadCat || loadMember) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Memuat data...</p>
      </div>
    </div>
  );

  if (errCash) return <Card><p className="text-red-500 text-sm">⚠️ {errCash}</p></Card>;

  const barisCashflow = cashflow ?? [];
  const bulanIni = new Date().toISOString().slice(0, 7);

  // Angka ringkasan dijumlahkan dari baris arus kas backend, bukan dari daftar transaksi.
  const terpilih = period === 'all' ? barisCashflow : barisCashflow.filter(r => r.month === period);
  const totalIncome = terpilih.reduce((s, r) => s + Number(r.income ?? 0), 0);
  const totalExpense = terpilih.reduce((s, r) => s + Number(r.expense ?? 0), 0);
  const totalSaving = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((totalSaving / totalIncome) * 100) : 0;

  const chartData = barisCashflow.slice(-6).map(r => ({ ...r, isCurrent: r.month === bulanIni }));
  const maxVal = Math.max(...chartData.map(d => Math.max(Number(d.income) || 0, Number(d.expense) || 0)), 1);

  // Pilihan periode diambil dari bulan yang benar-benar ada di data.
  const pilihanPeriode = barisCashflow.map(r => r.month).filter(Boolean).sort();

  // Peta ikon dan warna kategori dari daftar master, bukan dari data contoh.
  const metaKategori = {};
  (masterKategori ?? []).forEach(c => { metaKategori[c.name] = c; });

  // Peta avatar anggota dari peran di daftar master.
  const avatarAnggota = {};
  (daftarAnggota ?? []).forEach(m => { avatarAnggota[m.name] = roleAvatar[m.roleRaw] ?? '👤'; });

  const daftarKategori = categories ?? [];
  const daftarMember = members ?? [];
  const totalSemuaMember = daftarMember.reduce((s, x) => s + Number(x.total ?? 0), 0);

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
        {pilihanPeriode.map(p => (
          <option key={p} value={p}>{labelBulan(p)}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pemasukan',   value: formatRupiah(totalIncome),  color: '#10B981' },
          { label: 'Pengeluaran', value: formatRupiah(totalExpense), color: '#EF4444' },
          { label: 'Tabungan',    value: formatRupiah(totalSaving),  color: totalSaving >= 0 ? '#3B82F6' : '#EF4444' },
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
                <Bar key={d.month || i} label={labelPendek(d.month)} income={Number(d.income) || 0}
                  expense={Number(d.expense) || 0} maxVal={maxVal} isCurrentMonth={d.isCurrent} />
              ))
            )}
          </div>
        </Card>

        <Card padding="p-6">
          <h2 className="font-bold text-slate-900 mb-5">Komposisi Pengeluaran</h2>
          {daftarKategori.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada transaksi pengeluaran.</p>
          ) : (
            <div className="space-y-4">
              {daftarKategori.slice(0, 6).map(cat => {
                const meta = metaKategori[cat.category] ?? {};
                const icon = meta.icon || '📦';
                const color = meta.color || '#94A3B8';
                const pct = Number(cat.pct) || 0;

                return (
                  <div key={cat.category || cat.categoryId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{icon}</span>
                        <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{pct}%</span>
                        <span className="text-sm font-semibold text-slate-900">{formatRupiah(cat.spent)}</span>
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
                {['Anggota','Pengeluaran','Porsi'].map((h, i) => (
                  <th key={h} className={`text-xs font-semibold uppercase tracking-wider text-slate-400 pb-3 ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {daftarMember.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400">Tidak ada data anggota.</td>
                </tr>
              ) : (
                daftarMember.map((m) => {
                  const porsi = totalSemuaMember > 0
                    ? Math.round((Number(m.total ?? 0) / totalSemuaMember) * 100)
                    : 0;
                  return (
                    <tr key={m.name || m.memberId}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{avatarAnggota[m.name] ?? '👤'}</span>
                          <span className="font-medium text-slate-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold text-red-500">
                        {Number(m.total) > 0 ? formatRupiah(m.total) : '-'}
                      </td>
                      <td className="py-3 text-right text-slate-500">{porsi}%</td>
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
