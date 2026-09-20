/**
 * BottomSheet — panel bawah (mobile) / dialog (desktop).
 * Perilaku: Esc menutup, klik backdrop menutup, scroll body dikunci saat terbuka.
 */
import { useEffect } from 'react'
import { cx } from './primitives.jsx'

export function BottomSheet({ open, onClose, title, description, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div
        className="absolute inset-0 bg-ink-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-slide-up relative flex max-h-[92dvh] w-full flex-col overflow-hidden',
          'rounded-t-[20px] border border-line bg-surface shadow-lg',
          'sm:max-w-2xl lg:rounded-2xl',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-h2 font-semibold">{title}</h2>
            {description && <p className="text-caption text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="min-h-11 min-w-11 rounded-xl text-ink-500 hover:bg-canvas"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="safe-bottom border-t border-line bg-surface px-4 pt-3">{footer}</div>
        )}
      </div>
    </div>
  )
}
