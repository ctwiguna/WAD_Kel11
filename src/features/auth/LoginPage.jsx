import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TRUST_COPY } from '../../lib/domain.js'
import { friendlyMessage } from '../../API/getData.js'
import { InlineBanner, TrustCallout } from '../../components/ui/feedback.jsx'
import { Button, Card, Field, TextInput } from '../../components/ui/primitives.jsx'
import { track } from '../../lib/analytics.js'

export default function LoginPage({
  onSignInWithGoogle,
  onRequestMagicLink,
  onConsumeMagicLink,
  showToast,
}) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [status, setStatus] = useState('idle') // idle | pending | sent | error
  const [sentTo, setSentTo] = useState(null)
  const [devToken, setDevToken] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  async function handleGoogle() {
    setStatus('pending')
    setErrorMessage(null)
    try {
      await onSignInWithGoogle()
    } catch (error) {
      setErrorMessage(friendlyMessage(error))
      setStatus('error')
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault()
    setEmailError(null)
    setErrorMessage(null)
    setStatus('pending')
    try {
      const res = await onRequestMagicLink(email.trim())
      setSentTo(res.email)
      setDevToken(res.dev_token ?? null)
      setStatus('sent')
      showToast(`Tautan masuk dikirim ke ${res.email}`, 'success')
    } catch (error) {
      setErrorMessage(friendlyMessage(error))
      setStatus('error')
    }
  }

  async function handleOpenLink() {
    setStatus('pending')
    try {
      await onConsumeMagicLink(devToken)
    } catch (error) {
      setErrorMessage(friendlyMessage(error))
      setStatus('error')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-8">
      <Link to="/" className="text-label font-semibold text-ink-500">
        ← Kembali
      </Link>

      <main className="flex flex-1 flex-col justify-center gap-5 py-8">
        <div>
          <h1 className="text-h1 font-bold">Masuk ke KeluargaFin</h1>
          <p className="mt-1 text-body text-ink-500">
            Pakai Google atau email. Tanpa kredensial bank.
          </p>
        </div>

        <TrustCallout />

        {status === 'error' && errorMessage && (
          <InlineBanner
            tone="danger"
            title="Belum berhasil"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setStatus('idle')
                  setErrorMessage(null)
                }}
              >
                Coba lagi
              </Button>
            }
          >
            {errorMessage}
          </InlineBanner>
        )}

        <Button
          variant="secondary"
          size="lg"
          onClick={handleGoogle}
          loading={status === 'pending'}
          disabled={status === 'pending' || status === 'sent'}
        >
          Lanjut dengan Google
        </Button>

        <div className="flex items-center gap-3 text-caption text-ink-500">
          <span className="h-px flex-1 bg-line" />
          atau
          <span className="h-px flex-1 bg-line" />
        </div>

        {status !== 'sent' ? (
          <form className="flex flex-col gap-3" onSubmit={handleMagicLink} noValidate>
            <Field
              label="Email"
              htmlFor="login-email"
              required
              error={emailError}
              hint="Kami kirim tautan satu kali pakai yang berlaku 15 menit."
            >
              <TextInput
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="nama@email.com"
                value={email}
                invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'login-email-error' : 'login-email-hint'}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError(null)
                }}
              />
            </Field>
            <Button type="submit" size="lg" loading={status === 'pending'} disabled={status === 'pending'}>
              Login dengan email
            </Button>
          </form>
        ) : (
          <Card className="p-4">
            <h2 className="text-h2 font-semibold">Cek kotak masukmu</h2>
            <p className="mt-1 text-caption text-ink-500">
              Tautan masuk sudah dikirim ke <strong>{sentTo}</strong>. Berlaku 15 menit dan hanya bisa
              dipakai sekali.
            </p>
            {devToken && (
              <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
                <p className="text-micro text-ink-500">
                  Mode demo: data disimpan di browser, jadi tautan dibuka langsung di sini.
                </p>
                <Button size="sm" className="mt-2" onClick={handleOpenLink} loading={status === 'pending'}>
                  Buka tautan masuk
                </Button>
              </div>
            )}
            <Button
              variant="link"
              size="sm"
              className="mt-3"
              onClick={() => {
                track('auth_magic_link_resent')
                setStatus('idle')
                setSentTo(null)
                setDevToken(null)
              }}
            >
              Kirim ulang dengan email lain
            </Button>
          </Card>
        )}

        <p className="text-center text-caption text-ink-500">{TRUST_COPY.short}</p>
      </main>
    </div>
  )
}
