# query CRUD transaksi
from app.core.supabase_client import rest_hitung, rest_insert, rest_patch, rest_select

TABEL = "transactions"
KOLOM = (
    "id,household_id,account_id,to_account_id,category_id,member_id,type,amount,"
    "txn_date,merchant,notes,created_by,created_at,deleted_at"
)


async def daftar(token: str, saring: dict, order: str, limit: int, offset: int) -> tuple[list, int]:
    baris = await rest_select(TABEL, {**saring, "select": KOLOM, "order": order, "limit": limit, "offset": offset}, token)
    total = await rest_hitung(TABEL, saring, token)
    return baris, total


async def ambil(token: str, txn_id: str) -> dict | None:
    baris = await rest_select(TABEL, {"id": f"eq.{txn_id}", "select": KOLOM, "limit": 1}, token)
    return baris[0] if baris else None


async def tambah(token: str, data: dict) -> dict:
    baris = await rest_insert(TABEL, data, token)
    return baris[0] if baris else data


async def ubah(token: str, txn_id: str, perubahan: dict) -> dict | None:
    baris = await rest_patch(TABEL, {"id": f"eq.{txn_id}"}, perubahan, token)
    return baris[0] if baris else None


async def hapus_lunak(token: str, txn_id: str) -> dict | None:
    """Pembatalan catatan, barisnya tetap ada dengan deleted_at terisi."""
    baris = await rest_patch(TABEL, {"id": f"eq.{txn_id}"}, {"deleted_at": "now()"}, token)
    return baris[0] if baris else None


async def pengeluaran_per_kategori(
    token: str, household_id: str, kategori_ids: list[str], mulai: str, selesai: str
) -> list[dict]:
    """Satu query untuk semua anggaran halaman ini: pengeluaran tiap kategori pada rentang tanggal."""
    if not kategori_ids:
        return []
    params = {
        "household_id": f"eq.{household_id}",
        "type": "eq.expense",
        "deleted_at": "is.null",
        "category_id": f"in.({','.join(kategori_ids)})",
        "txn_date": [f"gte.{mulai}", f"lte.{selesai}"],
        "select": "category_id,txn_date,amount",
    }
    return await rest_select(TABEL, params, token)
