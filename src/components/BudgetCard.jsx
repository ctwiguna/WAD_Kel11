// Materi: ternary → status budget, empty state, conditional render

export default function BudgetCard({ budget, spent }) {
  const remaining = budget.amount - spent;
  const pct = Math.min(100, Math.round((spent / budget.amount) * 100));

  // Materi: ternary untuk status
  const status =
    pct >= 100 ? "over" : pct >= 80 ? "warning" : "safe";

  const statusColor =
    status === "over"
      ? "bg-red-500"
      : status === "warning"
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex justify-between mb-2">
        <p className="font-medium">{budget.categoryName}</p>
        {/* Materi: ternary conditional render */}
        <span className={`text-xs px-2 py-0.5 rounded text-white ${statusColor}`}>
          {status === "over" ? "Over" : status === "warning" ? "Hampir habis" : "Aman"}
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div className={`h-2 rounded-full ${statusColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>Rp {spent.toLocaleString("id-ID")} / Rp {budget.amount.toLocaleString("id-ID")}</span>
        {/* Materi: ternary status budget */}
        <span>{remaining >= 0 ? `Sisa Rp ${remaining.toLocaleString("id-ID")}` : "Over budget"}</span>
      </div>
    </div>
  );
}