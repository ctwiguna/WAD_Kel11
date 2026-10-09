# uji router /budgets dan perhitungan status pemakaian
# Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
from fastapi.testclient import TestClient

from app.main import app
from app.services.budget_service import kolom_turunan
from tests.palsu_supabase import RT, RT_LAIN, db  # noqa: F401

client = TestClient(app, raise_server_exceptions=False)
URL = "/api/v1/budgets"

TRANSAKSI = [
    {"household_id": RT, "type": "expense", "category_id": "k1", "amount": 300000, "txn_date": "2026-09-05", "deleted_at": None},
    {"household_id": RT, "type": "expense", "category_id": "k1", "amount": 135000, "txn_date": "2026-09-18", "deleted_at": None},
    {"household_id": RT, "type": "expense", "category_id": "k2", "amount": 250000, "txn_date": "2026-09-20", "deleted_at": None},
    {"household_id": RT, "type": "income", "category_id": "k1", "amount": 900000, "txn_date": "2026-09-20", "deleted_at": None},
    {"household_id": RT, "type": "expense", "category_id": "k1", "amount": 99000, "txn_date": "2026-09-25", "deleted_at": "2026-09-26T00:00:00Z"},
    {"household_id": RT, "type": "expense", "category_id": "k1", "amount": 77000, "txn_date": "2026-10-05", "deleted_at": None},
]


def _isi(db_tiruan):
    db_tiruan.tabel["budgets"] = [
        {"id": "b1", "household_id": RT, "category_id": "k1", "period_month": "2026-09-01", "limit_amount": 500000},
        {"id": "b2", "household_id": RT, "category_id": "k2", "period_month": "2026-09-01", "limit_amount": 200000},
        {"id": "b9", "household_id": RT_LAIN, "category_id": "k9", "period_month": "2026-09-01", "limit_amount": 100000},
    ]
    db_tiruan.tabel["transactions"] = TRANSAKSI


# ---------- perhitungan tanpa HTTP ----------
def test_pemakaian_aman():
    assert kolom_turunan(50000, 100000) == {"spent": 50000, "remaining": 50000, "usage_percent": 50, "status": "aman"}


def test_pemakaian_perhatian_mulai_80_persen():
    assert kolom_turunan(87000, 100000)["status"] == "perhatian"
    assert kolom_turunan(87000, 100000)["usage_percent"] == 87


def test_pemakaian_lewat_batas():
    hasil = kolom_turunan(150000, 100000)
    assert hasil["status"] == "lewat batas"
    assert hasil["remaining"] == 0
    assert hasil["usage_percent"] == 150


def test_batas_nol():
    assert kolom_turunan(0, 0) == {"spent": 0, "remaining": 0, "usage_percent": 0, "status": "aman"}
    assert kolom_turunan(5000, 0)["status"] == "lewat batas"


def test_hasil_bilangan_bulat():
    hasil = kolom_turunan(1, 3)
    assert hasil["usage_percent"] == 33 and isinstance(hasil["usage_percent"], int)


# ---------- autentikasi dan baca ----------
def test_tanpa_token_401():
    res = client.get(f"{URL}?household_id={RT}")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"


def test_daftar_bentuk_dan_kolom_turunan(db):  # noqa: F811
    _isi(db)
    res = client.get(f"{URL}?household_id={RT}")
    assert res.status_code == 200
    isi = res.json()
    assert set(isi) == {"data", "meta", "links"}
    assert isi["meta"] == {"page": 1, "per_page": 20, "total": 2}
    pemakaian = {b["id"]: b for b in isi["data"]}
    assert pemakaian["b1"]["spent"] == 435000
    assert pemakaian["b1"]["usage_percent"] == 87
    assert pemakaian["b1"]["status"] == "perhatian"
    assert pemakaian["b2"]["status"] == "lewat batas" and pemakaian["b2"]["remaining"] == 0
    assert "X-Request-Id" in res.headers


def test_satu_query_untuk_semua_anggaran_dan_menyaring_terhapus(db):  # noqa: F811
    _isi(db)
    client.get(f"{URL}?household_id={RT}")
    q = db.params_terakhir["transactions"]
    assert q["household_id"] == f"eq.{RT}"
    assert q["type"] == "eq.expense" and q["deleted_at"] == "is.null"
    assert q["category_id"] == "in.(k1,k2)"
    assert q["txn_date"] == ["gte.2026-09-01", "lte.2026-09-30"]


def test_saring_periode_diteruskan(db):  # noqa: F811
    _isi(db)
    client.get(f"{URL}?household_id={RT}&period_month=2026-09-01")
    assert db.params_terakhir["budgets"]["period_month"] == "eq.2026-09-01"


def test_urutan_bawaan_dan_pilihan(db):  # noqa: F811
    _isi(db)
    client.get(f"{URL}?household_id={RT}")
    assert db.params_terakhir["budgets"]["order"] == "period_month.desc,created_at.desc"
    client.get(f"{URL}?household_id={RT}&sort=limit_amount:asc")
    assert db.params_terakhir["budgets"]["order"] == "limit_amount.asc"


def test_sort_tidak_dikenal_400(db):  # noqa: F811
    assert client.get(f"{URL}?household_id={RT}&sort=spent:asc").status_code == 400


def test_bukan_anggota_403(db):  # noqa: F811
    assert client.get(f"{URL}?household_id={RT_LAIN}").status_code == 403


def test_detail_rumah_tangga_lain_404(db):  # noqa: F811
    _isi(db)
    assert client.get(f"{URL}/b9").status_code == 404


def test_anak_boleh_membaca(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    res = client.get(f"{URL}/b1")
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "perhatian"


# ---------- tambah ----------
def test_tambah_201_beserta_kolom_turunan(db):  # noqa: F811
    _isi(db)
    res = client.post(URL, json={"household_id": RT, "category_id": "k2", "period_month": "2026-10-01", "limit_amount": 400000})
    assert res.status_code == 201
    assert db.ditulis == [("insert", "budgets", {"household_id": RT, "category_id": "k2", "period_month": "2026-10-01", "limit_amount": 400000})]
    assert res.json()["data"]["spent"] == 0
    assert res.json()["data"]["status"] == "aman"


def test_tambah_ganda_409(db):  # noqa: F811
    _isi(db)
    res = client.post(URL, json={"household_id": RT, "category_id": "k1", "period_month": "2026-09-01", "limit_amount": 1000})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "CONFLICT"
    assert db.ditulis == []


def test_tambah_oleh_anak_403(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    res = client.post(URL, json={"household_id": RT, "category_id": "k2", "period_month": "2026-10-01", "limit_amount": 1000})
    assert res.status_code == 403
    assert db.ditulis == []


def test_tambah_tidak_valid_400(db):  # noqa: F811
    for badan in (
        {"household_id": RT, "category_id": "k2", "period_month": "2026-10-15", "limit_amount": 1000},
        {"household_id": RT, "category_id": "k2", "period_month": "2026-10", "limit_amount": 1000},
        {"household_id": RT, "category_id": "k2", "period_month": "2026-10-01", "limit_amount": -1},
        {"household_id": RT, "category_id": "k2", "period_month": "2026-10-01", "limit_amount": 1000.5},
        {"household_id": RT, "category_id": "k2", "period_month": "2026-10-01", "limit_amount": 1000, "spent": 5},
    ):
        res = client.post(URL, json=badan)
        assert res.status_code == 400, badan
        assert res.json()["error"]["details"]


# ---------- ubah dan hapus ----------
def test_ubah_batas_200(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "ibu"
    res = client.patch(f"{URL}/b1", json={"limit_amount": 580000})
    assert res.status_code == 200
    assert db.ditulis == [("patch", "budgets", {"limit_amount": 580000})]
    assert res.json()["data"]["usage_percent"] == 75
    assert res.json()["data"]["status"] == "aman"


def test_ubah_body_kosong_400(db):  # noqa: F811
    _isi(db)
    assert client.patch(f"{URL}/b1", json={}).status_code == 400


def test_ubah_oleh_anak_403(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    assert client.patch(f"{URL}/b1", json={"limit_amount": 10}).status_code == 403


def test_hapus_200(db):  # noqa: F811
    _isi(db)
    res = client.delete(f"{URL}/b1")
    assert res.status_code == 200
    assert res.json() == {"data": None, "message": "baris dihapus"}
    assert db.ditulis == [("delete", "budgets", {"id": "eq.b1"})]


def test_hapus_oleh_anak_403(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    assert client.delete(f"{URL}/b1").status_code == 403
    assert db.ditulis == []


def test_hapus_rumah_tangga_lain_404(db):  # noqa: F811
    _isi(db)
    assert client.delete(f"{URL}/b9").status_code == 404
