import { useState, useEffect } from 'react';
import { 
  getProfile, putProfile, getMembers, postMember, deleteMember,
  getAccounts, postAccount, deleteAccount, getHouseholds, putHousehold
} from '../API/getData';
import { track } from '../utils/analytics';

import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profil');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState(null);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [editProfile, setEditProfile] = useState({ fullName: '', avatar: '' });
  const [editHousehold, setEditHousehold] = useState({ name: '' });
  const [newMember, setNewMember] = useState({ name: '', role: 'anak', email: '' });
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', balance: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, h, m, a] = await Promise.all([
        getProfile(),
        getHouseholds().then(res => res[0] || null),
        getMembers(),
        getAccounts()
      ]);
      setProfile(p); setHousehold(h); setMembers(m); setAccounts(a);
      if (p) setEditProfile({ fullName: p.fullName, avatar: p.avatar });
      if (h) setEditHousehold({ name: h.name });
    } catch (err) { setError('Gagal memuat data.'); } 
    finally { setIsLoading(false); }
  };

  const handleSaveProfile = async () => {
    try { await putProfile(editProfile); setSuccess('Profil diperbarui'); setTimeout(() => setSuccess(''), 3000); } 
    catch (err) { setError(err.message); }
  };

  const handleSaveHousehold = async () => {
    if (!household) return;
    try { 
      await putHousehold(household.id, { name: editHousehold.name }); 
      setHousehold({ ...household, name: editHousehold.name }); 
      setSuccess('Nama rumah tangga diubah'); setTimeout(() => setSuccess(''), 3000); 
    } catch (err) { setError(err.message); }
  };

  // PERBAIKAN 3: Tambah anggota dengan email, validasi UUID
  const handleAddMember = async () => {
    if (!newMember.name.trim()) return setError('Nama anggota wajib diisi');
    if (!newMember.email.trim()) return setError('Email anggota wajib diisi');
    
    setError('');
    try {
      // Catatan: Untuk produksi, perlu endpoint backend untuk lookup user by email
      // Untuk sekarang, tampilkan pesan bahwa fitur ini memerlukan alur undangan
      setError('Fitur tambah anggota memerlukan alur undangan. Anggota harus mendaftar akun KeluargaFin terlebih dahulu, lalu Ayah dapat menambahkan mereka melalui email.');
      return;
      
      // Kode di bawah ini akan aktif setelah backend menyediakan endpoint lookup user
      /*
      const added = await postMember({ 
        userId: 'valid-uuid-dari-backend', // Akan diisi setelah lookup
        name: newMember.name, 
        roleRaw: newMember.role, 
        canApproveBudget: newMember.role !== 'anak' 
      });
      setMembers([...members, added]); 
      setNewMember({ name: '', role: 'anak', email: '' }); 
      setSuccess('Anggota ditambahkan');
      */
    } catch (err) { 
      setError(err.message); 
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Yakin ingin mengeluarkan anggota ini?')) return;
    try { await deleteMember(id); setMembers(members.filter(m => m.id !== id)); setSuccess('Anggota dikeluarkan'); } 
    catch (err) { setError(err.message); }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name.trim()) return;
    try {
      const added = await postAccount({ name: newAccount.name, type: newAccount.type, balance: newAccount.balance || 0 });
      setAccounts([...accounts, added]); setNewAccount({ name: '', type: 'bank', balance: '' }); setSuccess('Dompet ditambahkan');
    } catch (err) { setError(err.message); }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Yakin ingin menghapus dompet ini?')) return;
    try { await deleteAccount(id); setAccounts(accounts.filter(a => a.id !== id)); setSuccess('Dompet dihapus'); } 
    catch (err) { setError(err.message); }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat pengaturan...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 font-sans pb-24">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>

        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {['profil', 'rumah', 'anggota', 'dompet'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
              className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        {error && <Card className="bg-red-50 border border-red-200 text-red-700 text-sm p-4">{error}</Card>}
        {success && <Card className="bg-green-50 border border-green-200 text-green-700 text-sm p-4">{success}</Card>}

        {activeTab === 'profil' && profile && (
          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-900">Profil Pribadi</h2>
            <Input label="Email" value={profile.email} disabled className="opacity-60" />
            <Input label="Nama Lengkap" value={editProfile.fullName} onChange={(e) => setEditProfile({...editProfile, fullName: e.target.value})} />
            <Input label="Emoji Avatar" value={editProfile.avatar} onChange={(e) => setEditProfile({...editProfile, avatar: e.target.value})} placeholder="😊" maxLength={2} />
            <div className="flex justify-end mt-2"><Button variant="primary" onClick={handleSaveProfile}>Simpan Perubahan</Button></div>
          </Card>
        )}

        {activeTab === 'rumah' && household && (
          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-900">Pengaturan Rumah Tangga</h2>
            <Input label="Nama Rumah Tangga" value={editHousehold.name} onChange={(e) => setEditHousehold({...editHousehold, name: e.target.value})} />
            <div className="flex justify-end mt-2"><Button variant="primary" onClick={handleSaveHousehold}>Simpan Nama</Button></div>
          </Card>
        )}

        {activeTab === 'anggota' && (
          <div className="flex flex-col gap-4">
            <Card className="p-6 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-900">Tambah Anggota Baru</h2>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-lg">
                <strong>Catatan:</strong> Anggota harus memiliki akun KeluargaFin terlebih dahulu. Fitur undangan akan ditambahkan pada iterasi berikutnya.
              </div>
              <Input label="Nama" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} placeholder="Nama anggota" />
              <Input label="Email" value={newMember.email} onChange={(e) => setNewMember({...newMember, email: e.target.value})} placeholder="email@contoh.com" type="email" />
              <div className="flex gap-3 items-end">
                <select value={newMember.role} onChange={(e) => setNewMember({...newMember, role: e.target.value})} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-800 flex-1 mb-0.5">
                  <option value="ayah">Ayah</option><option value="ibu">Ibu</option><option value="anak">Anak</option>
                </select>
              </div>
              <div className="flex justify-end"><Button variant="primary" onClick={handleAddMember}>Tambah Anggota</Button></div>
            </Card>
            <div className="flex flex-col gap-3">
              {members.map(member => (
                <Card key={member.id} className="flex justify-between items-center p-4">
                  <div><p className="text-sm font-semibold text-slate-900">{member.name}</p><p className="text-xs text-slate-500 capitalize">{member.roleRaw}</p></div>
                  {member.roleRaw !== 'ayah' && <Button variant="danger" onClick={() => handleDeleteMember(member.id)}>Keluarkan</Button>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dompet' && (
          <div className="flex flex-col gap-4">
            <Card className="p-6 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-900">Tambah Dompet Baru</h2>
              <Input label="Nama Dompet" value={newAccount.name} onChange={(e) => setNewAccount({...newAccount, name: e.target.value})} placeholder="Misal: BCA / Tunai" />
              <div className="flex gap-3 items-end">
                <select value={newAccount.type} onChange={(e) => setNewAccount({...newAccount, type: e.target.value})} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-800 flex-1 mb-0.5">
                  <option value="bank">Bank</option><option value="ewallet">E-Wallet</option><option value="cash">Tunai</option>
                </select>
                <Input label="Saldo Awal" type="number" value={newAccount.balance} onChange={(e) => setNewAccount({...newAccount, balance: e.target.value})} placeholder="0" className="w-40" />
              </div>
              <div className="flex justify-end"><Button variant="primary" onClick={handleAddAccount}>Tambah Dompet</Button></div>
            </Card>
            <div className="flex flex-col gap-3">
              {accounts.map(acc => (
                <Card key={acc.id} className="flex justify-between items-center p-4">
                  <div><p className="text-sm font-semibold text-slate-900">{acc.name}</p><p className="text-xs text-slate-500 capitalize">{acc.type} • Rp {acc.balance.toLocaleString('id-ID')}</p></div>
                  <Button variant="danger" onClick={() => handleDeleteAccount(acc.id)}>Hapus</Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;