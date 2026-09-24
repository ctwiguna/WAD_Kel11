import { useState } from 'react';

export default function Settings() {
  const [householdName, setHouseholdName] = useState('Keluarga Budi Santoso');
  const [inviteEmail, setInviteEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const members = [
    { id: '1', name: 'Budi Santoso', role: 'Ayah', email: 'budi@gmail.com', avatar: '👨' },
    { id: '2', name: 'Sari Santoso', role: 'Ibu', email: 'sari@gmail.com', avatar: '👩' },
    { id: '3', name: 'Dinda Santoso', role: 'Anak', email: '', avatar: '🧒' },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Konfigurasi</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan</h1>
      </div>

      {/* Informasi keluarga */}
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
          <span>🏠</span> Informasi Keluarga
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nama Keluarga / Rumah Tangga</label>
            <input
              type="text"
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-all"
            style={{ backgroundColor: saved ? '#10B981' : '#0F172A' }}
          >
            {saved ? '✓ Tersimpan' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Anggota keluarga */}
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
          <span>👨‍👩‍👧</span> Anggota Keluarga
        </h2>
        <div className="space-y-3 mb-6">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                <p className="text-xs text-slate-400">{m.role}{m.email ? ` · ${m.email}` : ' · Tanpa akun'}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 shrink-0">
                {m.role}
              </span>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Undang Anggota via Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@contoh.com"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors"
            />
            <button
              onClick={() => setInviteEmail('')}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-opacity shrink-0"
              style={{ backgroundColor: '#0F172A' }}
            >
              Undang
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Undangan akan dikirim ke email tersebut untuk bergabung.</p>
        </div>
      </div>

      {/* Rekening */}
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
          <span>💳</span> Rekening & Dompet
        </h2>
        <div className="space-y-2 mb-4">
          {[
            { name: 'BCA Utama', icon: '🏦' },
            { name: 'Mandiri Tabungan', icon: '🏦' },
            { name: 'Tunai', icon: '💵' },
            { name: 'GoPay', icon: '🟢' },
            { name: 'OVO', icon: '🟣' },
          ].map((acc) => (
            <div key={acc.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-base">{acc.icon}</span>
                <span className="text-sm font-medium text-slate-800">{acc.name}</span>
              </div>
              <button className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Edit</button>
            </div>
          ))}
        </div>
        <button className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          + Tambah Rekening
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl p-6 border border-red-100" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
        <h2 className="font-bold text-red-600 mb-4 flex items-center gap-2">
          <span>⚠️</span> Zona Berbahaya
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Hapus semua data keluarga ini secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <button className="px-5 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
          Hapus Data Keluarga
        </button>
      </div>
    </div>
  );
}
