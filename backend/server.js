const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint tes utama
app.get('/', (req, res) => {
  res.send('API KeluargaFin Backend Berjalan!');
});

// Endpoint User (Pengganti mock data getMe di frontend)
app.get('/api/me', (req, res) => {
  res.json({
    id: "usr_1",
    name: "Arjuna Rangga Lengkey",
    role: "Admin Keluarga",
    household: "Keluarga Demo"
  });
});

// Endpoint Ringkasan Dashboard Keuangan
app.get('/api/dashboard', (req, res) => {
  res.json({
    totalPemasukan: 10000000,
    totalPengeluaran: 3500000,
    sisaBudget: 6500000,
    kategoriPengeluaran: [
      { kategori: "Makanan & Minuman", jumlah: 1500000 },
      { kategori: "Tagihan & Utilitas", jumlah: 1000000 },
      { kategori: "Hiburan", jumlah: 1000000 }
    ]
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});