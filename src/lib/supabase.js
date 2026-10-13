// Klien Supabase untuk seluruh aplikasi frontend.
// Nilainya dibaca dari berkas .env.local di akar repo. Salin .env.example lebih dulu.
//
// Berkas ini hanya dipakai untuk pendaftaran dan masuk. Setelah masuk, tokennya
// diserahkan ke lapisan data lewat setSession supaya setiap permintaan ke backend
// membawa header Authorization. Alur data halaman tetap lewat getData.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const terpasang = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!terpasang) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Salin berkas .env.example menjadi .env.local, isi nilainya, lalu jalankan ulang npm run dev. ' +
      'Selama belum diisi, aplikasi hanya bisa berjalan pada mode demo.'
  );
}

// Key pengganti supaya createClient tidak berhenti saat berkas .env.local belum ada.
// Selama berkas itu belum diisi, pendaftaran dan masuk akan gagal dengan pesan jaringan.
const URL_DIPAKAI = terpasang ? SUPABASE_URL : 'https://placeholder.supabase.co';
const KEY_DIPAKAI = terpasang ? SUPABASE_ANON_KEY : 'placeholder';

export const supabase = createClient(URL_DIPAKAI, KEY_DIPAKAI, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'kf_sesi',
  },
});

export const supabaseSiap = terpasang;

// Sesi yang sedang aktif, dipakai halaman masuk dan halaman pembuka.
export async function sesiAktif() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data?.session ?? null;
}

// Token akses yang sedang aktif. Dipakai lapisan data untuk header Authorization.
export async function tokenAktif() {
  const sesi = await sesiAktif();
  return sesi?.access_token ?? null;
}

export async function keluar() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
