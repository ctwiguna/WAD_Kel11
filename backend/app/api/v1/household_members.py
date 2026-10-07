# router /household_members: terima permintaan, panggil service, kembalikan respons
# Penulis: Nizar Hermawan

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.deps import get_access_token, get_current_user
from app.core.errors import AppError, forbidden, not_found
from app.core.pagination import PageParams, list_response, page_params
from app.core.supabase_client import rest_delete, rest_hitung, rest_insert, rest_patch, rest_select

router = APIRouter(prefix="/household_members", tags=["anggota rumah tangga"])

KOLOM = "id,household_id,user_id,role,display_name,can_approve_budget,joined_at"
PERAN_BOLEH_TULIS = ("ayah",)


class AnggotaTambah(BaseModel):
    household_id: str
    user_id: str
    role: str = Field(pattern="^(ayah|ibu|anak)$")
    display_name: str = Field(min_length=1, max_length=60)
    can_approve_budget: bool = False


class AnggotaUbah(BaseModel):
    role: str | None = Field(default=None, pattern="^(ayah|ibu|anak)$")
    display_name: str | None = Field(default=None, min_length=1, max_length=60)
    can_approve_budget: bool | None = None


async def peran_pengguna(household_id: str, user: dict, token: str) -> str | None:
    """Membaca peran pengguna pada satu rumah tangga."""
    baris = await rest_select(
        "household_members",
        {"household_id": f"eq.{household_id}", "user_id": f"eq.{user.get('sub')}", "select": "role", "limit": 1},
        token,
    )
    return baris[0]["role"] if baris else None


async def wajib_boleh_tulis(household_id: str, user: dict, token: str) -> None:
    peran = await peran_pengguna(household_id, user, token)
    if peran is None:
        raise forbidden("Kamu bukan anggota rumah tangga itu.")
    if peran not in PERAN_BOLEH_TULIS:
        raise forbidden("Hanya ayah yang boleh menambah atau mengubah anggota.")


@router.get("")
async def daftar_anggota(
    request: Request,
    household_id: str,
    params: PageParams = Depends(page_params),
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Daftar anggota satu rumah tangga beserta perannya."""
    saring = {"select": KOLOM, "household_id": f"eq.{household_id}", "order": "joined_at.asc"}
    jumlah = await rest_hitung("household_members", saring, token)
    baris = await rest_select(
        "household_members", {**saring, "limit": params.per_page, "offset": params.offset}, token
    )
    return list_response(baris, params, jumlah, request.url.path, {"household_id": household_id})


@router.get("/{id}")
async def satu_anggota(
    id: str,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    baris = await rest_select("household_members", {"id": f"eq.{id}", "select": KOLOM, "limit": 1}, token)
    if not baris:
        raise not_found("Anggota tidak ditemukan.")
    return {"data": baris[0]}


@router.post("", status_code=201)
async def tambah_anggota(
    payload: AnggotaTambah,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Menambahkan anggota ke rumah tangga. Hanya ayah."""
    await wajib_boleh_tulis(payload.household_id, user, token)
    baris = await rest_insert("household_members", payload.model_dump(), token)
    if not baris:
        raise AppError(502, "SUPABASE_ERROR", "Gagal menyimpan anggota baru.")
    return {"data": baris[0]}


@router.patch("/{id}")
async def ubah_anggota(
    id: str,
    payload: AnggotaUbah,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Mengubah peran, nama tampilan, atau izin menyetujui anggaran. Hanya ayah."""
    perubahan = payload.model_dump(exclude_none=True)
    if not perubahan:
        raise AppError(400, "VALIDATION_ERROR", "Tidak ada kolom yang diubah.")
    baris = await rest_select("household_members", {"id": f"eq.{id}", "select": "household_id", "limit": 1}, token)
    if not baris:
        raise not_found("Anggota tidak ditemukan.")
    await wajib_boleh_tulis(baris[0]["household_id"], user, token)
    hasil = await rest_patch("household_members", {"id": f"eq.{id}"}, perubahan, token)
    return {"data": hasil[0]}


@router.delete("/{id}")
async def keluarkan_anggota(
    id: str,
    user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
) -> dict:
    """Mengeluarkan anggota dari rumah tangga. Hanya ayah."""
    baris = await rest_select("household_members", {"id": f"eq.{id}", "select": "household_id", "limit": 1}, token)
    if not baris:
        raise not_found("Anggota tidak ditemukan.")
    await wajib_boleh_tulis(baris[0]["household_id"], user, token)
    hasil = await rest_delete("household_members", {"id": f"eq.{id}"}, token)
    return {"data": hasil[0] if hasil else {"id": id}}
