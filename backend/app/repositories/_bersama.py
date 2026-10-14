# fungsi bantu repository dompet dan kategori
# Penulis: Gilang Nur Adha
from app.core.errors import AppError


def tabel_belum_ada(error: AppError) -> bool:
    """PostgREST menjawab 404 bila tabel (misal transactions, migrasi 0006) belum dipasang."""
    return error.code == "SUPABASE_ERROR" and any(d.get("status") == 404 for d in error.details)
