import { Link } from 'react-router-dom'
import { buttonClasses, Card } from '../../components/ui/primitives.jsx'
import { TrustCallout } from '../../components/ui/feedback.jsx'

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-8">
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-label font-bold text-white"
        >
          K
        </span>
        <span className="text-h2 font-semibold">KeluargaFin</span>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 py-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-[32px] font-bold leading-[40px] tracking-tight text-ink-900">
            Kelola uang rumah tangga tanpa ribet.
          </h1>
          <p className="text-body text-ink-500">
            Catat pengeluaran semudah mengirim bukti pembayaran, lihat siapa memakai uang untuk apa,
            lalu putuskan bersama, Ayah, Ibu, dan Anak dalam satu workspace.
          </p>
        </div>

        <ul className="flex flex-col gap-2 text-caption text-ink-700">
          <li>✓ Satu keluarga, tiga profil: Ayah, Ibu, Anak</li>
          <li>✓ Tanpa menghubungkan rekening bank</li>
          <li>✓ Semua angka yang kamu lihat bisa diverifikasi ke transaksinya</li>
        </ul>

        <Card className="p-4">
          <h2 className="text-h2 font-semibold">Bulan ini keluarga kita aman?</h2>
          <p className="mt-1 text-caption text-ink-500">
            Pertanyaan pertama yang dijawab Beranda, bukan saldo akun pribadi.
          </p>
          <div className="mt-3 flex items-baseline justify-between rounded-xl bg-canvas px-3 py-2">
            <span className="text-caption text-ink-500">Sisa budget bulan ini</span>
            <span className="money text-h1 font-bold text-ink-900">Rp1.850.000</span>
          </div>
        </Card>

        <TrustCallout variant="compact" />
      </main>

      <footer className="safe-bottom flex flex-col gap-2">
        <Link to="/masuk" className={buttonClasses({ size: 'lg' })}>
          Buat keluarga
        </Link>
        <Link to="/masuk" className={buttonClasses({ size: 'lg', variant: 'ghost' })}>
          Masuk
        </Link>
      </footer>
    </div>
  )
}
