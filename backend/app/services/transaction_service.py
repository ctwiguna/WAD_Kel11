# aturan bisnis transaksi: bentuk transfer, pembatalan catatan, dan penyaring daftar
# Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
from app.core.errors import AppError, forbidden, not_found
from app.repositories import transactions as repo
from app.services import akses
from app.services.urutan import ke_order

KOLOM_SORT = {"txn_date", "created_at", "amount"}
JENIS_BOLEH = ("expense", "income", "transfer")


def _saring(household_id: str, jenis: str | None, category_id: str | None,
            member_id: str | None, dari: str | None, sampai: str | None) -> dict:
    """Saring daftar: rumah tangga, jenis, kategori, anggota, dan rentang tanggal."""
    saring: dict = {"household_id": f"eq.{household_id}", "deleted_at": "is.null"}
    if jenis:
        saring["type"] = f"eq.{jenis}"
    if category_id:
        saring["category_id"] = f"eq.{category_id}"
    if member_id:
        saring["member_id"] = f"eq.{member_id}"
    if dari and sampai:
        saring["txn_date"] = [f"gte.{dari}", f"lte.{sampai}"]
    elif dari:
        saring["txn_date"] = f"gte.{dari}"
    elif sampai:
        saring["txn_date"] = f"lte.{sampai}"
    return saring


def _cek_bentuk(data: dict) -> None:
    """Transfer wajib punya dompet tujuan, jenis lain justru tidak boleh punya."""
    if data.get("type") == "transfer":
        if not data.get("to_account_id"):
            raise AppError(
                400, "VALIDATION_ERROR", "Transfer wajib mencantumkan dompet tujuan.",
                [{"field": "to_account_id", "issue": "wajib diisi untuk type transfer"}],
            )
        if data.get("account_id") == data.get("to_account_id"):
            raise AppError(
                400, "VALIDATION_ERROR", "Dompet asal dan dompet tujuan tidak boleh sama.",
                [{"field": "to_account_id", "issue": "harus berbeda dari account_id"}],
            )
    elif data.get("to_account_id"):
        raise AppError(
            400, "VALIDATION_ERROR", "Hanya transfer yang boleh punya dompet tujuan.",
            [{"field": "to_account_id", "issue": "kosongkan untuk expense atau income"}],
        )


async def _ambil_terlihat(token: str, txn_id: str, user: dict) -> tuple[dict, str | None]:
    catatan = await repo.ambil(token, txn_id)
    if not catatan:
        raise not_found("Transaksi tidak ditemukan.")
    peran = await akses.peran(token, catatan["household_id"], user)
    if peran is None:
        raise not_found("Transaksi tidak ditemukan.")
    return catatan, peran


def _boleh_menulis(catatan: dict, peran: str | None, user: dict) -> None:
    """Ayah dan Ibu boleh mengubah semua catatan, anak hanya catatannya sendiri."""
    if peran not in akses.PERAN_PENULIS and catatan.get("created_by") != user.get("sub"):
        raise forbidden("Hanya pencatatnya, Ayah, atau Ibu yang boleh mengubah transaksi ini.")


async def daftar(token, user, household_id, jenis, category_id, member_id, dari, sampai, sort, limit, offset) -> tuple[list, int, int]:
    await akses.wajib_anggota(token, household_id, user)
    if jenis and jenis not in JENIS_BOLEH:
        raise AppError(
            400, "VALIDATION_ERROR", "Jenis transaksi tidak dikenal.",
            [{"field": "type", "issue": "pakai expense, income, atau transfer"}],
        )
    order = ke_order(sort, KOLOM_SORT, "txn_date.desc")
    baris, total = await repo.daftar(
        token, _saring(household_id, jenis, category_id, member_id, dari, sampai), order, limit, offset
    )
    jumlah = sum(int(b.get("amount") or 0) for b in baris)
    return baris, total, jumlah


async def detail(token, user, txn_id) -> dict:
    catatan, _ = await _ambil_terlihat(token, txn_id, user)
    return catatan


async def tambah(token, user, data: dict) -> dict:
    # Semua peran boleh mencatat transaksi, termasuk anak, sesuai kontrak.
    await akses.wajib_anggota(token, data["household_id"], user)
    _cek_bentuk(data)
    return await repo.tambah(token, {**data, "created_by": user["sub"]})


async def ubah(token, user, txn_id, perubahan: dict) -> dict:
    if not perubahan:
        raise AppError(
            400, "VALIDATION_ERROR", "Tidak ada data untuk diperbarui.",
            [{"field": "body", "issue": "kirim minimal satu kolom"}],
        )
    catatan, peran = await _ambil_terlihat(token, txn_id, user)
    _boleh_menulis(catatan, peran, user)
    _cek_bentuk({**catatan, **perubahan})
    baris = await repo.ubah(token, txn_id, perubahan)
    if not baris:
        raise not_found("Transaksi tidak ditemukan.")
    return baris


async def hapus(token, user, txn_id) -> None:
    """Pembatalan catatan, bukan hapus permanen."""
    catatan, peran = await _ambil_terlihat(token, txn_id, user)
    _boleh_menulis(catatan, peran, user)
    await repo.hapus_lunak(token, txn_id)
