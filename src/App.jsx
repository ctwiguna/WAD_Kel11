// App.jsx → shell utama, kirim props ke semua halaman

import { useEffect, useRef, useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import QuickAdd from './components/QuickAdd';
import { track } from './utils/analytics';
import { supabase } from './lib/supabase';
import {
  setSession,
  clearSession,
  infoSesi,
  getProfile,
  getHouseholds,
  postHousehold,
  getMembers,
  getCategories,
  getAccounts,
} from './API/getData';
import QAPanel from './components/QAPanel';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// props → navItems dikirim ke sidebar (semua halaman)
const navItems = [
  { id: 'dashboard',    label: 'Dashboard',   icon: '📊' },
  { id: 'transactions', label: 'Transaksi',    icon: '💸' },
  { id: 'budget',       label: 'Anggaran',     icon: '📋' },
  { id: 'goals',        label: 'Tujuan',       icon: '🎯' },
  { id: 'reports',      label: 'Laporan',      icon: '📈' },
  { id: 'settings',     label: 'Pengaturan',   icon: '⚙️' },
];

// bottom nav mobile: 2 kiri | FAB + | 2 kanan (tanpa Settings)
const bottomNavLeft  = [navItems[0], navItems[1]]; // Dashboard, Transaksi
const bottomNavRight = [navItems[2], navItems[3]]; // Anggaran, Tujuan

// props → user dikirim ke halaman yang butuh info user
const defaultUser = {
  name: 'Budi Santoso',
  email: 'budi@gmail.com',
  household: 'Keluarga Santoso',
  avatar: '👨',
};

// Ikon cadangan bila profil belum punya avatar, mengikuti peran di rumah tangga
const roleAvatar = { ayah: '👨', ibu: '👩', anak: '🧒' };

// Salinan data sesi milik App. Dipakai lagi saat token Supabase diperbarui.
const emptySession = { token: null, profile: null, household: null, members: [], categories: [], accounts: [] };

const pages = {
  dashboard:    Dashboard,
  transactions: Transactions,
  budget:       Budget,
  goals:        Goals,
  reports:      Reports,
  settings:     Settings,
};

// Layar tunggu, dipakai saat memeriksa sesi tersimpan dan saat menyimpan rumah tangga
function LoadingScreen({ message, overlay = false }) {
  return (
    <div
      className={`${overlay ? 'fixed inset-0 z-50' : 'min-h-screen'} flex items-center justify-center`}
      style={{ backgroundColor: overlay ? 'rgba(248,250,252,0.85)' : '#F8FAFC' }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed]             = useState(false);
  const [checking, setChecking]         = useState(true);  // memeriksa sesi tersimpan saat aplikasi dibuka
  const [authNotice, setAuthNotice]     = useState('');    // pesan untuk AuthPage, misalnya sesi berakhir
  const [onboarded, setOnboarded]       = useState(false); // diisi setelah masuk: sudah punya rumah tangga atau belum
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [page, setPage]                 = useState('dashboard');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [user, setUser]                 = useState(defaultUser); // props → dikirim ke halaman
  const sessionRef = useRef({ ...emptySession });
  const savingRef  = useRef(false);

  // Nama, email, rumah tangga, dan avatar untuk sidebar dan halaman, semuanya dari backend
  const buildUser = () => {
    const { profile, household } = sessionRef.current;
    const info = infoSesi();
    return {
      name: info.displayName || profile?.fullName || profile?.email || '',
      email: profile?.email ?? '',
      household: household?.name ?? '',
      avatar: profile?.avatar || roleAvatar[info.role] || '👤',
    };
  };

  // Anggota, kategori, dan dompet rumah tangga aktif. getData ikut menyimpannya ke sesi.
  const loadLists = async () => {
    const [members, categories, accounts] = await Promise.all([getMembers(), getCategories(), getAccounts()]);
    Object.assign(sessionRef.current, { members, categories, accounts });
  };

  // Rumah tangga aktif dipilih oleh getHouseholds. Tanpa rumah tangga, daftar lain belum bisa dimuat.
  const loadHousehold = async () => {
    const households = await getHouseholds();
    const household = households.find((h) => h.id === infoSesi().householdId) ?? null;
    sessionRef.current.household = household;
    if (household) await loadLists();
    return household;
  };

  // Mengisi sesi getData dari sesi Supabase, lalu memuat data dasar supaya sesi lengkap.
  const startSession = async (session) => {
    const token = session.access_token;
    sessionRef.current = { ...emptySession, token };
    setSession({ token, userId: session.user?.id });
    try {
      sessionRef.current.profile = await getProfile();
      const household = await loadHousehold();
      setUser(buildUser());
      setOnboarded(Boolean(household));
      setAuthNotice('');
      setAuthed(true);
    } catch (err) {
      // Kembali ke keadaan belum masuk supaya halaman tidak jalan dengan sesi setengah jadi
      clearSession();
      sessionRef.current = { ...emptySession };
      throw new Error(`Data akun gagal dimuat. ${err.message}`);
    }
  };

  // Supabase memperbarui token sendiri sebelum kedaluwarsa. Token baru diteruskan ke getData
  // tanpa mengganti rumah tangga aktif, lalu daftar dimuat ulang di belakang layar.
  const refreshToken = (token) => {
    const current = sessionRef.current;
    const { userId, householdId } = infoSesi();
    current.token = token;
    setSession({
      token,
      userId,
      householdId,
      members: current.members,
      categories: current.categories,
      accounts: current.accounts,
    });
    if (householdId) {
      loadLists().catch((err) => console.warn('[auth] Gagal memuat ulang data sesi:', err.message));
    }
  };

  const endSession = (message) => {
    clearSession();
    sessionRef.current = { ...emptySession };
    setAuthed(false);
    setAuthNotice(message);
  };

  useEffect(() => {
    let active = true;

    // Sesi Supabase tersimpan di localStorage, jadi muat ulang halaman tidak perlu masuk lagi
    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new Error('Sesi sebelumnya tidak bisa dipulihkan, silakan masuk kembali.');
        if (active && data?.session && !sessionRef.current.token) await startSession(data.session);
      } catch (err) {
        if (active) setAuthNotice(err.message);
      } finally {
        if (active) setChecking(false);
      }
    };
    restoreSession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const current = sessionRef.current;
      if (!current.token) return; // belum masuk, alur masuk diurus handleLogin
      if (event === 'SIGNED_OUT') {
        endSession('Sesi berakhir, silakan masuk kembali.');
        return;
      }
      if (!session) return;
      if (session.user?.id !== infoSesi().userId) {
        window.location.reload(); // akun lain masuk dari tab lain
        return;
      }
      if (session.access_token !== current.token) refreshToken(session.access_token);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Dipanggil AuthPage setelah signInWithPassword berhasil
  const handleLogin = async () => {
    track('App:login');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data?.session) throw new Error('Sesi tidak ditemukan, silakan masuk kembali.');
    await startSession(data.session);
  };

  const handleLogout = async () => {
    track('App:logout');
    clearSession();
    sessionRef.current = { ...emptySession };
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('[auth] Gagal keluar dari Supabase:', error.message);
    // window.location.assign → redirect ke halaman awal
    window.location.assign('/');
  };

  // Onboarding masih menyimpan isiannya ke localStorage. Rumah tangga di backend dibuat
  // di sini bila belum ada, lalu datanya dimuat supaya sesi lengkap.
  const handleOnboardingDone = async ({ household }) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingHousehold(true);
    setOnboardingError('');
    track('Onboarding:done', { household });
    try {
      if (!infoSesi().householdId) await postHousehold({ name: household.trim() });
      const saved = await loadHousehold();
      if (!saved) throw new Error('Rumah tangga belum terbaca dari server, silakan coba lagi.');
      setUser(buildUser());
      setOnboarded(true);
    } catch (err) {
      setOnboardingError(err.message);
    } finally {
      savingRef.current = false;
      setSavingHousehold(false);
    }
  };

  const handleNavigate = (id) => {
    track('App:navigate', { to: id });
    setPage(id);
    setSidebarOpen(false);
  };

  if (checking) return <LoadingScreen message="Memuat sesi..." />;

  // ternary → tampilkan AuthPage jika belum login
  if (!authed) return <AuthPage onLogin={handleLogin} initialError={authNotice} />;

  // ternary → tampilkan Onboarding jika belum setup household
  if (!onboarded) return (
    <>
      <Onboarding onDone={handleOnboardingDone} />
      {savingHousehold && <LoadingScreen message="Menyimpan rumah tangga..." overlay />}
      {onboardingError && (
        <div role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          Rumah tangga gagal disimpan. {onboardingError}
        </div>
      )}
    </>
  );

  const PageComponent = pages[page];

  return (
    <ToastProvider>
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '240px', backgroundColor: '#0F172A' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">💰</div>
          <div>
            <p className="text-white font-bold text-base leading-tight">KeluargaFin</p>
            {/* props → nama household dari state user */}
            <p className="text-white/40 text-xs">{user.household}</p>
          </div>
        </div>

        {/* Nav, map navItems */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={{
                // ternary → highlight halaman aktif
                backgroundColor: page === item.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                color:           page === item.id ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info, props user */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} title="Keluar"
              className="text-white/30 hover:text-white/70 transition-colors text-sm">
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Konten utama */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-slate-100 sticky top-0 z-30"
          style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 1px 8px' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <span className="font-bold text-slate-900 text-sm">KeluargaFin</span>
          </div>
          <div className="w-9 h-9" />
        </header>

        {/* Halaman, props user dikirim ke PageComponent */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <PageComponent user={user} />
        </main>

        {/* Bottom nav: Dashboard | Transaksi | [+] | Anggaran | Laporan */}
        <nav className="lg:hidden flex items-center border-t border-slate-100 bg-white sticky bottom-0 z-30">
          {bottomNavLeft.map((item) => (
            <button key={item.id} onClick={() => handleNavigate(item.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors"
              style={{ color: page === item.id ? '#0F172A' : '#94A3B8' }}>
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => { track('App:quickAdd'); setQuickAddOpen(true); }}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-light -mt-5 transition-transform active:scale-95"
              style={{ backgroundColor: '#0F172A', boxShadow: 'rgba(15,23,42,0.35) 0px 8px 24px -4px' }}>
              +
            </button>
          </div>
          {bottomNavRight.map((item) => (
            <button key={item.id} onClick={() => handleNavigate(item.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors"
              style={{ color: page === item.id ? '#0F172A' : '#94A3B8' }}>
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Quick Add Modal */}
      {quickAddOpen && <QuickAdd onClose={() => setQuickAddOpen(false)} onNavigate={handleNavigate} />}

      {/* QA Panel, muncul di pojok bawah (development only) */}
      <QAPanel />
    </div>
    </ToastProvider>
  );
}
