// Alur data: Dashboard → getDashboardSummary untuk angka ringkasan, lalu getTransactions,
// getBudgets, dan getMembers untuk daftar yang ditampilkan. Angka ringkasan tidak dihitung
// lagi di halaman karena backend sudah mengirimnya.

import { useFetch } from '../hooks/useFetch';
import { getDashboardSummary, getTransactions, getBudgets, getMembers, getReportsMembers } from '../API/getData';
import { track } from '../utils/analytics';
import Card from '../components/Card';
import { formatRupiah, formatDate } from '../data/mockData';

const roleAvatar = { ayah: '👨', ibu: '👩', anak: '🧒' };
const memberColors = ['#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981'];

// Nama bulan dari kunci periode backend, contoh 2026-10 menjadi Oktober 2026.
function labelBulan(periode) {
  if (!periode) return '';
  const bagian = String(periode).slice(0, 7).split('-');
  const tanggal = new Date(Number(bagian[0]), Number(bagian[1]) - 1, 1);
  if (Number.isNaN(tanggal.getTime())) return String(periode);
  return tanggal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function StatCard({ label, amount, sub, color }) {
  return (
    <Card padding="p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color }}>
        {formatRupiah(Math.abs(amount))}
      </p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </Card>
  );
}

// props → user dikirim dari App.jsx, dipakai untuk sapaan di kepala halaman
export default function Dashboard({ user }) {
  // useFetch → isi alur deps/refetch
  const { data: transactions, loading: loadTxn, error: errTxn } = useFetch(getTransactions);
  const { data: budgets, loading: loadBudget } = useFetch(getBudgets);
  const { data: summary, loading: loadSummary, error: errSummary } = useFetch(getDashboardSummary);
  const { data: members } = useFetch(getMembers);
  // pengeluaran per anggota sudah dijumlahkan backend pada rentang bulan berjalan
  const { data: memberReports } = useFetch(getReportsMembers);

  track('Dashboard:render');

  // Loading state, ternary
  if (loadTxn || loadBudget || loadSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Error state, ternary
  if (errTxn || errSummary) {
    return (
      <Card>
        <p className="text-red-500 text-sm">⚠️ Gagal memuat data: {errTxn}</p>
      </Card>
    );
  }

  const txns = transactions ?? [];
  const bdgs = budgets ?? [];

  // transaksi dibatalkan tidak ikut ditampilkan di daftar
  const activeTxns = txns.filter(t => t.status !== 'dibatalkan');

  // angka ringkasan dipakai apa adanya dari backend, tidak dihitung ulang di sini
  const totalIncome  = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const netFlow      = summary?.netFlow ?? 0;
  const bulanIni     = labelBulan(summary?.period) || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // kategori teratas memakai spent dari backend, bukan hitungan transaksi di frontend
  const categoryTotals = bdgs
    .filter(b => Number(b.spent) > 0)
    .sort((a, b) => Number(b.spent) - Number(a.spent))
    .slice(0, 4);

  // map → transaksi terbaru
  const recentTxns = [...activeTxns]
    .filter(t => t.type !== 'transfer')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);

  // notifikasi anggaran: status dan persentase sudah dihitung backend
  const budgetAlerts = bdgs
    .filter(b => Number(b.usagePercent) >= 80 || b.status === 'lewat batas')
    .sort((a, b) => Number(a.usagePercent) - Number(b.usagePercent));

  // ikon kategori diambil dari data anggaran yang sudah memuat ikon kategori
  const iconKategori = {};
  bdgs.forEach(b => { iconKategori[b.category] = b.icon; });

  // pengeluaran per anggota sudah dijumlahkan backend lewat getReportsMembers,
  // nama dan peran anggota diambil dari daftar anggota untuk tampilan
  const anggotaList = members ?? [];
  const namaAnggota = {};
  anggotaList.forEach(m => { namaAnggota[m.name] = m; });

  const anggotaTeratas = (memberReports ?? [])
    .filter(r => Number(r.exp) > 0)
    .sort((a, b) => Number(b.exp) - Number(a.exp))
    .slice(0, 3)
    .map((r, i) => ({
      nama: namaAnggota[r.name]?.role ?? r.name,
      jumlah: Number(r.exp) || 0,
      warna: memberColors[i % memberColors.length],
      avatar: roleAvatar[namaAnggota[r.name]?.roleRaw] ?? '👤',
    }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{bulanIni}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Bulan Ini</h1>
        <p className="text-xs text-slate-400 mt-1">
          Halo, {user?.name ?? 'Pengguna'}{user?.household ? ` dari ${user.household}` : ''}
        </p>
      </div>

      {/* Notifikasi anggaran, ternary + map */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map(b => {
            const isOver = Number(b.usagePercent) >= 100 || b.status === 'lewat batas';
            return (
              <div key={b.category}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{
                  backgroundColor: isOver ? '#FEF2F2' : '#FFFBEB',
                  borderColor:     isOver ? '#FECACA' : '#FDE68A',
                }}>
                <span className="text-lg shrink-0">{isOver ? '🚨' : '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: isOver ? '#991B1B' : '#92400E' }}>
                    {isOver ? 'Anggaran terlampaui' : 'Anggaran hampir habis'}: {b.category}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: isOver ? '#B91C1C' : '#B45309' }}>
                    {formatRupiah(b.spent)} dari {formatRupiah(b.limit)} ({b.usagePercent}%)
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                  style={{
                    backgroundColor: isOver ? '#FEE2E2' : '#FEF3C7',
                    color:           isOver ? '#991B1B' : '#92400E',
                  }}>
                  {b.usagePercent}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* StatCards, props */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Pemasukan" amount={totalIncome}  sub={bulanIni} color="#10B981" />
        <StatCard label="Total Pengeluaran" amount={totalExpense} sub={bulanIni} color="#EF4444" />
        <StatCard
          label="Arus Kas Bersih"
          amount={netFlow}
          sub={netFlow >= 0 ? 'Surplus bulan ini' : 'Defisit bulan ini'}
          color={netFlow >= 0 ? '#0F172A' : '#EF4444'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Kategori teratas, map */}
        <Card className="lg:col-span-2">
          <h2 className="font-bold text-slate-900 mb-5">Kategori Teratas</h2>
          {categoryTotals.length === 0 ? (
            // ternary → empty state
            <p className="text-sm text-slate-400">Belum ada data anggaran.</p>
          ) : (
            <div className="space-y-4">
              {categoryTotals.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{cat.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatRupiah(cat.spent)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(Number(cat.usagePercent) || 0, 100)}%`,
                        // ternary → warna bar berdasarkan status
                        backgroundColor: Number(cat.usagePercent) >= 90 ? '#EF4444' : Number(cat.usagePercent) >= 75 ? '#F59E0B' : cat.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{Number(cat.usagePercent) || 0}% dari {formatRupiah(cat.limit)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Transaksi terbaru, map */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">Transaksi Terbaru</h2>
          </div>
          {/* ternary → empty state */}
          {recentTxns.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-3">
              {recentTxns.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: txn.type === 'income' ? '#D1FAE5' : '#FEF2F2' }}
                  >
                    {txn.type === 'income' ? '💰' : (iconKategori[txn.category] ?? '📦')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{txn.merchant}</p>
                    <p className="text-xs text-slate-400">{txn.member} · {formatDate(txn.date)}</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0" style={{ color: txn.type === 'income' ? '#10B981' : '#EF4444' }}>
                    {txn.type === 'income' ? '+' : '-'}{formatRupiah(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Pengeluaran per anggota, map */}
      <Card>
        <h2 className="font-bold text-slate-900 mb-5">Pengeluaran per Anggota</h2>
        {anggotaTeratas.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada pengeluaran anggota bulan ini.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {anggotaTeratas.map(({ nama, avatar, warna, jumlah }) => (
              <div key={nama} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-slate-50 shrink-0">{avatar}</div>
                <div>
                  <p className="font-semibold text-slate-900">{nama}</p>
                  <p className="text-sm font-bold" style={{ color: warna }}>{formatRupiah(jumlah)}</p>
                  <p className="text-xs text-slate-400">Pengeluaran bulan ini</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
