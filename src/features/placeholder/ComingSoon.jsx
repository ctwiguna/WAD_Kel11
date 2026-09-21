import { ComingSoonCard, InlineBanner } from '../../components/ui/feedback.jsx'
import { Button, Card, SectionHeader, StatusPill } from '../../components/ui/primitives.jsx'
import { FEATURE_FLAGS } from '../../lib/domain.js'

export function GoalsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold">Goals</h1>
        <p className="text-caption text-ink-500">Target tabungan keluarga</p>
      </div>

      <ComingSoonCard title="Belum dibangun di Sprint 1" sprint="Sprint 3 sesuai roadmap PRD">
        Halaman ini sengaja tidak diisi dengan tombol palsu. Yang akan ada di sini: nama target,
        progress dari kontribusi approved, chip status on-track, ETA sederhana, dan rumus perhitungan
        di balik tooltip.
      </ComingSoonCard>

      <InlineBanner tone="info" title="Feature flag">
        FEATURE_FLAGS.goals = {String(FEATURE_FLAGS.goals)}. Ubah di src/lib/domain.js saat Sprint 3
        dimulai.
      </InlineBanner>
    </div>
  )
}

export function ReportPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold">Laporan</h1>
        <p className="text-caption text-ink-500">Export &amp; berbagi ringkasan</p>
      </div>

      <ComingSoonCard title="Belum dibangun di Sprint 1" sprint="Sprint 3 sesuai roadmap PRD">
        Export PDF, PNG, dan CSV (selalu tersedia sebagai fallback) dibuat di Sprint 3. Angka yang
        akan diekspor adalah angka yang sama yang kamu lihat di Beranda, tidak ada jalur hitung
        kedua.
      </ComingSoonCard>

      <Card className="p-4">
        <SectionHeader title="Aturan export yang mengikat" />
        <ul className="flex flex-col gap-2 text-caption text-ink-700">
          <li>• File memuat nama keluarga, periode, generated time, dan filter yang sedang aktif.</li>
          <li>• Ada disclaimer: bukan nasihat keuangan berlisensi.</li>
          <li>• Export yang gagal <strong>tidak pernah</strong> dilaporkan sukses, ditawarkan retry dan CSV.</li>
          <li>• Hanya transaksi approved yang masuk; transfer tetap dipisah dari pengeluaran.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone="neutral" icon="🗓">PDF: Sprint 3</StatusPill>
          <StatusPill tone="neutral" icon="🗓">PNG: Sprint 3</StatusPill>
          <StatusPill tone="neutral" icon="🗓">CSV: Sprint 3</StatusPill>
          <StatusPill tone="neutral" icon="🗓">Google Sheets: P2</StatusPill>
        </div>
      </Card>

      <Button variant="secondary" disabled>
        Export belum tersedia
      </Button>
      <p className="text-center text-micro text-ink-500">
        Tombol export dibiarkan nonaktif dengan alasan yang terlihat, bukan hilang tanpa penjelasan.
      </p>
    </div>
  )
}
