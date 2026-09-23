import { useState, useMemo } from "react";
import { useFetch } from "../hooks/useFetch";

export default function Laporan({ household }) {
  const { data: txs } = useFetch("transactions", {});
  const [selectedMonth] = useState("Sep 2026");
  const fmt = (n) => "Rp " + n.toLocaleString("id-ID");

  const stats = useMemo(() => {
    if (!txs) return { income: 0, expense: 0, byCategory: {}, byMember: {} };
    const income = txs.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
    const byCategory = {};
    const byMember = {};
    txs.filter((t) => t.type === "expense").forEach((t) => {
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
      byMember[t.memberId] = (byMember[t.memberId] || 0) + t.amount;
    });
    return { income, expense, byCategory, byMember };
  }, [txs]);

  return (
    <div className="min-h-screen bg-kf-bg pb-24">
      <div className="px-5 pt-6 pb-4"><h1 className="text-2xl font-bold text-kf-text">Laporan</h1></div>
      
      <div className="px-5 mb-6 flex justify-center gap-2">
        {["Jul 2026", "Agu 2026", "Sep 2026"].map((m) => (
          <button key={m} className={`px-4 py-2 rounded-full text-sm font-semibold ${m === selectedMonth ? "bg-kf-primary text-white" : "bg-white text-kf-muted border"}`}>{m}</button>
        ))}
      </div>

      <div className="px-5 grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#D4E4D4] rounded-2xl p-4"><p className="text-xs font-semibold text-green-800">PEMASUKAN</p><p className="text-xl font-bold text-green-900">+{fmt(stats.income)}</p></div>
        <div className="bg-[#F4D0C4] rounded-2xl p-4"><p className="text-xs font-semibold text-orange-800">PENGELUARAN</p><p className="text-xl font-bold text-orange-900">-{fmt(stats.expense)}</p></div>
      </div>

      <div className="mx-5 bg-white rounded-2xl p-5 shadow-kf mb-6">
        <h3 className="text-xs font-semibold text-kf-muted mb-4">PENGELUARAN PER KATEGORI</h3>
        {Object.entries(stats.byCategory).map(([catId, amount]) => {
          const pct = Math.round((amount / stats.expense) * 100);
          return (
            <div key={catId} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <div><p className="font-semibold text-sm">{catId.replace('c_', '').toUpperCase()}</p><div className="flex gap-1 mt-1">{[0,1,2].map(i => <div key={i} className={`h-1.5 w-6 rounded-full ${pct > (i*33) ? 'bg-kf-primary' : 'bg-gray-200'}`}></div>)}</div></div>
              <div className="text-right"><p className="font-bold text-sm">{fmt(amount)}</p><p className="text-xs text-kf-muted">{pct}%</p></div>
            </div>
          );
        })}
      </div>

      <div className="mx-5 bg-[#FDF6D0] rounded-2xl p-5 shadow-kf">
        <h3 className="font-bold text-kf-text mb-1">Ekspor Laporan</h3>
        <p className="text-xs text-kf-muted mb-4">Data kamu bukan tahanan kami.</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white py-3 rounded-xl font-semibold border border-gray-200">📊 Ekspor CSV</button>
          <button className="bg-white py-3 rounded-xl font-semibold border border-gray-200"> Ekspor PDF</button>
        </div>
      </div>
    </div>
  );
}