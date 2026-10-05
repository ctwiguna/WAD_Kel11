# pembuatan berkas CSV laporan, dipakai endpoint /reports/export.csv
#
# Berkas ini terpisah dari report_service mengikuti struktur folder pada
# dokumen acuan. Pengambilan data mentah dan perhitungan tetap memakai fungsi
# di report_service, supaya angka pada CSV berasal dari satu sumber saja.
from app.services import report_service


def _aman(nilai) -> str:
    """Bungkus nilai CSV yang memuat koma, tanda kutip, atau baris baru."""
    teks = "" if nilai is None else str(nilai)
    if any(x in teks for x in (",", '"', "\n")):
        return '"' + teks.replace('"', '""') + '"'
    return teks


async def berkas_csv(token: str, household_id: str, dari: str, sampai: str) -> str:
    """Berkas CSV transaksi, dibuat backend, siap diunduh pengguna."""
    baris = await report_service.transaksi_rentang(token, household_id, dari, sampai)
    kategori = await report_service.rest_select(
        "categories", {"household_id": f"eq.{household_id}", "select": "id,name"}, token
    )
    anggota = await report_service.rest_select(
        "household_members", {"household_id": f"eq.{household_id}", "select": "id,display_name"}, token
    )
    nama_kategori = {k["id"]: k["name"] for k in kategori}
    nama_anggota = {a["id"]: a["display_name"] for a in anggota}

    tajuk = "tanggal,jenis,kategori,anggota,merchant,catatan,nominal"
    isi = [tajuk]
    for b in baris:
        isi.append(
            ",".join(
                [
                    _aman(b.get("txn_date")),
                    _aman(b.get("type")),
                    _aman(nama_kategori.get(b.get("category_id"), "")),
                    _aman(nama_anggota.get(b.get("member_id"), "")),
                    _aman(b.get("merchant")),
                    _aman(b.get("notes")),
                    _aman(b.get("amount")),
                ]
            )
        )
    return "\n".join(isi) + "\n"
