import { useState, useMemo } from "react";
import { useFetch } from "../hooks/useFetch";
import { postData } from "../API/getData";
import { track } from "../lib/analytics";

const getCategoryBg = (catId) => {
  const map = { c_makan: "bg-cat-makan", c_transport: "bg-cat-transport", c_belanja: "bg-cat-belanja", c_tagihan: "bg-cat-tagihan", c_anak: "bg-cat-anak", c_hiburan: "bg-cat-hiburan", c_kesehatan: "bg-cat-kesehatan" };
  return map[catId] || "bg-cat-lain";
};

export default function Transactions({ household }) {
  const { data: txs, refetch } = useFetch("transactions", {});
  const { data: categories } = useFetch("categories", {});

  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "expense", amount: "", merchant: "", categoryId: "c_makan", memberId: household?.members[0]?.id || "m_ayah", date: new Date().toISOString().slice(0, 10) });

  const fmt = (n) => "Rp " + n.toLocaleString("id-ID");

  const filteredTxs = useMemo(() => {
    if (!txs) return [];
    let result = [...txs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filterType === "expense") result = result.filter((t) => t.type === "expense");
    if (filterType === "income") result = result.filter((t) => t.type === "income");
    return result;
  }, [txs, filterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.merchant) return;
    const member = household?.members.find((m) => m.id === form.memberId);
    try {
      await postData("transaction", { ...form, amount: parseInt(form.amount, 10), memberName: member?.name || "Ayah" });
      track("transaction_created", { type: form.type });
      setForm({ type: "expense", amount: "", merchant: "", categoryId: "c_makan", memberId: household?.members[0]?.id, date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      refetch();
    } catch (err) { alert("Gagal menyimpan: " + err.message); }
  };

  return (
    <div className="min-h-screen bg-kf-bg pb-32">
      <div className="px-5 pt-6 pb-4"><h1 className="text-2xl font-bold text-kf-text">Transaksi</h1></div>

      <div className="px-5 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {["all", "expense", "income"].map((tab) => (
            <button key={tab} onClick={() => setFilterType(tab)} className={`px-4 py-2 rounded-full text-sm font-semibold ${filterType === tab ? "bg-kf-primary text-white shadow-kf" : "bg-white text-kf-muted border border-gray-200"}`}>
              {tab === "all" ? "Semua" : tab === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-5 bg-white rounded-2xl shadow-kf overflow-hidden mb-6">
        {filteredTxs.length === 0 ? <div className="p-8 text-center text-kf-muted text-sm">Tidak ada transaksi.</div> : filteredTxs.map((tx) => {
          const cat = categories?.find((c) => c.id === tx.categoryId);
          const member = household?.members.find((m) => m.id === tx.memberId);
          return (
            <div key={tx.id} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${getCategoryBg(tx.categoryId)} flex items-center justify-center text-2xl`}>{cat?.icon}</div>
                <div>
                  <p className="font-semibold text-kf-text">{tx.merchant}</p>
                  <p className="text-xs text-kf-muted">{member?.name} · {tx.date}</p>
                </div>
              </div>
              <p className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-kf-text'}`}>{tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}</p>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-5 z-10">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowForm(true)} className="bg-kf-primary text-white py-3.5 rounded-xl font-semibold shadow-kf">✏️ Catat Manual</button>
          <button className="bg-white text-kf-text py-3.5 rounded-xl font-semibold shadow-kf border border-gray-200">📷 Upload Struk</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-kf-text">Catat Transaksi</h3>
              <button onClick={() => setShowForm(false)} className="text-2xl text-kf-muted">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {["expense", "income", "transfer"].map((type) => (
                  <button key={type} type="button" onClick={() => setForm({ ...form, type })} className={`py-2 rounded-lg text-sm font-semibold ${form.type === type ? "bg-kf-primary text-white" : "bg-gray-100 text-kf-muted"}`}>
                    {type === "expense" ? "Keluar" : type === "income" ? "Masuk" : "Transfer"}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Nominal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" required />
              <input type="text" placeholder="Merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" required />
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary">
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary">
                {household?.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-semibold bg-gray-100">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-white bg-kf-primary shadow-kf">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}