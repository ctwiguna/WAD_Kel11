import { useState } from 'react';
import { track } from '../utils/analytics';

import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

// PERBAIKAN 1 & 2: Pakai onDone, HAPUS useNavigate/react-router-dom
const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [householdName, setHouseholdName] = useState('');
  const [members, setMembers] = useState([{ name: '', role: 'ayah' }]);
  const [budgets, setBudgets] = useState([{ category: 'Makanan', limit: '' }]);
  const [goals, setGoals] = useState([{ name: '', target: '' }]);

  const handleNext = () => {
    if (step === 1 && !householdName.trim()) return setError('Nama rumah tangga wajib diisi');
    if (step === 2 && members.some(m => !m.name.trim())) return setError('Nama anggota wajib diisi');
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) { setStep(step - 1); setError(''); }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    track('onboarding_submit_started');

    try {
      // PERBAIKAN 3 & 4: HAPUS semua postHousehold/postMember di sini.
      // Onboarding HANYA mengumpulkan data, App.jsx (handleOnboardingDone) yang akan memanggil API.
      
      const payload = {
        household: {
          name: householdName,
          currency: 'IDR',
          monthlyStartDay: 1
        },
        members: members.map(m => ({
          name: m.name,
          role: m.role,
          canApproveBudget: m.role === 'ayah' || m.role === 'ibu',
          // PERBAIKAN 5: userId diisi null, bukan 'pending_auth_link'. 
          // App.jsx atau backend yang akan mengisi userId user yang sedang login untuk peran 'ayah'.
          userId: null 
        })),
        budgets: budgets
          .filter(b => b.limit && Number(b.limit) > 0)
          .map(b => ({ category: b.category, limit: Number(b.limit) })),
        goals: goals
          .filter(g => g.name.trim() && g.target && Number(g.target) > 0)
          .map(g => ({ name: g.name, target: Number(g.target) }))
      };

      track('onboarding_data_collected');
      
      // PERBAIKAN 1: Panggil onDone, serahkan navigasi dan API call ke App.jsx
      if (onDone) {
        onDone(payload);
      }

    } catch (err) {
      setError(err.message || 'Gagal menyimpan data.');
      track('onboarding_submit_failed', { message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const updateArrayItem = (setter, array, index, field, value) => {
    const newArr = [...array];
    newArr[index][field] = value;
    setter(newArr);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 font-sans">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex gap-2 justify-center mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 w-10 rounded-full transition-colors ${s <= step ? 'bg-slate-800' : 'bg-slate-200'}`} />
          ))}
        </div>

        {error && (
          <Card className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
            {error}
          </Card>
        )}

        {step === 1 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nama Rumah Tangga</h2>
            <p className="text-sm text-slate-500 mb-6">Sebutkan nama keluarga atau rumah tangga Anda.</p>
            <Input label="Nama Rumah Tangga" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Contoh: Keluarga Besar" />
            <div className="flex gap-3 mt-8 justify-end">
              <Button variant="outline" onClick={handleNext}>Lanjut</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Anggota Keluarga</h2>
            <p className="text-sm text-slate-500 mb-6">Siapa saja yang akan menggunakan KeluargaFin?</p>
            <div className="flex flex-col gap-4">
              {members.map((member, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <Input label="Nama Tampilan" value={member.name} onChange={(e) => updateArrayItem(setMembers, members, index, 'name', e.target.value)} placeholder="Misal: Ayah / Budi" className="flex-1" />
                  <select value={member.role} onChange={(e) => updateArrayItem(setMembers, members, index, 'role', e.target.value)} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-800 w-32 mb-0.5">
                    <option value="ayah">Ayah</option>
                    <option value="ibu">Ibu</option>
                    <option value="anak">Anak</option>
                  </select>
                  {members.length > 1 && <Button variant="danger" onClick={() => setMembers(members.filter((_, i) => i !== index))}>Hapus</Button>}
                </div>
              ))}
              <Button variant="outline" onClick={() => setMembers([...members, { name: '', role: 'anak' }])}>+ Tambah Anggota Lain</Button>
            </div>
            <div className="flex gap-3 mt-8 justify-between">
              <Button variant="ghost" onClick={handleBack}>Kembali</Button>
              <Button variant="primary" onClick={handleNext}>Lanjut</Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Anggaran Bulan Ini</h2>
            <p className="text-sm text-slate-500 mb-6">Tentukan batas pengeluaran per kategori (opsional).</p>
            <div className="flex flex-col gap-4">
              {budgets.map((budget, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <select value={budget.category} onChange={(e) => updateArrayItem(setBudgets, budgets, index, 'category', e.target.value)} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-800 flex-1 mb-0.5">
                    <option value="Makanan">Makanan & Minuman</option>
                    <option value="Tagihan">Tagihan & Utilitas</option>
                    <option value="Transportasi">Transportasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  <Input label="Batas (Rp)" type="number" value={budget.limit} onChange={(e) => updateArrayItem(setBudgets, budgets, index, 'limit', e.target.value)} placeholder="0" className="w-40" />
                  <Button variant="danger" onClick={() => setBudgets(budgets.filter((_, i) => i !== index))}>✕</Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setBudgets([...budgets, { category: 'Lainnya', limit: '' }])}>+ Tambah Kategori</Button>
            </div>
            <div className="flex gap-3 mt-8 justify-between">
              <Button variant="ghost" onClick={handleBack}>Kembali</Button>
              <Button variant="primary" onClick={handleNext}>Lanjut</Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tujuan Menabung</h2>
            <p className="text-sm text-slate-500 mb-6">Apa yang ingin keluarga capai? (opsional)</p>
            <div className="flex flex-col gap-4">
              {goals.map((goal, index) => (
                <div key={index} className="flex flex-col gap-3 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <Input label="Nama Tujuan" value={goal.name} onChange={(e) => updateArrayItem(setGoals, goals, index, 'name', e.target.value)} placeholder="Misal: Dana Darurat" />
                  <div className="flex gap-3 items-end">
                    <Input label="Target (Rp)" type="number" value={goal.target} onChange={(e) => updateArrayItem(setGoals, goals, index, 'target', e.target.value)} placeholder="0" className="flex-1" />
                    <Button variant="danger" onClick={() => setGoals(goals.filter((_, i) => i !== index))}>Hapus</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setGoals([...goals, { name: '', target: '' }])}>+ Tambah Tujuan Baru</Button>
            </div>
            <div className="flex gap-3 mt-8 justify-between">
              <Button variant="ghost" onClick={handleBack}>Kembali</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Selesai'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;