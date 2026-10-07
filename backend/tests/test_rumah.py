# uji endpoint rumah tangga (households) dan anggota (household_members)
# Penulis: Nizar Hermawan
import pytest
from fastapi.testclient import TestClient

from app.api.v1 import households, household_members
from app.core.deps import get_access_token, get_current_user
from app.main import app

# raise_server_exceptions=False penting agar kita bisa menguji respons error (4xx)
# tanpa membuat pytest crash.
client = TestClient(app, raise_server_exceptions=False)

# ==========================================================
# DATA DUMMY
# ==========================================================
RUMAH_BARIS = {
    "id": "rumah-123",
    "name": "Keluarga Bahagia",
    "currency": "IDR",
    "monthly_start_day": 1,
    "owner_user_id": "b3c1a7e2",
    "created_at": "2026-09-20T01:00:00Z",
    "deleted_at": None,
}

ANGGOTA_BARIS = {
    "id": "anggota-123",
    "household_id": "rumah-123",
    "user_id": "b3c1a7e2",
    "role": "ayah",
    "display_name": "Budi",
    "can_approve_budget": True,
    "joined_at": "2026-09-20T01:00:00Z",
}


# ==========================================================
# FIXTURE: MEMALSUKAN IDENTITAS PENGGUNA
# ==========================================================
@pytest.fixture
def masuk():
    app.dependency_overrides[get_current_user] = lambda: {"sub": "b3c1a7e2"}
    app.dependency_overrides[get_access_token] = lambda: "token-uji"
    yield
    app.dependency_overrides.clear()


# ==========================================================
# PENGUJIAN UNTUK /households
# ==========================================================

def test_tanpa_token_ditolak():
    res = client.get("/api/v1/households")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"


def test_tambah_tanpa_token_ditolak():
    res = client.post("/api/v1/households", json={"name": "Keluarga Uji"})
    assert res.status_code == 401


def test_daftar_rumah_tangga(monkeypatch, masuk):
    async def palsu_hitung(table, params, token):
        assert table == "households"
        assert params["deleted_at"] == "is.null"
        return 1

    async def palsu_select(table, params, token):
        assert table == "households"
        assert params["deleted_at"] == "is.null"
        return [RUMAH_BARIS]

    monkeypatch.setattr(households, "rest_hitung", palsu_hitung)
    monkeypatch.setattr(households, "rest_select", palsu_select)

    res = client.get("/api/v1/households")
    assert res.status_code == 200
    data = res.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Keluarga Bahagia"
    assert "meta" in data


def test_detail_rumah_tangga(monkeypatch, masuk):
    async def palsu(table, params, token):
        assert table == "households"
        assert params["id"] == "eq.rumah-123"
        assert params["deleted_at"] == "is.null"
        return [RUMAH_BARIS]

    monkeypatch.setattr(households, "rest_select", palsu)

    res = client.get("/api/v1/households/rumah-123")
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Keluarga Bahagia"


def test_tambah_rumah_tangga(monkeypatch, masuk):
    async def palsu(table, payload, token):
        assert table == "households"
        # Menguji apakah backend otomatis mengisi owner_user_id dari token
        assert payload["owner_user_id"] == "b3c1a7e2"
        assert payload["name"] == "Keluarga Baru"
        return [{**RUMAH_BARIS, "id": "rumah-baru", "name": "Keluarga Baru"}]

    monkeypatch.setattr(households, "rest_insert", palsu)

    payload_uji = {"name": "Keluarga Baru", "currency": "IDR", "monthly_start_day": 1}
    res = client.post("/api/v1/households", json=payload_uji)
    assert res.status_code == 201
    assert res.json()["data"]["name"] == "Keluarga Baru"


def test_ubah_rumah_tangga(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock peran pengguna adalah 'ayah'
        if table == "household_members":
            return [{"role": "ayah"}]
        return [RUMAH_BARIS]

    async def palsu_patch(table, params, payload, token):
        assert table == "households"
        assert params["id"] == "eq.rumah-123"
        assert payload == {"name": "Keluarga Sejahtera"}
        return [{**RUMAH_BARIS, "name": "Keluarga Sejahtera"}]

    monkeypatch.setattr(households, "rest_select", palsu_select)
    monkeypatch.setattr(households, "rest_patch", palsu_patch)

    res = client.patch("/api/v1/households/rumah-123", json={"name": "Keluarga Sejahtera"})
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Keluarga Sejahtera"


def test_ubah_rumah_tangga_oleh_bukan_ayah_ditolak_403(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock peran pengguna adalah 'ibu', bukan 'ayah'
        if table == "household_members":
            return [{"role": "ibu"}]
        return [RUMAH_BARIS]

    monkeypatch.setattr(households, "rest_select", palsu_select)

    res = client.patch("/api/v1/households/rumah-123", json={"name": "Keluarga Sejahtera"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_hapus_rumah_tangga_adalah_soft_delete(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock peran pengguna adalah 'ayah'
        if table == "household_members":
            return [{"role": "ayah"}]
        return [RUMAH_BARIS]

    async def palsu_patch(table, params, payload, token):
        assert table == "households"
        assert params["id"] == "eq.rumah-123"
        # Menguji apakah payload berisi deleted_at (soft delete)
        assert "deleted_at" in payload
        return [{**RUMAH_BARIS, "deleted_at": "2026-10-07T10:00:00Z"}]

    monkeypatch.setattr(households, "rest_select", palsu_select)
    monkeypatch.setattr(households, "rest_patch", palsu_patch)

    res = client.delete("/api/v1/households/rumah-123")
    assert res.status_code == 200
    assert res.json()["data"]["deleted_at"] is not None


def test_hapus_rumah_tangga_oleh_bukan_ayah_ditolak_403(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock peran pengguna adalah 'anak', bukan 'ayah'
        if table == "household_members":
            return [{"role": "anak"}]
        return [RUMAH_BARIS]

    monkeypatch.setattr(households, "rest_select", palsu_select)

    res = client.delete("/api/v1/households/rumah-123")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_badan_kosong_ditolak(masuk):
    res = client.patch("/api/v1/households/rumah-123", json={})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_nama_terlalu_pendek_ditolak(masuk):
    # Menguji validasi Pydantic (min_length=2)
    res = client.post("/api/v1/households", json={"name": "A"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


# ==========================================================
# PENGUJIAN UNTUK /household_members
# ==========================================================

def test_tambah_anggota_tanpa_token_ditolak():
    res = client.post(
        "/api/v1/household_members",
        json={
            "household_id": "rumah-123",
            "user_id": "user-baru",
            "role": "anak",
            "display_name": "Budi",
        },
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"


def test_daftar_anggota_berhasil(monkeypatch, masuk):
    async def palsu_hitung(table, params, token):
        assert table == "household_members"
        assert params["household_id"] == "eq.rumah-123"
        return 1

    async def palsu_select(table, params, token):
        assert table == "household_members"
        assert params["household_id"] == "eq.rumah-123"
        return [ANGGOTA_BARIS]

    monkeypatch.setattr(household_members, "rest_hitung", palsu_hitung)
    monkeypatch.setattr(household_members, "rest_select", palsu_select)

    res = client.get("/api/v1/household_members?household_id=rumah-123")
    assert res.status_code == 200
    data = res.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["display_name"] == "Budi"
    assert "meta" in data


def test_tambah_anggota_oleh_ayah_berhasil(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock peran pengguna adalah 'ayah'
        if table == "household_members":
            return [{"role": "ayah"}]
        return []

    async def palsu_insert(table, payload, token):
        assert table == "household_members"
        assert payload["role"] == "anak"
        assert payload["display_name"] == "Anak Baru"
        return [{**ANGGOTA_BARIS, "id": "anggota-baru", "role": "anak", "display_name": "Anak Baru"}]

    monkeypatch.setattr(household_members, "rest_select", palsu_select)
    monkeypatch.setattr(household_members, "rest_insert", palsu_insert)

    payload = {
        "household_id": "rumah-123",
        "user_id": "user-baru",
        "role": "anak",
        "display_name": "Anak Baru",
    }
    res = client.post("/api/v1/household_members", json=payload)
    assert res.status_code == 201
    assert res.json()["data"]["display_name"] == "Anak Baru"


def test_tambah_anggota_oleh_ibu_ditolak_403(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock peran pengguna adalah 'ibu', bukan 'ayah'
        if table == "household_members":
            return [{"role": "ibu"}]
        return []

    monkeypatch.setattr(household_members, "rest_select", palsu_select)

    payload = {
        "household_id": "rumah-123",
        "user_id": "user-baru",
        "role": "anak",
        "display_name": "Anak Baru",
    }
    res = client.post("/api/v1/household_members", json=payload)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_detail_anggota_rumah_lain_dijawab_404(monkeypatch, masuk):
    async def palsu_select(table, params, token):
        # Mock mengembalikan kosong (seolah-olah anggota ini bukan dari rumah user yang login)
        return []

    monkeypatch.setattr(household_members, "rest_select", palsu_select)

    res = client.get("/api/v1/household_members/anggota-rumah-lain")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"

    