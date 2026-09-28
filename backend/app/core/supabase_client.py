# akses basis data lewat PostgREST
import httpx

from app.core.config import get_settings
from app.core.errors import AppError

TIMEOUT = 10.0


def _kunci() -> str:
    settings = get_settings()
    return settings.supabase_service_role_key or settings.supabase_anon_key


def _headers(token: str | None = None, prefer: str | None = None) -> dict:
    settings = get_settings()
    kunci = _kunci()
    if not settings.supabase_url or not kunci:
        raise AppError(503, "SUPABASE_UNAVAILABLE", "Data sedang tidak dapat diakses, coba lagi sebentar lagi.")
    headers = {
        "apikey": kunci,
        "Authorization": f"Bearer {token or kunci}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def rest_url(table: str) -> str:
    settings = get_settings()
    return f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}"


def _cek(res: httpx.Response) -> list:
    if res.status_code >= 400:
        raise AppError(502, "SUPABASE_ERROR", "Gagal mengambil data dari basis data.", [{"status": res.status_code}])
    if not res.content:
        return []
    return res.json()


async def rest_select(table: str, params: dict, token: str | None = None) -> list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.get(rest_url(table), params=params, headers=_headers(token))
    return _cek(res)


async def rest_insert(table: str, payload: dict, token: str | None = None) -> list:
    headers = _headers(token, prefer="return=representation")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(rest_url(table), json=payload, headers=headers)
    return _cek(res)


async def rest_patch(table: str, params: dict, payload: dict, token: str | None = None) -> list:
    headers = _headers(token, prefer="return=representation")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.patch(rest_url(table), params=params, json=payload, headers=headers)
    return _cek(res)


async def rest_delete(table: str, params: dict, token: str | None = None) -> list:
    headers = _headers(token, prefer="return=representation")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.delete(rest_url(table), params=params, headers=headers)
    return _cek(res)
