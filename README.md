# WAD_Kel11: KeluargaFin

Aplikasi web manajemen keuangan keluarga, proyek Kelompok 11 untuk mata kuliah **Web Application Development (WAD)**.

KeluargaFin membantu keluarga (Ayah, Ibu, Anak) mencatat pengeluaran bersama, memantau budget bulanan, dan memahami kondisi keuangan keluarga dari satu dashboard, **tanpa menghubungkan rekening bank dan tanpa kredensial bank**.

## Kelompok 11

- Nizar Hermawan
- Gilang Nur Adha
- Apri Kuncoro
- Chandra TW
- Arjuna Rangga Lengkey

## Fitur (Perbaikan 1)

- **Login demo**: Google atau tautan email (mode demo, tanpa backend)
- **Onboarding household**: buat workspace keluarga + profil Ayah, Ibu, Anak
- **Transaksi manual**: pengeluaran, pemasukan, dan transfer antar akun
- **Kategori**: 8 kategori bawaan + kategori kustom
- **Budget**: budget bulanan household & per kategori, dengan status aman / perlu perhatian / lewat budget
- **Dashboard**: ringkasan "bulan ini keluarga kita aman?", breakdown per anggota, kategori terbesar, transaksi terbaru
- **Privasi & Data**: lihat event, hapus data, keluar akun

Aturan penting yang dipegang aplikasi:

- Transfer **tidak** dihitung sebagai pengeluaran (budget & kategori)
- Hanya transaksi berstatus **approved** yang masuk perhitungan
- Tidak ada field password / PIN / OTP bank di mana pun

## Teknologi

- React 19 + Vite
- Tailwind CSS 4
- React Router
- localStorage: semua data demo tersimpan di browser (belum ada backend)

## Catatan

- Data disimpan di localStorage browser, ganti browser atau hapus data berarti mulai dari awal.
- Upload bukti + OCR, Goals, dan Laporan dijadwalkan pada perbaikan berikutnya.
