// Materi: Card → implementasi asli + pemakaian

export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}