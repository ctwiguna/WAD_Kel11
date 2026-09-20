/**
 * App — pemilik state utama: sesi, household aktif, dan toast.
 * State dibagikan lewat props (bukan Context) supaya alurnya mudah diikuti.
 */
import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell.jsx'
import { FullPageError, Toast } from './components/ui/feedback.jsx'
import { Button, Spinner } from './components/ui/primitives.jsx'
import LandingPage from './features/auth/LandingPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import OnboardingFlow from './features/onboarding/OnboardingFlow.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import TransactionsPage from './features/transactions/TransactionsPage.jsx'
import BudgetPage from './features/budget/BudgetPage.jsx'
import MembersPage from './features/household/MembersPage.jsx'
import PrivacyPage from './features/household/PrivacyPage.jsx'
import { GoalsPage, ReportPage } from './features/placeholder/ComingSoon.jsx'
import {
  consumeMagicLink,
  createHousehold,
  getHousehold,
  getMe,
  requestMagicLink,
  signInWithGoogle,
  signOut,
} from './API/getData.js'

export default function App() {
  const [status, setStatus] = useState('loading') // loading | login | onboarding | ready | error
  const [user, setUser] = useState(null)
  const [household, setHousehold] = useState(null)
  const [role, setRole] = useState(null)
  const [toast, setToast] = useState(null)
  const [bootError, setBootError] = useState(null)

  useEffect(() => {
    boot()
  }, [])

  /** Cek sesi saat aplikasi dibuka. */
  async function boot() {
    setStatus('loading')
    setBootError(null)
    try {
      const me = await getMe()
      if (!me) {
        setUser(null)
        setHousehold(null)
        setStatus('login')
        return
      }
      setUser(me.user)
      if (me.household) {
        await loadHousehold(me.household.id)
        setStatus('ready')
      } else {
        setHousehold(null)
        setStatus('onboarding')
      }
    } catch (error) {
      setBootError(error)
      setStatus('error')
    }
  }

  /** Ambil detail household (members, categories, accounts). */
  async function loadHousehold(householdId) {
    const detail = await getHousehold(householdId)
    setHousehold({
      ...detail.household,
      members: detail.members,
      categories: detail.categories,
      accounts: detail.accounts,
    })
    setRole(detail.role)
    return detail
  }

  function showToast(message, tone = 'success', duration = 4000) {
    setToast({ message, tone, duration, id: Math.random().toString(36).slice(2) })
  }

  function dismissToast() {
    setToast(null)
  }

  /** Setelah login: ada household -> masuk app; belum ada -> onboarding. */
  async function applySession(session) {
    setUser(session.user)
    if (session.household) {
      await loadHousehold(session.household.id)
      setStatus('ready')
    } else {
      setStatus('onboarding')
    }
    return session
  }

  async function handleSignInWithGoogle() {
    return applySession(await signInWithGoogle())
  }

  async function handleConsumeMagicLink(token) {
    return applySession(await consumeMagicLink(token))
  }

  async function handleCreateHousehold(payload) {
    const result = await createHousehold(payload)
    if (result.household?.id) await loadHousehold(result.household.id)
    setStatus('ready')
    return result
  }

  async function handleSignOut() {
    await signOut()
    setUser(null)
    setHousehold(null)
    setRole(null)
    setStatus('login')
  }

  async function refreshHousehold() {
    if (!household?.id) return null
    return loadHousehold(household.id)
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas">
        <Spinner className="size-6 text-brand-600" label="Menyiapkan aplikasi" />
        <p className="text-caption text-ink-500">Menyiapkan aplikasi…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <FullPageError
        title="Belum bisa dibuka"
        message={bootError?.message ?? 'Aplikasi gagal dimuat. Coba muat ulang.'}
        action={<Button onClick={boot}>Coba lagi</Button>}
      />
    )
  }

  if (status === 'onboarding') {
    return (
      <OnboardingFlow onCreateHousehold={handleCreateHousehold} showToast={showToast} />
    )
  }

  if (status === 'login') {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/masuk"
          element={
            <LoginPage
              onSignInWithGoogle={handleSignInWithGoogle}
              onRequestMagicLink={requestMagicLink}
              onConsumeMagicLink={handleConsumeMagicLink}
              showToast={showToast}
            />
          }
        />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    )
  }

  /* status === 'ready' */
  return (
    <>
      <Routes>
        <Route
          path="/app"
          element={
            <AppShell household={household}>
              <DashboardPage household={household} />
            </AppShell>
          }
        />
        <Route
          path="/app/transactions"
          element={
            <AppShell household={household}>
              <TransactionsPage
                household={household}
                onRefreshHousehold={refreshHousehold}
                showToast={showToast}
              />
            </AppShell>
          }
        />
        <Route
          path="/app/budget"
          element={
            <AppShell household={household}>
              <BudgetPage household={household} showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/app/goals"
          element={
            <AppShell household={household}>
              <GoalsPage />
            </AppShell>
          }
        />
        <Route
          path="/app/report"
          element={
            <AppShell household={household}>
              <ReportPage />
            </AppShell>
          }
        />
        <Route
          path="/app/settings/members"
          element={
            <AppShell household={household}>
              <MembersPage
                household={household}
                role={role}
                onRefreshHousehold={refreshHousehold}
                showToast={showToast}
              />
            </AppShell>
          }
        />
        <Route
          path="/app/settings/privacy"
          element={
            <AppShell household={household}>
              <PrivacyPage
                household={household}
                onSignOut={handleSignOut}
                showToast={showToast}
              />
            </AppShell>
          }
        />
        {/* Alamat lain di dalam /app diarahkan ke Beranda */}
        <Route
          path="*"
          element={
            <AppShell household={household}>
              <DashboardPage household={household} />
            </AppShell>
          }
        />
      </Routes>
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  )
}
