/**
 * Primitif UI — komponen kecil yang dipakai berulang.
 * Aturan yang dipegang: target tap >= 44px, focus ring tidak pernah dihapus,
 * status selalu ikon + label teks (tidak pernah warna saja).
 */

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* ------------------------------- Button ------------------------------- */

const VARIANTS = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 disabled:bg-ink-300 disabled:text-white',
  secondary:
    'bg-surface text-brand-700 border border-brand-500 hover:bg-brand-50 disabled:text-ink-300 disabled:border-ink-300',
  ghost: 'bg-transparent text-ink-700 hover:bg-canvas',
  danger: 'bg-danger-fg text-white hover:opacity-90',
  link: 'bg-transparent text-brand-700 underline underline-offset-4 hover:text-brand-900',
}

const SIZES = {
  md: 'min-h-11 px-4 text-label',
  lg: 'min-h-[52px] px-5 text-label w-full',
  sm: 'min-h-9 px-3 text-caption',
}

/**
 * Kelas tombol untuk elemen non-<button> (mis. <Link>).
 * Wajib dipakai daripada membungkus Button di dalam Link — tombol di dalam
 * anchor menelan klik sehingga navigasi tidak jalan.
 */
export function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors no-underline',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  loading = false,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

/* -------------------------------- Card -------------------------------- */

export function Card({ as: Tag = 'section', className, children, ...rest }) {
  return (
    <Tag className={cx('rounded-2xl border border-line bg-surface', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function SectionHeader({ title, action, hint, id }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <h2 id={id} className="text-h2 font-semibold">
          {title}
        </h2>
        {hint && <p className="text-caption text-ink-500">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/* -------------------------------- Field ------------------------------- */

export function Field({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-label font-semibold text-ink-900">
        {label}
        {required && (
          <span className="text-danger-fg" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-caption text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-caption font-medium text-danger-fg">
          {error}
        </p>
      )}
    </div>
  )
}

const inputBase =
  'w-full min-h-11 rounded-xl border bg-surface px-3 text-body text-ink-900 placeholder:text-ink-300 ' +
  'focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:border-brand-500 outline-none'

export function TextInput({ invalid, className, ...rest }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(inputBase, invalid ? 'border-warning-fg' : 'border-line', className)}
      {...rest}
    />
  )
}

export function Select({ invalid, className, children, ...rest }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(inputBase, 'appearance-none pr-9', invalid ? 'border-warning-fg' : 'border-line', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

export function TextArea({ invalid, className, ...rest }) {
  return (
    <textarea
      rows={3}
      aria-invalid={invalid || undefined}
      className={cx(inputBase, 'py-2', invalid ? 'border-warning-fg' : 'border-line', className)}
      {...rest}
    />
  )
}

/* -------------------------------- Chip -------------------------------- */

export function Chip({ selected = false, className, children, ...rest }) {
  const isButton = rest.onClick || rest.type
  const Tag = isButton ? 'button' : 'span'
  return (
    <Tag
      type={isButton ? rest.type ?? 'button' : undefined}
      aria-pressed={isButton ? selected : undefined}
      className={cx(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-colors',
        selected
          ? 'border-brand-600 bg-brand-50 text-brand-700'
          : 'border-line bg-surface text-ink-700 hover:border-brand-100',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* ------------------------------ StatusPill ---------------------------- */

const STATUS_TONE = {
  success: { cls: 'border-success-fg/25 bg-success-bg text-success-fg', icon: '✓' },
  warning: { cls: 'border-warning-fg/25 bg-warning-bg text-warning-fg', icon: '⚠' },
  danger: { cls: 'border-danger-fg/25 bg-danger-bg text-danger-fg', icon: '✕' },
  info: { cls: 'border-brand-100 bg-brand-50 text-brand-700', icon: '•' },
  neutral: { cls: 'border-line bg-canvas text-ink-500', icon: '•' },
}

/** Status tidak boleh dikodekan warna saja: selalu ikon + label. */
export function StatusPill({ tone = 'neutral', icon, children, className }) {
  const conf = STATUS_TONE[tone] ?? STATUS_TONE.neutral
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-micro font-medium',
        conf.cls,
        className,
      )}
    >
      <span aria-hidden="true">{icon ?? conf.icon}</span>
      {children}
    </span>
  )
}

/* ---------------------------- MemberAvatar ---------------------------- */

const MEMBER_TONE_CLS = {
  ayah: 'bg-ayah',
  ibu: 'bg-ibu',
  anak: 'bg-anak',
}

export function MemberAvatar({ name = '?', slot, size = 'md', className }) {
  const initial = String(name).trim().charAt(0).toUpperCase() || '?'
  const sizes = { sm: 'size-7 text-micro', md: 'size-10 text-label', lg: 'size-12 text-h2' }
  return (
    <span
      // Inisial + nama selalu berdampingan di UI; warna bukan penanda tunggal.
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        MEMBER_TONE_CLS[slot] ?? 'bg-ink-500',
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

/* ----------------------------- ProgressBar ---------------------------- */

export function ProgressBar({ percent = 0, tone = 'brand', label, className }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
  const tones = {
    brand: 'bg-brand-600',
    success: 'bg-success-fg',
    warning: 'bg-warning-fg',
    danger: 'bg-danger-fg',
  }
  return (
    <div
      className={cx('h-2 w-full overflow-hidden rounded-full bg-canvas', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx('h-full rounded-full transition-[width]', tones[tone] ?? tones.brand)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/* ------------------------------ Skeleton ------------------------------ */

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cx('animate-shimmer rounded-xl bg-line/70', className)}
    />
  )
}

/* ------------------------------- Spinner ------------------------------ */

export function Spinner({ className, label = 'Memuat' }) {
  return (
    <svg
      className={cx('animate-spin', className ?? 'size-5')}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export { cx }
