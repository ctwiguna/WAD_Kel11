/**
 * State kosong / error / banner + TrustCallout.
 * Sumber copy: PRD §9.2 & §9.3, DESIGN_SPEC §6.
 */
import React, { useEffect } from 'react'
import { TRUST_COPY } from '../../lib/domain.js'
import { Button, Card, cx } from './primitives.jsx'

/* ------------------------------ TrustCallout --------------------------- */

/**
 * Dipakai di 3 tempat: Auth (onboarding langkah 1), Upload sheet,
 * Settings > Privacy & Data (DESIGN_SPEC §6).
 */
export function TrustCallout({ variant = 'inline', children, className }) {
  const text = children ?? TRUST_COPY.full
  if (variant === 'compact') {
    return (
      <p
        className={cx(
          'flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-caption text-brand-900',
          className,
        )}
      >
        <span aria-hidden="true">🔒</span>
        <span>{text}</span>
      </p>
    )
  }
  return (
    <div
      className={cx('rounded-2xl border border-brand-100 bg-brand-50 p-3', className)}
      role="note"
    >
      <p className="flex items-start gap-2 text-caption text-brand-900">
        <span aria-hidden="true">🔒</span>
        <span>{text}</span>
      </p>
    </div>
  )
}

/* ------------------------------- Banners ------------------------------ */

const BANNER_TONE = {
  info: { wrap: 'border-brand-100 bg-brand-50 text-brand-900', icon: 'ℹ' },
  warning: { wrap: 'border-warning-fg/25 bg-warning-bg text-warning-fg', icon: '⚠' },
  danger: { wrap: 'border-danger-fg/25 bg-danger-bg text-danger-fg', icon: '✕' },
  success: { wrap: 'border-success-fg/25 bg-success-bg text-success-fg', icon: '✓' },
}

export function InlineBanner({ tone = 'info', title, children, action, className }) {
  const conf = BANNER_TONE[tone] ?? BANNER_TONE.info
  return (
    <div
      className={cx('flex gap-2 rounded-xl border px-3 py-2.5 text-caption', conf.wrap, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span aria-hidden="true" className="mt-0.5">
        {conf.icon}
      </span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

export function ErrorState({ title = 'Gagal memuat', message, onRetry, retryLabel = 'Coba lagi', className }) {
  return (
    <Card className={cx('p-4', className)}>
      <div className="flex gap-3">
        <span aria-hidden="true" className="text-h2">
          ⚠
        </span>
        <div className="flex-1">
          <h3 className="text-h2 font-semibold">{title}</h3>
          <p className="mt-1 text-caption text-ink-500">
            {message ?? 'Ada gangguan saat mengambil data. Datamu tetap aman.'}
          </p>
          {onRetry && (
            <Button variant="secondary" className="mt-3" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function EmptyState({ icon = '📝', title, children, actions, className }) {
  return (
    <Card className={cx('p-5 text-center', className)}>
      <div aria-hidden="true" className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-h2">
        {icon}
      </div>
      <h3 className="text-h2 font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-sm text-caption text-ink-500">{children}</p>}
      {actions && <div className="mt-4 flex flex-col gap-2">{actions}</div>}
    </Card>
  )
}

export function FullPageError({ title, message, action }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas p-6 text-center">
      <span aria-hidden="true" className="text-display">
        🔒
      </span>
      <h1 className="text-h1 font-bold">{title}</h1>
      <p className="max-w-sm text-body text-ink-500">{message}</p>
      {action}
    </div>
  )
}

/* -------------------------------- Toast ------------------------------- */

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => onDismiss?.(), toast.duration ?? 4000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null
  const conf = BANNER_TONE[toast.tone ?? 'success']
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] z-40 flex justify-center px-4 lg:bottom-6"
    >
      <div
        className={cx(
          'animate-slide-up pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-3 py-2.5 text-caption shadow-lg',
          conf.wrap,
        )}
      >
        <span aria-hidden="true">{conf.icon}</span>
        <div className="flex-1">{toast.message}</div>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-6 min-w-6 text-ink-500"
          aria-label="Tutup notifikasi"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** Kartu "belum dikerjakan" — jujur menyebut fitur ada di sprint berikutnya. */
export function ComingSoonCard({ title, sprint, children, className }) {
  return (
    <Card className={cx('p-5', className)}>
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-1 text-micro font-medium text-ink-500">
        <span aria-hidden="true">🗓</span> {sprint}
      </span>
      <h2 className="mt-3 text-h2 font-semibold">{title}</h2>
      <p className="mt-1 text-caption text-ink-500">{children}</p>
    </Card>
  )
}
