import { useMemo } from "react";
import { useFetch } from "../hooks/useFetch";

export default function Dashboard({ session, household }) {
  const { data: txs, loading } = useFetch("transactions", {});
  const { data: categories } = useFetch("categories", {});

  const stats = useMemo(() => {
    if (!txs) return { income: 0, expense: 0, net: 0, byMember: {} };
    const income = txs.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
    const byMember = {};
    txs.filter((t) => t.type === "expense").forEach((t) => { byMember[t.memberId] = (byMember[t.memberId] || 0) + t.amount; });
    return { income, expense, net: income - expense, byMember };
  }, [txs]);

  const fmt = (n) => "Rp " + n.toLocaleString("id-ID");
  const recentTxs = [...(txs || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  if (loading) return <div className="p-10 text-center text-kf-muted">Memuat...</div>;

  return (
    <div className="min-h-screen bg-kf-bg pb-24">
      <div className="px-5 pt-6 pb-4"><h1 className="text-2xl font-bold text-kf-text">keluargafin</h1></div>

      <div className="mx-5 bg-[#F4D0C4] rounded-2xl p-6 mb-6">
        <p className="text-sm text-kf-muted mb-2">SALDO BULAN INI</p>
        <h2 className="text-3xl font-bold text-kf-text mb-4">{fmt(stats.net)}</h2>
        <div className="flex gap-4">
          <div><p className="text-xs text-kf-muted">Pemasukan</p><p className="text-lg font-semibold text-green-600">+{fmt(stats.income)}</p></div>
          <div className="border-l border-gray-300 pl-4"><p className="text-xs text-kf-muted">Pengeluaran</p><p className="text-lg font-semibold text-red-600">-{fmt(stats.expense)}</p></div>
        </div>
      </div>

      <div className="mx-5 bg-white rounded-2xl p-5 shadow-kf mb-6">
        <h3 className="text-xs font-semibold text-kf-muted mb-4">ANGGOTA KELUARGA</h3>
        {household?.members.map((m, i) => (
          <div key={m.id} className="flex items-center justify-between mb-3 last:mb-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-kf-text ${i === 0 ? 'bg-avatar-ayah' : i === 1 ? 'bg-avatar-ibu' : 'bg-avatar-anak'}`}>
                {m.name.charAt(0)}
              </div>
              <p className="font-medium text-kf-text">{m.name}</p>
            </div>
            <p className="font-semibold text-kf-text">{fmt(stats.byMember[m.id] || 0)}</p>
          </div>
        ))}
      </div>

      <div className="mx-5 bg-white rounded-2xl p-5 shadow-kf">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-semibold text-kf-muted">TRANSAKSI TERBARU</h3>
        </div>
        {recentTxs.map((tx) => {
          const cat = categories?.find((c) => c.id === tx.categoryId);
          const member = household?.members.find((m) => m.id === tx.memberId);
          return (
            <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${tx.categoryId === 'c_makan' ? 'bg-cat-makan' : 'bg-cat-lain'}`}>
                  {cat?.icon || "📦"}
                </div>
                <div>
                  <p className="font-semibold text-kf-text text-sm">{tx.merchant || cat?.name}</p>
                  <p className="text-xs text-kf-muted">{member?.name} · {tx.date}</p>
                </div>
              </div>
              <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-kf-text'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}