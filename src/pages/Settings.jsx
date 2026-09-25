// Alur data: Settings → getCategories → localStorage → tampilan

import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getCategories, postCategory, putCategory } from '../API/getData';
import { track } from '../utils/analytics';

const colorOptions = ['#F59E0B','#3B82F6','#EC4899','#8B5CF6','#10B981','#F97316','#06B6D4','#EF4444','#94A3B8','#0F172A'];
const iconOptions  = ['🍽️','🚗','🛍️','📚','💊','💡','🎬','📦','✈️','🏠','💰','🎁','🐾','💄','🏋️','📱','☕','🌿','🎮','💻'];

export default function Settings() {
  const [householdName, setHouseholdName] = useState('Keluarga Budi Santoso');
  const [inviteEmail, setInviteEmail]     = useState('');
  const [saved, setSaved]                 = useState(false);

  // state form kategori baru
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm]         = useState({ name: '', icon: '📦', color: '#94A3B8' });
  const [catSaving, setCatSaving]     = useState(false);

  const { data: categories, loading: loadCat, refetch: refetchCat } = useFetch(getCategories);

  const handleSave = () => {
    track('Settings:saveHousehold');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    track('Settings:addCategory', { name: catForm.name });
    await postCategory({ name: catForm.name.trim(), icon: catForm.icon, color: catForm.color, archived: false });
    refetchCat();
    setCatSaving(false);
    setShowCatForm(false);
    setCatForm({ name: '', icon: '📦', color: '#94A3B8' });
  };

  const handleToggleArchive = async (cat) => {
    track('Settings:toggleArchive', { name: cat.name, archived: !cat.archived });
    await putCategory(cat.name, { archived: !cat.archived });
    refetchCat();
  };

  const cats        = categories ?? [];
  const activeCats  = cats.filter(c => !c.archived);
  const archivedCats = cats.filter(c => c.archived);

  const members = [
    { id: '1', name: 'Budi Santoso',  role: 'Ayah', email: 'budi@gmail.com', avatar: '👨' },
    { id: '2', name: 'Sari Santoso',  role: 'Ibu',  email: 'sari@gmail.com', avatar: '👩' },
    { id: '3', name: 'Dinda Santoso', role: 'Anak', email: '',               avatar: '🧒' },
  ];

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
            <input type="text" value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
          </div>
          <button onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-all"
            style={{ backgroundColor: saved ? '#10B981' : '#0F172A' }}>
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
          {members.map(m => (
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
            <input type="email" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@contoh.com"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
            <button onClick={() => setInviteEmail('')}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-opacity shrink-0"
              style={{ backgroundColor: '#0F172A' }}>
              Undang
            </button>
          </div>
        </div>
      </div>

      {/* Kategori custom */}
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 4px 20px -4px' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <span>🏷️</span> Kategori Transaksi
          </h2>
          <button onClick={() => setShowCatForm(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#0F172A' }}>
            + Kategori Baru
          </button>
        </div>

        {loadCat ? (
          <p className="text-sm text-slate-400 text-center py-4">Memuat...</p>
        ) : (
          <>
            <div className="space-y-2">
              {activeCats.map(cat => (
                <div key={cat.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: cat.color + '20' }}>
                    {cat.icon}
                  </div>
                  <span className="text-sm font-medium text-slate-800 flex-1">{cat.name}</span>
                  <button onClick={() => handleToggleArchive(cat)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1">
                    Arsipkan
                  </button>
                </div>
              ))}
            </div>

            {archivedCats.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Diarsipkan</p>
                <div className="space-y-2">
                  {archivedCats.map(cat => (
                    <div key={cat.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 opacity-50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: cat.color + '20' }}>
                        {cat.icon}
                      </div>
                      <span className="text-sm font-medium text-slate-500 flex-1 line-through">{cat.name}</span>
                      <button onClick={() => handleToggleArchive(cat)}
                        className="text-xs text-slate-400 hover:text-emerald-500 transition-colors px-2 py-1">
                        Pulihkan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
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
          ].map(acc => (
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

      {/* Modal tambah kategori */}
      {showCatForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6"
            style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 32px 64px -12px' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Kategori Baru</h3>
              <button onClick={() => setShowCatForm(false)} className="text-slate-400 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nama Kategori</label>
                <input type="text" value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="cth: Hobi, Perawatan" required autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 transition-colors" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(ico => (
                    <button key={ico} type="button"
                      onClick={() => setCatForm({ ...catForm, icon: ico })}
                      className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                      style={{ backgroundColor: catForm.icon === ico ? '#0F172A' : '#F1F5F9' }}>
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Warna</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(col => (
                    <button key={col} type="button"
                      onClick={() => setCatForm({ ...catForm, color: col })}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: col,
                        borderColor: catForm.color === col ? '#0F172A' : 'transparent',
                        transform: catForm.color === col ? 'scale(1.2)' : 'scale(1)',
                      }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: catForm.color + '20' }}>
                  {catForm.icon}
                </div>
                <span className="text-sm font-medium text-slate-800">
                  {catForm.name || 'Nama kategori...'}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCatForm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={catSaving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-80 transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#0F172A' }}>
                  {catSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
