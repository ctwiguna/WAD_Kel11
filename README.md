# WAD_Kel11: KeluargaFin

Aplikasi web manajemen keuangan keluarga, proyek Kelompok 11 untuk mata kuliah **Web Application Development (WAD)**.

KeluargaFin membantu keluarga (Ayah, Ibu, Anak) mencatat pengeluaran bersama, memantau budget bulanan, dan memahami kondisi keuangan keluarga dari satu dashboard, **tanpa menghubungkan rekening bank dan tanpa kredensial bank**.

## Kelompok 11

- Nizar Hermawan
- Gilang Nur Adha
- Apri Kuncoro
- Chandra TW
- Arjuna Rangga Lengkey

## Teknologi

- Frontend: React 19 + Vite
- Tailwind CSS 4
- React Router
- Backend: Python dengan FastAPI
- Basis data: Supabase, memakai Postgres dan Auth
- localStorage: menyimpan data demo di browser

## Backend

Backend KeluargaFin dibuat dengan Python dan FastAPI, dengan Supabase sebagai basis data dan layanan autentikasi. Aturan bisnis dan perhitungan ringkasan dikerjakan di backend, sementara frontend hanya menampilkan hasilnya.

## Catatan

- Data disimpan di localStorage browser, ganti browser atau hapus data berarti mulai dari awal.
- Upload bukti + OCR, Goals, dan Laporan dijadwalkan pada perbaikan berikutnya.
