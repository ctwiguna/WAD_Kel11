const API_BASE_URL = 'http://localhost:8000/api/v1';

export async function getReportsCashflow(period = 'all') {
  const res = await fetch(`${API_BASE_URL}/reports/cashflow?period=${period}`);
  if (!res.ok) throw new Error('Gagal mengambil data cashflow');
  return res.json();
}

export async function getReportsCategories(period = 'all') {
  const res = await fetch(`${API_BASE_URL}/reports/categories?period=${period}`);
  if (!res.ok) throw new Error('Gagal mengambil data kategori laporan');
  return res.json();
}

export async function getReportsMembers(period = 'all') {
  const res = await fetch(`${API_BASE_URL}/reports/members?period=${period}`);
  if (!res.ok) throw new Error('Gagal mengambil data anggota laporan');
  return res.json();
}

export async function exportReportsCsv(period = 'all') {
  const res = await fetch(`${API_BASE_URL}/reports/export?period=${period}`);
  if (!res.ok) throw new Error('Gagal mengunduh file CSV');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan_${period}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}