# uji router /transactions dan aturan bentuk transfer
# Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.palsu_supabase import RT, RT_LAIN, db  # noqa: F401

client = TestClient(app, raise_server_exceptions=False)
URL = "/api/v1/transactions"

BELANJA = {
    "id": "t1", "household_id": RT, "account_id": "d1", "to_account_id": None, "category_id": "k1",
    "member_id": "m1", "type": "expense", "amount": 250000, "txn_date": "2026-09-10",
    "merchant": "Warung", "notes": None, "created_by": "u1", "deleted_at": None,
}
PINDAH = {
    "id": "t2", "household_id": RT, "account_id": "d1", "to_account_id": "d2", "category_id": None,
    "member_id": "m1", "type": "transfer", "amount": 100000, "txn_date": "2026-09-11",
    "merchant": None, "notes": None, "created_by": "u1", "deleted_at": None,
}
MILIK_LAIN = {**BELANJA, "id": "t9", "household_id": RT_LAIN}


def _isi(db_tiruan):
    db_tiruan.tabel["transactions"] = [BELANJA, PINDAH, MILIK_LAIN]


# ---------- autentikasi dan baca ----------
def test_tanpa_token_401():
    res = client.get(f"{URL}?household_id={RT}")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"


def test_daftar_bentuk_dan_total_amount(db):  # noqa: F811
    _isi(db)
    res = client.get(f"{URL}?household_id={RT}")
    assert res.status_code == 200
    isi = res.json()
    assert set(isi) == {"data", "meta", "links"}
    assert isi["meta"]["page"] == 1 and isi["meta"]["per_page"] == 20
    assert isi["meta"]["total"] == 2
    assert isi["meta"]["total_amount"] == 350000
    assert [t["id"] for t in isi["data"]] == ["t1", "t2"]
    assert "X-Request-Id" in res.headers


def test_urutan_bawaan_tanggal_menurun(db):  # noqa: F811
    _isi(db)
    client.get(f"{URL}?household_id={RT}")
    assert db.params_terakhir["transactions"]["order"] == "txn_date.desc"


def test_urutan_pilihan(db):  # noqa: F811
    _isi(db)
    client.get(f"{URL}?household_id={RT}&sort=amount:asc")
    assert db.params_terakhir["transactions"]["order"] == "amount.asc"


def test_saringan_lengkap_diteruskan(db):  # noqa: F811
    _isi(db)
    client.get(f"{URL}?household_id={RT}&type=expense&category_id=k1&member_id=m1&from=2026-09-01&to=2026-09-30")
    q = db.params_terakhir["transactions"]
    assert q["household_id"] == f"eq.{RT}"
    assert q["deleted_at"] == "is.null"
    assert q["type"] == "eq.expense" and q["category_id"] == "eq.k1" and q["member_id"] == "eq.m1"
    assert q["txn_date"] == ["gte.2026-09-01", "lte.2026-09-30"]


def test_transaksi_terhapus_tidak_ikut(db):  # noqa: F811
    db.tabel["transactions"] = [BELANJA, {**PINDAH, "deleted_at": "2026-09-20T10:00:00Z"}]
    res = client.get(f"{URL}?household_id={RT}")
    assert [t["id"] for t in res.json()["data"]] == ["t1"]


def test_sort_tidak_dikenal_400(db):  # noqa: F811
    assert client.get(f"{URL}?household_id={RT}&sort=merchant:asc").status_code == 400


def test_jenis_tidak_dikenal_400(db):  # noqa: F811
    res = client.get(f"{URL}?household_id={RT}&type=belanja")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_detail_rumah_tangga_lain_404(db):  # noqa: F811
    _isi(db)
    res = client.get(f"{URL}/t9")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_anak_boleh_membaca(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    assert client.get(f"{URL}/t1").status_code == 200


def test_bukan_anggota_daftar_403(db):  # noqa: F811
    assert client.get(f"{URL}?household_id={RT_LAIN}").status_code == 403


# ---------- tambah ----------
def test_tambah_pengeluaran_201(db):  # noqa: F811
    res = client.post(URL, json={
        "household_id": RT, "account_id": "d1", "category_id": "k1", "member_id": "m1",
        "type": "expense", "amount": 45000, "txn_date": "2026-09-21", "merchant": "Kopi",
    })
    assert res.status_code == 201
    ditulis = db.ditulis[0]
    assert ditulis[1] == "transactions"
    assert ditulis[2]["created_by"] == "u1"
    assert ditulis[2]["amount"] == 45000


def test_tambah_oleh_anak_boleh(db):  # noqa: F811
    db.peran[RT] = "anak"
    res = client.post(URL, json={
        "household_id": RT, "account_id": "d1", "category_id": "k1", "member_id": "m3",
        "type": "expense", "amount": 15000, "txn_date": "2026-09-21",
    })
    assert res.status_code == 201


def test_tambah_transfer_tanpa_dompet_tujuan_400(db):  # noqa: F811
    res = client.post(URL, json={
        "household_id": RT, "account_id": "d1", "member_id": "m1",
        "type": "transfer", "amount": 50000, "txn_date": "2026-09-21",
    })
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    assert db.ditulis == []


def test_tambah_transfer_dompet_sama_400(db):  # noqa: F811
    res = client.post(URL, json={
        "household_id": RT, "account_id": "d1", "to_account_id": "d1", "member_id": "m1",
        "type": "transfer", "amount": 50000, "txn_date": "2026-09-21",
    })
    assert res.status_code == 400


def test_tambah_pengeluaran_dengan_dompet_tujuan_400(db):  # noqa: F811
    res = client.post(URL, json={
        "household_id": RT, "account_id": "d1", "to_account_id": "d2", "member_id": "m1",
        "type": "expense", "amount": 50000, "txn_date": "2026-09-21",
    })
    assert res.status_code == 400


@pytest.mark.parametrize("badan", [
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "belanja", "amount": 1000, "txn_date": "2026-09-21"},
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "expense", "amount": 0, "txn_date": "2026-09-21"},
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "expense", "amount": -5, "txn_date": "2026-09-21"},
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "expense", "amount": 1000.5, "txn_date": "2026-09-21"},
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "expense", "amount": 1000, "txn_date": "21-09-2026"},
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "expense", "amount": 1000, "txn_date": "2026-09-21", "merchant": "x" * 141},
    {"household_id": RT, "account_id": "d1", "type": "expense", "amount": 1000, "txn_date": "2026-09-21"},
    {"household_id": RT, "account_id": "d1", "member_id": "m1", "type": "expense", "amount": 1000, "txn_date": "2026-09-21", "current_balance": 1},
])
def test_tambah_tidak_valid_400(db, badan):  # noqa: F811
    res = client.post(URL, json=badan)
    assert res.status_code == 400
    assert res.json()["error"]["details"]


def test_tambah_di_rumah_tangga_lain_403(db):  # noqa: F811
    res = client.post(URL, json={
        "household_id": RT_LAIN, "account_id": "d9", "member_id": "m9",
        "type": "expense", "amount": 1000, "txn_date": "2026-09-21",
    })
    assert res.status_code == 403


# ---------- ubah ----------
def test_ubah_sebagian(db):  # noqa: F811
    _isi(db)
    res = client.patch(f"{URL}/t1", json={"amount": 300000})
    assert res.status_code == 200
    assert db.ditulis == [("patch", "transactions", {"amount": 300000})]


def test_ubah_body_kosong_400(db):  # noqa: F811
    _isi(db)
    assert client.patch(f"{URL}/t1", json={}).status_code == 400


def test_ubah_jenis_jadi_transfer_tanpa_tujuan_400(db):  # noqa: F811
    _isi(db)
    res = client.patch(f"{URL}/t1", json={"type": "transfer"})
    assert res.status_code == 400
    assert db.ditulis == []


def test_ubah_jenis_jadi_transfer_dengan_tujuan_200(db):  # noqa: F811
    _isi(db)
    res = client.patch(f"{URL}/t1", json={"type": "transfer", "to_account_id": "d2"})
    assert res.status_code == 200


def test_anak_hanya_boleh_ubah_catatannya_sendiri(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    assert client.patch(f"{URL}/t1", json={"amount": 1}).status_code == 200
    db.tabel["transactions"] = [{**BELANJA, "created_by": "u2"}]
    assert client.patch(f"{URL}/t1", json={"amount": 1}).status_code == 403


def test_ibu_boleh_ubah_catatan_anak(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "ibu"
    db.tabel["transactions"] = [{**BELANJA, "created_by": "u3"}]
    assert client.patch(f"{URL}/t1", json={"amount": 5000}).status_code == 200


def test_ubah_rumah_tangga_lain_404(db):  # noqa: F811
    _isi(db)
    assert client.patch(f"{URL}/t9", json={"amount": 1}).status_code == 404


# ---------- hapus ----------
def test_hapus_mengisi_deleted_at(db):  # noqa: F811
    _isi(db)
    res = client.delete(f"{URL}/t1")
    assert res.status_code == 200
    assert res.json() == {"data": None, "message": "baris dihapus"}
    assert db.ditulis == [("patch", "transactions", {"deleted_at": "now()"})]


def test_hapus_oleh_anak_orang_lain_403(db):  # noqa: F811
    _isi(db)
    db.peran[RT] = "anak"
    db.tabel["transactions"] = [{**BELANJA, "created_by": "u2"}]
    assert client.delete(f"{URL}/t1").status_code == 403


def test_hapus_rumah_tangga_lain_404(db):  # noqa: F811
    _isi(db)
    assert client.delete(f"{URL}/t9").status_code == 404
    assert db.ditulis == []
