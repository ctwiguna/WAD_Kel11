import { useState } from "react";
import { useFetch } from "../hooks/useFetch";
import { postData } from "../API/getData";
import { track } from "../lib/analytics";

const getGoalColor = (index) => ["bg-[#F4D0C4]", "bg-[#D4C4F4]", "bg-[#C4E4D4]", "bg-[#F4E4C4]"][index % 4];

export default function Goals({ household }) {
  const { data: goals, refetch } = useFetch("goals", {});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", target: "", targetDate: "" });

  const fmt = (n) => "Rp " + n.toLocaleString("id-ID");
  const totalSaved = (goals || []).reduce((sum, g) => sum + (g.current || 0), 0);
  const totalTarget = (goals || []).reduce((sum, g) => sum + (g.target || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.target || !form.targetDate) return;
    try {
      await postData("goal", {
        householdId: household?.id || "default",
        name: form.name,
        target: parseInt(form.target, 10),
        targetDate: form.targetDate,
        current: 0,
      });
      track("goal_created", { name: form.name });
      setForm({ name: "", target: "", targetDate: "" });
      setShowForm(false);
      refetch();
    } catch (err) {
      alert("Gagal: " + err.message);
    }
  };

  const handleAddFunds = async (goalId, goalName) => {
    // Debug: cek apakah fungsi terpanggil
    console.log("handleAddFunds called with goalId:", goalId);
    
    const amount = prompt(`Masukkan nominal tabungan untuk "${goalName}":`);
    
    if (!amount) {
      console.log("User cancelled prompt");
      return;
    }
    
    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Nominal tidak valid!");
      return;
    }

    try {
      console.log("Calling postData with:", { goalId, amount: amountNum });
      await postData("goal-contribution", { goalId, amount: amountNum });
      track("goal_contribution", { goalId, amount: amountNum });
      refetch();
      alert(`Berhasil menambah Rp ${fmt(amountNum)} ke ${goalName}`);
    } catch (err) {
      console.error("Error adding funds:", err);
      alert("Gagal menambah dana: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-kf-bg pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-kf-text">Target Tabungan</h1>
      </div>

      <div className="mx-5 bg-[#D4E4D4] rounded-2xl p-6 mb-6 text-center">
        <p className="text-sm font-semibold text-green-800 mb-2">TOTAL TERKUMPUL</p>
        <h2 className="text-3xl font-bold text-green-900">{fmt(totalSaved)}</h2>
        <p className="text-sm text-green-700">dari {fmt(totalTarget)} target</p>
      </div>

      <div className="px-5 mb-6">
        <h3 className="text-xs font-semibold text-kf-muted mb-4">TARGET AKTIF</h3>
        {(!goals || goals.length === 0) ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-kf">
            <p className="text-kf-muted mb-4">Belum ada target tabungan</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-kf-primary text-white px-6 py-3 rounded-xl font-semibold shadow-kf"
            >
              + Buat Target Baru
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, index) => {
              const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
              return (
                <div key={goal.id} className={`${getGoalColor(index)} rounded-2xl p-5 shadow-kf relative`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-kf-text text-lg">{goal.name}</h4>
                      <p className="text-xs text-kf-muted">Target: {goal.targetDate}</p>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full">
                      <span className="text-sm font-bold">{pct}%</span>
                    </div>
                  </div>
                  
                  <div className="bg-white/50 rounded-full h-2 mb-3">
                    <div className="bg-kf-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between mb-4">
                    <p className="font-bold text-lg">{fmt(goal.current)}</p>
                    <p className="text-sm text-kf-muted">{fmt(goal.target)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        console.log("Tambah Dana clicked for goal:", goal.id);
                        handleAddFunds(goal.id, goal.name);
                      }}
                      className="bg-kf-primary text-white py-3 rounded-xl font-semibold shadow-kf hover:bg-kf-primary-dark transition active:scale-95 relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      Tambah Dana
                    </button>
                    <button
                      onClick={() => alert(`Detail ${goal.name}\n\nTarget: ${fmt(goal.target)}\nTerkumpul: ${fmt(goal.current)}\nProgress: ${pct}%`)}
                      className="bg-white text-kf-text py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition active:scale-95 relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      Detail
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-5 text-kf-muted font-semibold hover:border-kf-primary hover:text-kf-primary transition"
            >
              + Buat Target Tabungan Baru
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-kf-text">Buat Target Baru</h3>
              <button onClick={() => setShowForm(false)} className="text-2xl text-kf-muted">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Nama target" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" required />
              <input type="number" placeholder="Target nominal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" required />
              <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:outline-none focus:border-kf-primary" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-semibold bg-gray-100">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-white bg-kf-primary shadow-kf">Buat Target</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}