# query CRUD anggaran bulanan
from app.core.supabase_client import rest_delete, rest_hitung, rest_insert, rest_patch, rest_select

TABEL = "budgets"
KOLOM = "id,household_id,category_id,period_month,limit_amount,created_at,updated_at"


async def daftar(token: str, saring: dict, order: str, limit: int, offset: int) -> tuple[list, int]:
    baris = await rest_select(TABEL, {**saring, "select": KOLOM, "order": order, "limit": limit, "offset": offset}, token)
    total = await rest_hitung(TABEL, saring, token)
    return baris, total


async def ambil(token: str, budget_id: str) -> dict | None:
    baris = await rest_select(TABEL, {"id": f"eq.{budget_id}", "select": KOLOM, "limit": 1}, token)
    return baris[0] if baris else None


async def sudah_ada(token: str, household_id: str, category_id: str, period_month: str, kecuali: str | None = None) -> bool:
    """Satu kategori hanya boleh punya satu anggaran per bulan, sesuai batasan unik tabel."""
    params = {
        "household_id": f"eq.{household_id}",
        "category_id": f"eq.{category_id}",
        "period_month": f"eq.{period_month}",
        "select": "id",
        "limit": 1,
    }
    if kecuali:
        params["id"] = f"neq.{kecuali}"
    return bool(await rest_select(TABEL, params, token))


async def tambah(token: str, data: dict) -> dict:
    baris = await rest_insert(TABEL, data, token)
    return baris[0] if baris else data


async def ubah(token: str, budget_id: str, perubahan: dict) -> dict | None:
    baris = await rest_patch(TABEL, {"id": f"eq.{budget_id}"}, perubahan, token)
    return baris[0] if baris else None


async def hapus(token: str, budget_id: str) -> None:
    await rest_delete(TABEL, {"id": f"eq.{budget_id}"}, token)
