// Input, komponen formulir standar

const Input = ({ label, error, className = '', type = 'text', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      <input
        type={type}
        className={`h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none transition-all focus:border-slate-800 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400 disabled:opacity-50 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default Input;