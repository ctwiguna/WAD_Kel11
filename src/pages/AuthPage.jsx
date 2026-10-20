// AuthPage, halaman masuk dan daftar lewat Supabase Auth.
// Setelah masuk berhasil, onLogin dari App.jsx dipanggil untuk menyiapkan sesi lapisan data.

import { useState } from 'react';
import { supabase, supabaseSiap } from '../lib/supabase';

export default function AuthPage({ onLogin, initialError = '' }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState('');

  // Masuk. Pesan error dari Supabase ditampilkan apa adanya, kalau berhasil lanjut ke onLogin.
  const handleLogin = async () => {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) throw authError;
    await onLogin();
  };

  // Daftar. Nama keluarga ikut disimpan sebagai metadata akun supaya tidak hilang
  // selama menunggu verifikasi email.
  const handleRegister = async () => {
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { household_name: householdName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    if (authError) throw authError;

    // Saat verifikasi email aktif, Supabase tidak mengirim error untuk email yang sudah
    // terdaftar. Tandanya daftar identities pada user kosong.
    if (data.user?.identities?.length === 0) {
      throw new Error('Email ini sudah terdaftar. Silakan masuk dengan email tersebut.');
    }

    // Tanpa sesi berarti akun perlu diverifikasi lewat email lebih dulu.
    if (!data.session) {
      setMode('login');
      setPassword('');
      setInfo(
        `Pendaftaran berhasil. Tautan verifikasi sudah dikirim ke ${email.trim()}. ` +
          'Buka tautan itu, lalu masuk dengan email dan kata sandi yang sama.'
      );
      return;
    }

    // Verifikasi email dimatikan di proyek Supabase, jadi sesi langsung aktif.
    await onLogin();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') await handleLogin();
      else await handleRegister();
    } catch (err) {
      // Tanpa respons sama sekali dari Supabase, misalnya internet putus atau URL salah
      const noResponse = err?.name === 'AuthRetryableFetchError' && !err?.status;
      setError(
        noResponse
          ? 'Tidak bisa menghubungi server autentikasi. Periksa koneksi internet, lalu coba lagi.'
          : err?.message || 'Terjadi kesalahan, silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Masuk dengan Google belum disambungkan ke Supabase, jadi tombolnya hanya memberi tahu.
  const handleGoogle = () => {
    setError('');
    setInfo('Masuk dengan Google belum tersedia. Silakan masuk dengan email dan kata sandi.');
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setInfo('');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">💰</div>
            <span className="text-white font-bold text-xl">KeluargaFin</span>
          </div>
          <h1 className="text-white font-extrabold text-5xl leading-tight tracking-tight mb-6">
            Kelola keuangan<br />keluarga dengan<br />bijak.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-xs">
            Catat pengeluaran, pantau anggaran, dan capai tujuan finansial keluarga Anda bersama.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: '📊', text: 'Dashboard ringkasan bulanan' },
            { icon: '💼', text: 'Anggaran per kategori' },
            { icon: '🎯', text: 'Target tabungan keluarga' },
            { icon: '📤', text: 'Ekspor laporan CSV' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-white/70 text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-[440px] p-8 bg-white"
          style={{ borderRadius: '20px', boxShadow: 'rgba(0,0,0,0.4) 0px 32px 80px -12px' }}
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-lg">💰</div>
            <span className="font-bold text-slate-900 text-lg">KeluargaFin</span>
          </div>

          <h2 className="text-slate-900 font-bold text-2xl tracking-tight mb-1">
            {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {mode === 'login' ? 'Masukkan email dan kata sandi Anda' : 'Mulai kelola keuangan keluarga Anda'}
          </p>

          {/* Pengingat untuk pengembang bila berkas .env.local belum diisi */}
          {!supabaseSiap && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800">
              Supabase belum diatur. Salin .env.example menjadi .env.local, isi VITE_SUPABASE_URL dan
              VITE_SUPABASE_ANON_KEY, lalu jalankan ulang npm run dev.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
                {error}
              </div>
            )}

            {info && (
              <div role="status" className="px-4 py-3 rounded-xl border border-blue-100 bg-blue-50 text-sm text-blue-700">
                {info}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Keluarga</label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="cth: Keluarga Budi Santoso"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
                  Lupa kata sandi?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#0F172A' }}
            >
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-slate-400">atau</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full py-3 rounded-xl border border-slate-200 font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Masuk dengan Google
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-slate-900 hover:underline"
            >
              {mode === 'login' ? 'Daftar gratis' : 'Masuk'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
