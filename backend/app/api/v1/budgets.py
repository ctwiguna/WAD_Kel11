# router /budgets: terima permintaan, panggil service, kembalikan respons
# Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
from fastapi import APIRouter, Depends, Query, Request

from app.core.deps import get_access_token, get_current_user
from app.core.pagination import PageParams, list_response, page_params
from app.schemas.budget import AnggaranBaru, AnggaranUbah
from app.services import budget_service as layanan

router = APIRouter(prefix="/budgets", tags=["anggaran"])


@router.get("")
async def daftar_anggaran(
    request: Request,
    household_id: str,
    period_month: str | None = Query(default=None, description="Bentuk YYYY-MM-01."),
    sort: str | None = Query(default=None, description="Contoh period_month:asc. Bawaan period_month:desc."),
    params: PageParams = Depends(page_params),
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Daftar anggaran beserta kolom turunan spent, remaining, usage_percent, dan status."""
    baris, total = await layanan.daftar(token, user, household_id, period_month, sort, params.per_page, params.offset)
    extra = {k: v for k, v in {"household_id": household_id, "period_month": period_month, "sort": sort}.items() if v}
    return list_response(baris, params, total, request.url.path, extra)


@router.get("/{budget_id}")
async def detail_anggaran(budget_id: str, user: dict = Depends(get_current_user), token: str = Depends(get_access_token)) -> dict:
    return {"data": await layanan.detail(token, user, budget_id)}


@router.post("", status_code=201)
async def tambah_anggaran(payload: AnggaranBaru, user: dict = Depends(get_current_user), token: str = Depends(get_access_token)) -> dict:
    """Tambah batas anggaran satu kategori untuk satu bulan. Ditolak 409 bila sudah ada."""
    return {"data": await layanan.tambah(token, user, payload.model_dump())}


@router.patch("/{budget_id}")
async def ubah_anggaran(
    budget_id: str,
    payload: AnggaranUbah,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Ubah batas anggaran. Hanya Ayah dan Ibu yang boleh."""
    return {"data": await layanan.ubah(token, user, budget_id, payload.model_dump(exclude_unset=True, exclude_none=True))}


@router.delete("/{budget_id}")
async def hapus_anggaran(budget_id: str, user: dict = Depends(get_current_user), token: str = Depends(get_access_token)) -> dict:
    """Hapus anggaran satu kategori pada satu bulan. Hanya Ayah dan Ibu yang boleh."""
    await layanan.hapus(token, user, budget_id)
    return {"data": None, "message": "baris dihapus"}
