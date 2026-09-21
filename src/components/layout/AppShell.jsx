/**
 * AppShell — navigasi utama (mobile: bottom tab + FAB, desktop: sidebar).
 * Tab aktif disimpan sebagai state sederhana; perpindahan halaman memakai <Link>.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TRUST_COPY, UPLOAD_LIMITS } from '../../lib/domain.js'
import { BottomSheet } from '../ui/BottomSheet.jsx'
import { InlineBanner, TrustCallout } from '../ui/feedback.jsx'
import {
  IconChart, IconHome, IconList, IconPencil, IconPlus, IconTarget, IconUpload, IconWallet,
} from '../icons.jsx'
import { Button, MemberAvatar, cx } from '../ui/primitives.jsx'

const TABS = [
  { to: '/app', label: 'Beranda', icon: IconHome, exact: true },
  { to: '/app/transactions', label: 'Transaksi', icon: IconList },
  { to: '/app/budget', label: 'Budget', icon: IconWallet },
  { to: '/app/goals', label: 'Goals', icon: IconTarget },
  { to: '/app/report', label: 'Laporan', icon: IconChart },
]

function AvatarStack({ members }) {
  const shown = members.slice(0, 3)
  const rest = members.length - shown.length
  return (
    <div className="flex items-center" aria-label={`${members.length} anggota keluarga`}>
      {shown.map((m, i) => (
        <span key={m.id} className={cx(i > 0 && '-ml-2')}>
          <span className="inline-block rounded-full ring-2 ring-surface">
            <MemberAvatar name={m.display_name} slot={m.slot} size="sm" />
          </span>
        </span>
      ))}
      {rest > 0 && (
        <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full bg-canvas text-micro font-semibold text-ink-500 ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </div>
  )
}

export function AppShell({ household, children }) {
  const members = household?.members ?? []
  const [activeTab, setActiveTab] = useState(window.location.pathname)
  const [addOpen, setAddOpen] = useState(false)
  const [uploadNotice, setUploadNotice] = useState(false)

  function isActive(tab) {
    if (tab.exact) return activeTab === tab.to
    return activeTab.startsWith(tab.to)
  }

  function selectTab(tab) {
    setActiveTab(tab.to)
  }

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-surface">
        <div className="border-b border-line px-4 py-4">
          <p className="text-micro font-medium text-ink-500">Workspace keluarga</p>
          <p className="truncate text-h2 font-semibold">{household?.name ?? 'KeluargaFin'}</p>
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 p-2">
          <ul className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  onClick={() => selectTab(tab)}
                  aria-current={isActive(tab) ? 'page' : undefined}
                  className={cx(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-label',
                    isActive(tab)
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'text-ink-700 hover:bg-canvas',
                  )}
                >
                  <tab.icon />
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line p-2">
          <Link
            to="/app/settings/privacy"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-label text-ink-700 hover:bg-canvas"
          >
            🔒 Privasi &amp; Data
          </Link>
          <Link
            to="/app/settings/members"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-label text-ink-700 hover:bg-canvas"
          >
            👨‍👩‍👧 Anggota
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* AppBar sticky */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4">
          <div className="min-w-0">
            <p className="truncate text-micro text-ink-500">Workspace keluarga</p>
            <p className="truncate text-label font-semibold text-ink-900">
              {household?.name ?? 'KeluargaFin'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/app/settings/members"
              className="min-h-11 rounded-xl px-1"
              aria-label="Kelola anggota keluarga"
            >
              <AvatarStack members={members} />
            </Link>
            <Button
              size="sm"
              variant="secondary"
              className="hidden lg:inline-flex"
              onClick={() => setAddOpen(true)}
            >
              <IconPlus className="size-4" />
              Tambah
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-28 pt-4 md:max-w-[768px] lg:max-w-[1120px] lg:pb-10">
          {children}
        </main>

        {/* Bottom tab bar + FAB (mobile) */}
        <nav
          aria-label="Navigasi utama"
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pt-2 lg:hidden"
        >
          <ul className="mx-auto flex max-w-[560px] items-stretch justify-between px-2">
            {[TABS[0], TABS[1]].map((tab) => (
              <TabItem key={tab.to} tab={tab} active={isActive(tab)} onSelect={selectTab} />
            ))}
            <li className="w-16 shrink-0" aria-hidden="true" />
            {[TABS[2], TABS[3]].map((tab) => (
              <TabItem key={tab.to} tab={tab} active={isActive(tab)} onSelect={selectTab} />
            ))}
            <TabItem tab={TABS[4]} active={isActive(TABS[4])} onSelect={selectTab} />
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Tambah transaksi atau bukti"
          className={cx(
            'fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] right-4 z-40 flex size-14 items-center justify-center',
            'rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 lg:hidden',
          )}
        >
          <IconPlus className="size-6" />
        </button>
      </div>

      {/* Sheet "Tambah" — 2 opsi */}
      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah"
        description="Catat manual atau unggah bukti transaksi."
      >
        <ul className="flex flex-col gap-2">
          <li>
            <OptionRow
              icon={<IconPencil className="size-5" />}
              title="Catat manual"
              subtitle="Isi jenis, nominal, tanggal, kategori, dan anggota."
              to="/app/transactions"
              onClick={() => setAddOpen(false)}
            />
          </li>
          <li>
            <OptionRow
              icon={<IconUpload className="size-5" />}
              title="Upload bukti"
              subtitle="Struk, screenshot, atau invoice PDF."
              badge="Sprint 2"
              onClick={() => {
                setAddOpen(false)
                setUploadNotice(true)
              }}
            />
          </li>
        </ul>
        <TrustCallout variant="compact" className="mt-4" />
      </BottomSheet>

      {/* Notice jujur: upload belum aktif di Sprint 1 */}
      <BottomSheet
        open={uploadNotice}
        onClose={() => setUploadNotice(false)}
        title="Upload & OCR: Sprint 2"
        description="Kontraknya sudah dipatok, implementasinya menyusul."
      >
        <div className="flex flex-col gap-3">
          <InlineBanner tone="info" title="Belum tersedia di Sprint 1">
            Sprint ini fokus pada manual transaction dan dashboard. Upload + review OCR dikerjakan
            Sprint 2 mengikuti PRD §6.2 dan §8.
          </InlineBanner>
          <p className="text-caption text-ink-500">
            Batas yang sudah dipatok: {UPLOAD_LIMITS.mime.join(', ').replace(/image\/|application\//g, '')} ·
            maks {UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB · maks {UPLOAD_LIMITS.maxPages} halaman ·
            maks {UPLOAD_LIMITS.maxFilesPerBatch} file sekali unggah.
          </p>
          <TrustCallout variant="compact">{TRUST_COPY.upload}</TrustCallout>
          <Link
            to="/app/transactions"
            onClick={() => setUploadNotice(false)}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-600 px-5 text-label font-semibold text-white hover:bg-brand-700"
          >
            Catat manual saja
          </Link>
        </div>
      </BottomSheet>
    </div>
  )
}

function TabItem({ tab, active, onSelect }) {
  return (
    <li className="flex-1">
      <Link
        to={tab.to}
        onClick={() => onSelect(tab)}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-micro',
          active ? 'font-semibold text-brand-600' : 'text-ink-500',
        )}
      >
        <tab.icon />
        <span>{tab.label}</span>
      </Link>
    </li>
  )
}

export function OptionRow({ icon, title, subtitle, badge, to, onClick }) {
  const className =
    'flex w-full min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-left hover:border-brand-100 hover:bg-brand-50/40'
  const content = (
    <>
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-label font-semibold text-ink-900">{title}</span>
          {badge && (
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-micro text-ink-500">
              {badge}
            </span>
          )}
        </span>
        <span className="block text-caption text-ink-500">{subtitle}</span>
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}
