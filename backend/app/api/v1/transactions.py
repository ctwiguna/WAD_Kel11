# router /transactions: terima permintaan, panggil service, kembalikan respons
# Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
from fastapi import APIRouter, Depends, Query, Request

from app.core.deps import get_access_token, get_current_user
from app.core.pagination import PageParams, list_response, page_params
from app.schemas.transaction import JenisTransaksi, TransaksiBaru, TransaksiUbah
from app.services import transaction_service as layanan

router = APIRouter(prefix="/transactions", tags=["transaksi"])


@router.get("")
async def daftar_transaksi(
    request: Request,
    household_id: str,
    type: JenisTransaksi | None = None,
    category_id: str | None = None,
    member_id: str | None = None,
    from_: str | None = Query(default=None, alias="from", description="Tanggal awal, bentuk YYYY-MM-DD."),
    to: str | None = Query(default=None, description="Tanggal akhir, bentuk YYYY-MM-DD."),
    sort: str | None = Query(default=None, description="Contoh txn_date:asc. Bawaan txn_date:desc."),
    params: PageParams = Depends(page_params),
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Daftar transaksi aktif satu rumah tangga. Total nilai pada halaman ini ada di meta.total_amount."""
    baris, total, jumlah = await layanan.daftar(
        token, user, household_id, type, category_id, member_id, from_, to, sort, params.per_page, params.offset
    )
    extra = {
        k: v
        for k, v in {
            "household_id": household_id,
            "type": type,
            "category_id": category_id,
            "member_id": member_id,
            "from": from_,
            "to": to,
            "sort": sort,
        }.items()
        if v
    }
    jawaban = list_response(baris, params, total, request.url.path, extra)
    jawaban["meta"]["total_amount"] = jumlah
    return jawaban


@router.get("/{txn_id}")
async def detail_transaksi(txn_id: str, user: dict = Depends(get_current_user), token: str = Depends(get_access_token)) -> dict:
    return {"data": await layanan.detail(token, user, txn_id)}


@router.post("", status_code=201)
async def tambah_transaksi(payload: TransaksiBaru, user: dict = Depends(get_current_user), token: str = Depends(get_access_token)) -> dict:
    """Catat transaksi baru. Semua peran boleh mencatat, termasuk anak."""
    return {"data": await layanan.tambah(token, user, payload.model_dump())}


@router.patch("/{txn_id}")
async def ubah_transaksi(
    txn_id: str,
    payload: TransaksiUbah,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Ubah sebagian kolom. Ayah dan Ibu boleh semua, anak hanya catatannya sendiri."""
    return {"data": await layanan.ubah(token, user, txn_id, payload.model_dump(exclude_unset=True, exclude_none=True))}


@router.delete("/{txn_id}")
async def hapus_transaksi(txn_id: str, user: dict = Depends(get_current_user), token: str = Depends(get_access_token)) -> dict:
    """Membatalkan catatan dengan mengisi deleted_at, barisnya tidak dihapus permanen."""
    await layanan.hapus(token, user, txn_id)
    return {"data": None, "message": "baris dihapus"}
