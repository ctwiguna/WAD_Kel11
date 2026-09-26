// QuickAdd — modal pilihan metode catat transaksi cepat

import { track } from '../utils/analytics';

const methods = [
  {
    id: 'scan',
    icon: '📷',
    label: 'Scan Struk',
    desc: 'Ambil foto struk belanja untuk dicatat otomatis',
    bg: '#EFF6FF',
    color: '#3B82F6',
    border: '#BFDBFE',
  },
  {
    id: 'gallery',
    icon: '🖼️',
    label: 'Upload Galeri',
    desc: 'Pilih foto struk dari galeri ponselmu',
    bg: '#F0FDF4',
    color: '#10B981',
    border: '#A7F3D0',
  },
  {
    id: 'manual',
    icon: '✏️',
    label: 'Input Manual',
    desc: 'Isi detail transaksi secara langsung',
    bg: '#F8FAFC',
    color: '#0F172A',
    border: '#E2E8F0',
  },
];

export default function QuickAdd({ onClose, onNavigate }) {
  const handleMethod = (id) => {
    track('QuickAdd:method', { method: id });
    if (id === 'manual') {
      onClose();
      onNavigate('transactions');
    } else {
      alert(`Fitur "${id === 'scan' ? 'Scan Struk' : 'Upload Galeri'}" akan segera hadir!`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center lg:items-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
        style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 32px 64px -12px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between px-6 pt-3 pb-5">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Catat Transaksi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pilih metode pencatatan</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm hover:bg-slate-200 transition-colors"
          >
            x
          </button>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => handleMethod(m.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]"
              style={{ backgroundColor: m.bg, borderColor: m.border }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: m.color + '20' }}
              >
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{m.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.desc}</p>
              </div>
              <span className="text-slate-300 text-lg shrink-0">›</span>
            </button>
          ))}
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}