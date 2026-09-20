import { useState } from 'react'
import { wipeAllData } from '../../API/getData.js'
import { TRUST_COPY, UPLOAD_LIMITS } from '../../lib/domain.js'
import { eventLog } from '../../lib/analytics.js'
import { BottomSheet } from '../../components/ui/BottomSheet.jsx'
import { InlineBanner, TrustCallout } from '../../components/ui/feedback.jsx'
import { Button, Card, SectionHeader, StatusPill } from '../../components/ui/primitives.jsx'

export default function PrivacyPage({ household, onSignOut, showToast }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [failMode, setFailMode] = useState(() => {
    try {
      return localStorage.getItem('kf.failMode') ?? 'off'
    } catch {
      return 'off'
    }
  })
  const [events, setEvents] = useState([])

  function applyFailMode(value) {
    setFailMode(value)
    try {
      if (value === 'off') localStorage.removeItem('kf.failMode')
      else localStorage.setItem('kf.failMode', value)
    } catch {
      /* storage diblokir */
    }
    showToast(
      value === 'off'
        ? 'Mode simulasi dimatikan.'
        : `Mode simulasi aktif: ${value}. Buka halaman terkait untuk melihat error state.`,
      'info',
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-bold">Privasi &amp; Data</h1>
        <p className="text-caption text-ink-500">
          Apa yang kami simpan, berapa lama, dan bagaimana kamu menghapusnya.
        </p>
      </div>

      <TrustCallout />

      <Card className="p-4">
        <SectionHeader title="Data yang disimpan" />
        <ul className="flex flex-col gap-2 text-caption text-ink-700">
          <li>• Email dan cara kamu masuk (Google atau tautan email).</li>
          <li>• Transaksi yang kamu catat: nominal, tanggal, anggota, kategori, catatan.</li>
          <li>• Label akun seperti “Tunai”, “BCA”, atau “GoPay” — sekadar teks, bukan kredensial.</li>
          <li>• Audit log perubahan penting (anggota, transaksi, budget).</li>
        </ul>
        <p className="mt-3 text-caption font-semibold text-ink-900">Yang tidak pernah diminta</p>
        <p className="mt-1 text-caption text-ink-500">
          Password, PIN, OTP, atau login bank/e-wallet. Tidak ada field seperti itu di UI mana pun.
        </p>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Dokumen & retensi" />
        <p className="text-caption text-ink-700">{TRUST_COPY.retention}</p>
        <p className="mt-2 text-caption text-ink-500">
          Batas file: {UPLOAD_LIMITS.mime.join(', ')} · maks {UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB
          · maks {UPLOAD_LIMITS.maxPages} halaman PDF · maks {UPLOAD_LIMITS.maxFilesPerBatch} file
          sekali unggah. Upload belum aktif di Sprint 1.
        </p>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Pusat kontrol" />
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setEvents(eventLog())
              showToast(`${eventLog().length} event analitik tercatat sejak muat halaman.`, 'info')
            }}
          >
            Lihat event analitik (QA)
          </Button>
          {events.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-xl border border-line bg-canvas p-3 text-micro text-ink-700">
              <ul>
                {events.map((e, i) => (
                  <li key={`${e.event}-${i}`}>
                    {e.event} {JSON.stringify(e.props)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Hapus data di browser ini
          </Button>
          <Button variant="ghost" onClick={onSignOut}>
            Keluar dari akun
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Simulasi error (QA)"
          hint="Dipakai untuk menguji loading/empty/error/retry tanpa memutus jaringan."
        />
        <div className="flex flex-wrap gap-2">
          {['off', 'dashboard', 'budgets'].map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={failMode === mode ? 'primary' : 'secondary'}
              onClick={() => applyFailMode(mode)}
            >
              {mode === 'off' ? 'Normal' : `Gagalkan /${mode}`}
            </Button>
          ))}
        </div>
        {failMode !== 'off' && (
          <InlineBanner tone="warning" className="mt-3" title="Mode simulasi aktif">
            Permintaan ke halaman {failMode} akan mengembalikan error sampai kamu balik ke Normal.
          </InlineBanner>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader title="Yang belum ada di Sprint 1" />
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral" icon="🗓">Upload &amp; OCR — Sprint 2</StatusPill>
          <StatusPill tone="neutral" icon="🗓">Goals &amp; Export — Sprint 3</StatusPill>
          <StatusPill tone="neutral" icon="🗓">Advisor — P1 (feature flag)</StatusPill>
          <StatusPill tone="neutral" icon="🗓">Google Sheets — P2</StatusPill>
        </div>
        <p className="mt-3 text-caption text-ink-500">
          Household aktif: <strong>{household?.name ?? '—'}</strong>. Penghapusan akun end-to-end
          mengikuti backend; tombol di atas membersihkan data di browser ini.
        </p>
      </Card>

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Hapus data?"
        description="Semua household, transaksi, dan budget di browser ini akan dihapus."
      >
        <div className="flex flex-col gap-3">
          <InlineBanner tone="warning" title="Tindakan ini tidak bisa dibatalkan">
            Kamu akan kembali ke layar onboarding setelah data dihapus.
          </InlineBanner>
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              wipeAllData()
              setConfirmOpen(false)
              showToast('Data dihapus. Memuat ulang…', 'info', 1200)
              setTimeout(() => window.location.assign('/'), 600)
            }}
          >
            Ya, hapus semua data
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
