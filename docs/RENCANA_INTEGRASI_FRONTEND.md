# Rencana Integrasi Frontend ke Backend KeluargaFin

Dokumen acuan kontrak: `KeluargaFin_Backend_Supabase_v4_Logic_di_Backend.docx`
Berkas adapter: `src/API/adapters.js` (sudah tersedia, lulus 47 pemeriksaan pemetaan dengan node)

Tujuan berkas ini: daftar perubahan yang harus dikerjakan tim pada kode frontend supaya aplikasi memakai backend
sesuai kontrak, tanpa mengubah tampilan yang sudah jadi.

## 1. Kondisi sekarang dan target

| Aspek | Kondisi frontend sekarang | Target backend |
| --- | --- | --- |
| Sumber data | localStorage memakai kunci kf_transactions, kf_budgets, kf_goals, kf_categories, kf_accounts | Supabase Postgres lewat API backend |
| Relasi | category, member, account dikirim sebagai nama | kategori, anggota, dan dompet dikirim sebagai id UUID |
| Identitas baris | id dari String(Date.now()) | id UUID dari basis data |
| Batas data | tidak ada household_id | household_id wajib pada setiap baris dan setiap query |
| Login | AuthPage mock, menerima kredensial apa pun tanpa token | Supabase Auth, token pada header Authorization |
| Peran | teks Ayah, Ibu, Anak di halaman | household_members.role dipakai backend dan RLS |
| Anggaran | satu daftar tanpa periode, spent dihitung di klien | period_month wajib, spent dan status dikirim backend |
| Progres tujuan | dihitung di klien dari field current | saved_amount dan progress_percent dikirim backend |
| Ringkasan dashboard | dihitung di klien dari daftar transaksi | endpoint /dashboard/summary |
| Laporan dan ekspor | dihitung dan dibuat di klien | /reports/cashflow, /reports/categories, /reports/members, /reports/export.csv |

## 2. Berkas yang berubah

| Berkas | Perubahan | Saran penanggung jawab |
| --- | --- | --- |
| `src/API/adapters.js` | Berkas baru, sudah ada. Satu satunya tempat pemetaan nama field dan nama relasi ke id. | Chandra TW |
| `src/API/getData.js` | Ganti isi setiap fungsi menjadi pemanggilan fetch ke backend memakai adapter. Nama fungsi dan tanda tangan tidak berubah supaya halaman tidak perlu diubah. | Chandra TW |
| `src/utils/localStorage.js` | Dipertahankan untuk data sesi dan pengaturan QA. Simpanan data transaksi, anggaran, tujuan, kategori, dan dompet dipindahkan ke server. | Chandra TW |
| `src/pages/AuthPage.jsx` | Ganti mock login menjadi `supabase.auth.signInWithPassword`, simpan token, tampilkan pesan galat dari Supabase. | Gilang Nur Adha |
| `src/App.jsx` | Setelah login, muat profil, rumah tangga, dan anggota dari backend. Ganti penanda kf_onboarded menjadi pemeriksaan apakah rumah tangga sudah ada. | Gilang Nur Adha |
| `src/pages/Onboarding.jsx` | Empat langkah dikirim sebagai POST households, POST household_members, POST budgets, POST goals. | Nizar Hermawan |
| `src/pages/Transactions.jsx` | Kirim lewat `transactionToApi`. Hapus perhitungan lokal. Peringatan duplikat tetap dipakai sebagai peringatan sebelum kirim. | Apri Kuncoro |
| `src/components/QuickAdd.jsx` | Sama dengan Transaksi, memakai `transactionToApi`. | Apri Kuncoro |
| `src/pages/Dashboard.jsx` | Panggil /dashboard/summary dan hapus reduce dan filter lokal. | Chandra TW |
| `src/pages/Budget.jsx` | Tambah pemilih bulan, kirim period_month, tampilkan spent, usage_percent, dan status dari backend. Hapus `hitungSpentPerKategori`. | Apri Kuncoro |
| `src/pages/Goals.jsx` | Pakai saved_amount dan progress_percent dari backend, setoran lewat `contributionToApi`. | Arjuna Rangga Lengkey |
| `src/pages/Reports.jsx` | Panggil tiga endpoint laporan, hapus perhitungan grafik dan rekap lokal, ekspor memakai /reports/export.csv. | Arjuna Rangga Lengkey |
| `src/pages/Settings.jsx` | Kategori, dompet, dan data rumah tangga dibaca dan ditulis ke backend. Daftar anggota hardcoded diganti hasil GET household_members. | Nizar Hermawan |
| `src/components/QAPanel.jsx` | Tetap lokal sampai tabel events diputuskan (lihat bagian 4). | Arjuna Rangga Lengkey |
| `src/data/mockData.js` | Tetap dipakai sebagai data contoh pengujian, tidak dipakai lagi pada alur utama. | Semua anggota |

## 3. Bentuk getData.js setelah integrasi

Aturan penting: `useFetch` memanggil `fetchFn()` tanpa argumen, jadi semua fungsi di `getData.js` wajib tetap
tanpa argumen. Token dan household diambil dari penyimpanan sesi di dalam modul ini, bukan dikirim oleh halaman.
Dengan begitu halaman tidak perlu diubah dan `useFetch(getTransactions)` tetap bekerja. Pemetaan field tetap
memakai `adapters.js`.

```js
import axios from 'axios';
import { createLookups, transactionToApi, transactionListFromApi, queryString } from './adapters';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

// sesi diisi sekali saat login, dipakai semua fungsi di bawah
const sesi = { token: null, householdId: null, lookups: createLookups() };

export function setSession({ token, householdId, categories, members, accounts }) {
  sesi.token = token;
  sesi.householdId = householdId;
  sesi.lookups = createLookups({ categories, members, accounts, household: { id: householdId } });
}

const api = axios.create(); // instance tunggal, ditambah header pada tiap panggilan

function headers() {
  return sesi.token ? { Authorization: `Bearer ${sesi.token}` } : {};
}

export async function getTransactions() {
  // tanpa argumen supaya cocok dengan useFetch(getTransactions)
  const { data } = await api.get(`${BASE_URL}/transactions${queryString({ household_id: sesi.householdId })}`,
                                 { headers: headers() });
  return transactionListFromApi(data, sesi.lookups);
}

export async function postTransaction(form) {
  const payload = transactionToApi(form, sesi.lookups);
  const { data } = await api.post(`${BASE_URL}/transactions`, payload, { headers: headers() });
  return data;
}
```

Aturan yang dipegang selama integrasi:
1. Pemetaan nama field hanya boleh terjadi di `adapters.js`, tidak di halaman.
2. Tidak ada perhitungan ringkasan baru di halaman. Angka yang sudah dikirim backend dipakai apa adanya.
3. Token diambil dari sesi Supabase dan dikirim pada setiap panggilan.
4. `useFetch` yang sudah ada tetap dipakai untuk memuat daftar, ditambah keadaan galat yang menampilkan pesan dari backend.

## 4. Keputusan yang harus diambil tim sebelum minggu keempat

| Nomor | Keputusan | Pilihan | Dampak |
| --- | --- | --- | --- |
| 1 | Status transaksi (selesai, pending, dibatalkan) | A. Tambah kolom status pada kontrak backend. B. Hapus pending dan pakai penghapusan lunak untuk dibatalkan. | Opsi A menambah satu kolom dan satu endpoint, opsi B menghilangkan fitur pending tetapi tidak mengubah dokumen. Selama belum diputuskan, adapter membaca baris terhapus sebagai dibatalkan. |
| 2 | Ikon dompet | A. Tambah kolom icon pada accounts. B. Ikon ditentukan frontend dari jenis dompet. | Opsi B tidak mengubah dokumen, ikon hilang dari dompet yang dibuat sendiri. |
| 3 | Panel QA dan analytics | A. Tambah tabel events di backend. B. Tetap lokal. | Opsi A menambah pekerjaan backend dan satu tabel, opsi B membuat panel hanya berisi data sesi sendiri. |
| 4 | Ekspor CSV | A. Unduh dari /reports/export.csv. B. Tetap dibuat di klien. | Opsi A sesuai dokumen dan angkanya konsisten dengan backend. |
| 5 | Peringatan duplikat transaksi | A. Aturan backend menolak transaksi serupa dalam rentang waktu tertentu. B. Tetap peringatan di klien saja. | Opsi A menambah aturan bisnis di backend, opsi B berisiko data ganda. |

## 5. Urutan pekerjaan

| Minggu | Pekerjaan | Penanggung jawab | Bukti |
| --- | --- | --- | --- |
| Minggu 2 | Adapter masuk repositori, getData.js memakai fetch, halaman Kategori dan Dompet sudah membaca backend | Chandra TW, Gilang Nur Adha | Pengajuan kode dan tangkapan layar daftar kategori dari backend |
| Minggu 2 | AuthPage memakai Supabase Auth, App.jsx memuat profil dan rumah tangga | Gilang Nur Adha | Tangkapan layar login dan isi Authorization pada permintaan |
| Minggu 3 | Onboarding mengirim rumah tangga, anggota, anggaran awal, dan tujuan awal | Nizar Hermawan | Baris baru pada households, household_members, budgets, goals |
| Minggu 3 | Transaksi dan QuickAdd memakai transactionToApi, perhitungan lokal dihapus | Apri Kuncoro | Catatan transaksi baru dan saldo dari backend |
| Minggu 3 | Budget memakai periode dan status dari backend | Apri Kuncoro | Status perhatian muncul saat pemakaian melewati batas |
| Minggu 4 | Dashboard dan Reports memakai endpoint ringkasan dan laporan | Chandra TW, Arjuna Rangga Lengkey | Angka antarmuka sama dengan respons backend |
| Minggu 4 | Goals memakai progres dari backend, Settings memakai data rumah tangga dari backend | Arjuna Rangga Lengkey, Nizar Hermawan | Tangkapan layar dan hasil uji |

## 6. Daftar periksa uji integrasi

1. Masuk dengan akun ayah, pastikan token terkirim pada setiap permintaan di tab Network.
2. Catat transaksi pengeluaran, pastikan baris muncul di tabel transactions dan saldo dompet berubah.
3. Catat transfer antar dompet, pastikan satu baris dengan to_account_id dan dua saldo berubah.
4. Buka halaman Anggaran, pilih bulan berjalan, pastikan spent, usage_percent, dan status berasal dari backend.
5. Buka halaman Tujuan, tambah setoran, pastikan progress_percent berubah.
6. Buka Dashboard dan Laporan, cocokkan angkanya dengan respons /dashboard/summary dan /reports/cashflow.
7. Unduh ekspor CSV, pastikan berkas berasal dari backend dan dapat dibuka di lembar kerja.
8. Masuk dengan akun anggota rumah tangga lain, pastikan data rumah tangga pertama tidak terlihat.
9. Masuk sebagai anak, pastikan tidak dapat mengubah anggaran dan hanya melihat catatan miliknya.
10. Jalankan aplikasi dari basis data kosong, ulangi langkah 2 sampai 5 untuk membuktikan pemasangan dapat diulang.

## 7. Bukti kontribusi GitHub

| Anggota | Berkas utama pada integrasi ini |
| --- | --- |
| Chandra TW | adapters.js, getData.js, Dashboard.jsx |
| Nizar Hermawan | Onboarding.jsx, Settings.jsx |
| Gilang Nur Adha | AuthPage.jsx, App.jsx |
| Apri Kuncoro | Transactions.jsx, QuickAdd.jsx, Budget.jsx |
| Arjuna Rangga Lengkey | Goals.jsx, Reports.jsx, QAPanel.jsx |

Aturan yang tetap berlaku: satu cabang per potongan dengan nama anggota dan modul, minimal dua commit dan satu pengajuan kode yang digabungkan setiap minggu, dan tinjauan oleh anggota lain.

## 8. Materi kuliah yang harus tetap ada selama integrasi

Bagian ini menjaga agar materi mata kuliah yang sudah dipenuhi kode frontend tidak hilang ketika lapisan data
dipindah ke backend.

| Nomor | Materi | Bukti di kode saat ini | Aturan selama integrasi |
| --- | --- | --- | --- |
| 1 | Alur data halaman di luar fetch, lewat getData, lalu tampilan | Komentar alur di baris pertama Budget, Transactions, Dashboard, Goals, Reports, Settings. Tidak ada fetch atau axios di halaman. | Pertahankan halaman tanpa fetch. Ubah komentar alur menjadi halaman lalu getData lalu localStorage atau backend lalu tampilan. Sediakan mode demo yang masih memakai localStorage agar alur lama tetap dapat didemokan. |
| 2 | useState untuk filter transaksi, state form, membaca localStorage | Transactions baris 49 sampai 55 (filter, memberFilter, form, showForm, submitting, dupWarning, forceSave). App.jsx baris 51 membaca localStorage di dalam useState. | Jangan pindahkan state filter dan form ke tempat lain. Baca sesi dari localStorage tetap memakai pola useState dengan fungsi awal. |
| 3 | Ternary untuk status budget, empty state, conditional render | Budget baris 125 dan 139 (warna dan badge status). Empty state di Dashboard 151 dan 188, Goals 91, Reports 179, Transactions 163. | Pertahankan ternary pada badge status, tetapi nilainya diambil dari kolom status backend. Empty state tetap dipakai ketika respons backend kosong. |
| 4 | props dari App.jsx ke halaman, default value pada Button | App.jsx baris 170 mengirim props user ke komponen halaman. Button memiliki default variant, type, disabled, fullWidth. Card memiliki default padding dan className. | Perbaiki agar halaman benar benar menerima props, misalnya Dashboard dan Settings menerima user, karena saat ini props dikirim tetapi belum dibaca halaman. Ini juga jalur untuk menampilkan profil dari backend. |
| 5 | Card implementasi asli dan pemakaian | src/components/Card.jsx dibuat sendiri dengan props dan default, dipakai di Budget, Transactions, Dashboard, Goals, Settings, dan Reports. | Pertahankan Card sebagai komponen sendiri. Jangan ganti menjadi potongan class Tailwind langsung di halaman. |
| 6 | map untuk daftar transaksi, chip filter, kategori | Reports 12 pemakaian, Transactions 8, Dashboard 8, Settings 7, Onboarding 6. Contoh chip filter di Transactions 141, daftar kategori 284, navItems di App 117. | Tetap memakai map untuk seluruh daftar, termasuk saat datanya datang dari backend. |
| 7 | console.log lewat track dan panel QA | analytics.js baris 12 mencatat ke console, track dipakai 39 kali di halaman, getData, dan App. QAPanel membaca getLogs. | Jangan hapus track saat integrasi. Kalau tabel events ditambahkan di backend, track tetap dipakai dan panel QA tetap ada. |
| 8 | useEffect lengkap di useFetch beserta deps dan refetch | src/hooks/useFetch.js berisi 4 useState, refetch lewat trigger, useEffect dengan pembersihan cancelled, deps spread, dan pencatatan track pada berhasil dan gagal. Dipakai 11 tempat di 6 halaman. | Perbaiki satu hal: belum ada halaman yang mengirim deps. Tambahkan satu pemakaian nyata, misalnya Budget memakai deps periode, supaya alur deps terlihat dan refetch dipakai ulang saat bulan berganti. |
| 9 | localStorage load dan save beserta kf.failMode | src/utils/localStorage.js berisi kf.failMode, save dan load dengan penjagaan dan try catch, serta clear. Dipakai getData, Onboarding, Budget, Goals. | Jangan hapus berkas ini. Setelah integrasi, gunakan untuk cache respons, pengaturan antarmuka, dan simulasi gagal lewat kf.failMode. |
| 10 | Aturan custom hook pada useFetch | Nama berawalan use, memanggil hook bawaan useState dan useEffect, tidak mengembalikan JSX, dan menghindari duplikasi karena 6 halaman memakai hook yang sama. | Jaga fungsi di getData tetap tanpa argumen, karena useFetch memanggil fetchFn tanpa argumen. Sesi disimpan di dalam modul getData seperti pada bagian 3. |
| 11 | Folder API/getData siap diganti axios | 14 baris contoh axios yang dikomentari, termasuk BASE_URL, pada setiap fungsi. | Pakai axios sungguhan di getData, bukan fetch, supaya materi ini benar benar terpakai. Adapter tetap terpisah di berkas lain. |

Satu temuan tambahan yang perlu keputusan: `src/components/QuickAdd.jsx` masih menawarkan tombol Scan Struk dan
Upload Galeri, sedangkan backend tidak lagi memiliki OCR dan unggahan berkas. Saat ini kedua tombol hanya
menampilkan pesan akan segera hadir, jadi tidak ada kerusakan, tetapi sebaiknya tombolnya dihapus atau teksnya
diubah agar tidak menjanjikan fitur yang tidak ada di kontrak backend.
