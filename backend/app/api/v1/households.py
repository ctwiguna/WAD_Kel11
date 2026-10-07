# router /households: terima permintaan, panggil service, kembalikan respons
# Penulis: Nizar Hermawan
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.deps import get_access_token, get_current_user
from app.core.errors import AppError, not_found
from app.core.pagination import PageParams, list_response, page_params
from app.core.supabase_client import rest_hitung, rest_insert, rest_patch, rest_select

router = APIRouter(prefix="/households", tags=["rumah tangga"])

KOLOM = "id,name,currency,monthly_start_day,owner_user_id,created_at,deleted_at"


class RumahTambah(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    currency: str = Field(default="IDR", min_length=3, max_length=3)
    monthly_start_day: int = Field(default=1, ge=1, le=28)


class RumahUbah(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    monthly_start_day: int | None = Field(default=None, ge=1, le=28)


@router.get("")
async def daftar_rumah(
    request: Request,
    params: PageParams = Depends(page_params),
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Daftar rumah tangga yang boleh dilihat pengguna, baris terhapus tidak ikut."""
    saring = {"select": KOLOM, "deleted_at": "is.null", "order": "created_at.desc"}
    jumlah = await rest_hitung("households", saring, token)
    baris = await rest_select(
        "households", {**saring, "limit": params.per_page, "offset": params.offset}, token
    )
    return list_response(baris, params, jumlah, request.url.path)


@router.get("/{id}")
async def satu_rumah(
    id: str,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Satu rumah tangga beserta pengaturannya."""
    baris = await rest_select(
        "households", {"id": f"eq.{id}", "select": KOLOM, "deleted_at": "is.null", "limit": 1}, token
    )
    if not baris:
        raise not_found("Rumah tangga tidak ditemukan.")
    return {"data": baris[0]}


@router.post("", status_code=201)
async def tambah_rumah(
    payload: RumahTambah,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Membuat rumah tangga baru. Pembuatnya otomatis menjadi anggota berperan ayah lewat trigger."""
    isi = payload.model_dump()
    isi["owner_user_id"] = user.get("sub")
    baris = await rest_insert("households", isi, token)
    if not baris:
        raise AppError(502, "SUPABASE_ERROR", "Gagal menyimpan rumah tangga baru.")
    return {"data": baris[0]}


@router.patch("/{id}")
async def ubah_rumah(
    id: str,
    payload: RumahUbah,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Mengubah nama, mata uang, atau tanggal awal bulan. Hanya ayah yang diizinkan kebijakan RLS."""
    perubahan = payload.model_dump(exclude_none=True)
    if not perubahan:
        raise AppError(400, "VALIDATION_ERROR", "Tidak ada kolom yang diubah.")
    peran = await rest_select("household_members", {"household_id": f"eq.{id}", "user_id": f"eq.{user.get('sub')}", "select": "role", "limit": 1}, token)
    if not peran or peran[0]["role"] != "ayah":
        from app.core.errors import forbidden
        raise forbidden("Hanya ayah yang boleh mengubah pengaturan rumah tangga.")

    baris = await rest_patch("households", {"id": f"eq.{id}"}, perubahan, token)
    if not baris:
        raise not_found("Rumah tangga tidak ditemukan.")
    return {"data": baris[0]}


@router.delete("/{id}")
async def hapus_rumah(
    id: str,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Penghapusan lunak. Barisnya hanya ditandai, riwayat keuangan tetap utuh."""
    baris = await rest_patch("households", {"id": f"eq.{id}"}, {"deleted_at": "now()"}, token)
    if not baris:
        raise not_found("Rumah tangga tidak ditemukan.")
    return {"data": baris[0]}

