export default function TransactionItem({ tx, categories }) {
  const cat = categories.find((c) => c.id === tx.categoryId);
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{cat?.icon || "📦"}</span>
        <div>
          <p className="font-medium text-gray-800">
            {tx.merchant || cat?.name || "Transaksi"}
          </p>
          <p className="text-xs text-gray-500">
            {tx.memberName} • {tx.date}
          </p>
        </div>
      </div>
      <p
        className={`font-semibold ${
          isIncome ? "text-green-600" : isTransfer ? "text-blue-600" : "text-red-600"
        }`}
      >
        {isIncome ? "+" : isTransfer ? "↔" : "-"} Rp{" "}
        {tx.amount.toLocaleString("id-ID")}
      </p>
    </div>
  );
}