# aturan bisnis anggaran: batas per kategori per bulan dan status pemakaian
# Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
import calendar

from app.core.errors import AppError, conflict, forbidden, not_found
from app.repositories import budgets as repo
from app.repositories import transactions as repo_transaksi
from app.services import akses
from app.services.urutan import ke_order

KOLOM_SORT = {"period_month", "limit_amount", "created_at"}
AMBANG_PERHATIAN = 80
STATUS_AMAN = "aman"
STATUS_PERHATIAN = "perhatian"
STATUS_LEWAT = "lewat batas"


def kolom_turunan(spent: int, limit_amount: int) -> dict:
    """Empat kolom turunan anggaran, dihitung backend sesuai kontrak."""
    persen = round(spent / limit_amount * 100) if limit_amount > 0 else 0
    if spent > limit_amount:
        status = STATUS_LEWAT
    elif persen >= AMBANG_PERHATIAN:
        status = STATUS_PERHATIAN
    else:
        status = STATUS_AMAN
    return {
        "spent": spent,
        "remaining": max(limit_amount - spent, 0),
        "usage_percent": persen,
        "status": status,
    }


def _akhir_bulan(period_month: str) -> str:
    tahun, bulan = int(period_month[:4]), int(period_month[5:7])
    hari = calendar.monthrange(tahun, bulan)[1]
    return f"{tahun:04d}-{bulan:02d}-{hari:02d}"


def _hari_bulan(nilai: str) -> str:
    return str(nilai or "")[:7]


async def _lengkapi(token: str, household_id: str, baris: list[dict]) -> list[dict]:
    """Satu query transaksi untuk semua baris halaman ini, lalu dijumlahkan per kategori dan bulan."""
    if not baris:
        return baris
    kategori_ids = sorted({b["category_id"] for b in baris if b.get("category_id")})
    periode = sorted({b["period_month"] for b in baris if b.get("period_month")})
    if kategori_ids and periode:
        pengeluaran = await repo_transaksi.pengeluaran_per_kategori(
            token, household_id, kategori_ids, min(periode), _akhir_bulan(max(periode))
        )
    else:
        pengeluaran = []
    jumlah: dict = {}
    for t in pengeluaran:
        kunci = (t.get("category_id"), _hari_bulan(t.get("txn_date")))
        jumlah[kunci] = jumlah.get(kunci, 0) + int(t.get("amount") or 0)
    hasil = []
    for b in baris:
        kunci = (b.get("category_id"), _hari_bulan(b.get("period_month")))
        hasil.append({**b, **kolom_turunan(jumlah.get(kunci, 0), int(b.get("limit_amount") or 0))})
    return hasil


async def _ambil_terlihat(token: str, budget_id: str, user: dict) -> tuple[dict, str | None]:
    anggaran = await repo.ambil(token, budget_id)
    if not anggaran:
        raise not_found("Anggaran tidak ditemukan.")
    peran = await akses.peran(token, anggaran["household_id"], user)
    if peran is None:
        raise not_found("Anggaran tidak ditemukan.")
    return anggaran, peran


async def daftar(token, user, household_id, period_month, sort, limit, offset) -> tuple[list, int]:
    await akses.wajib_anggota(token, household_id, user)
    saring: dict = {"household_id": f"eq.{household_id}"}
    if period_month:
        saring["period_month"] = f"eq.{period_month}"
    order = ke_order(sort, KOLOM_SORT, "period_month.desc,created_at.desc")
    baris, total = await repo.daftar(token, saring, order, limit, offset)
    return await _lengkapi(token, household_id, baris), total


async def detail(token, user, budget_id) -> dict:
    anggaran, _ = await _ambil_terlihat(token, budget_id, user)
    hasil = await _lengkapi(token, anggaran["household_id"], [anggaran])
    return hasil[0]


async def tambah(token, user, data: dict) -> dict:
    await akses.wajib_penulis(token, data["household_id"], user)
    if await repo.sudah_ada(token, data["household_id"], data["category_id"], data["period_month"]):
        raise conflict("Anggaran untuk kategori itu pada bulan itu sudah ada.")
    baris = await repo.tambah(token, data)
    hasil = await _lengkapi(token, data["household_id"], [baris])
    return hasil[0]


async def ubah(token, user, budget_id, perubahan: dict) -> dict:
    if not perubahan:
        raise AppError(
            400, "VALIDATION_ERROR", "Tidak ada data untuk diperbarui.",
            [{"field": "body", "issue": "kirim minimal satu kolom"}],
        )
    anggaran, peran = await _ambil_terlihat(token, budget_id, user)
    if peran not in akses.PERAN_PENULIS:
        raise forbidden("Hanya Ayah dan Ibu yang boleh mengubah anggaran.")
    baris = await repo.ubah(token, budget_id, perubahan)
    if not baris:
        raise not_found("Anggaran tidak ditemukan.")
    hasil = await _lengkapi(token, anggaran["household_id"], [baris])
    return hasil[0]


async def hapus(token, user, budget_id) -> None:
    anggaran, peran = await _ambil_terlihat(token, budget_id, user)
    if peran not in akses.PERAN_PENULIS:
        raise forbidden("Hanya Ayah dan Ibu yang boleh menghapus anggaran.")
    await repo.hapus(token, budget_id)
