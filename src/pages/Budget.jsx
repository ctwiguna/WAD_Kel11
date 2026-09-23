import { useState, useMemo } from "react";
import { useFetch } from "../hooks/useFetch";
import { postData } from "../API/getData";

export default function Budget({ household }) {
  const { data: budgets, refetch } = useFetch("budgets", {});
  const { data: categories } = useFetch("categories", {});
  const { data: txs } = useFetch("transactions", {});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: "c_makan", amount: "" });

  const spentByCategory = useMemo(() => {
    const map = {};
    (txs || []).filter((t) => t.type === "expense").forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + t.amount; });
    return map;
  }, [txs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === form.categoryId);
    await postData("budget", { categoryId: form.categoryId, categoryName: cat.name, amount: parseInt(form.amount, 10) });
    setForm({ categoryId: "c_makan", amount: "" });
    setShowForm(false);
    refetch();
  };

  const fmt = (n) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="min-h-screen bg-kf-bg pb-24">
      <div className="px-5 pt-6 pb-4"><h1 className="text-2xl font-bold text-kf-text">Budget Bulanan</h1></div>
      
      <div className="px-5 mb-4">
        <button onClick={() => setShowForm(!showForm)} className="w-full bg-kf-primary text-white py-3 rounded-xl font-semibold shadow-kf">+ Tambah Budget</button>
      </div>

      {showForm && (
        <div className="mx-5 bg-white rounded-2xl p-5 shadow-kf mb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3">
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <input type="number" placeholder="Nominal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3" required />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-semibold bg-gray-100">Batal</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-white bg-kf-primary">Simpan</button>
            </div>
          </form>
        </div>
      )}

      <div className="px-5 space-y-4">
        {(!budgets || budgets.length === 0) ? <div className="bg-white rounded-2xl p-8 text-center shadow-kf text-kf-muted">Belum ada budget.</div> : budgets.map((b) => {
          const spent = spentByCategory[b.categoryId] || 0;
          const pct = Math.min(100, Math.round((spent / b.amount) * 100));
          const status = pct >= 100 ? "over" : pct >= 80 ? "warning" : "safe";
          const color = status === "over" ? "bg-red-500" : status === "warning" ? "bg-yellow-500" : "bg-green-500";
          return (
            <div key={b.id} className="bg-white rounded-2xl p-5 shadow-kf">
              <div className="flex justify-between mb-2"><h4 className="font-bold">{b.categoryName}</h4><span className={`text-xs px-2 py-1 rounded-full text-white ${color}`}>{status === 'over' ? 'Over' : status === 'warning' ? 'Hampir' : 'Aman'}</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2"><div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }}></div></div>
              <div className="flex justify-between text-sm text-kf-muted"><span>{fmt(spent)} / {fmt(b.amount)}</span><span>Sisa {fmt(b.amount - spent)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}