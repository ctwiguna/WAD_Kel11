/**
 * App — pemilik state utama: household aktif dan toast.
 * Tanpa layar auth/onboarding: aplikasi langsung membuka Beranda
 * dengan keluarga demo (dibuat otomatis saat aplikasi dimuat).
 */
import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell.jsx'
import { FullPageError, Toast } from './components/ui/feedback.jsx'
import { Button, Spinner } from './components/ui/primitives.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import TransactionsPage from './features/transactions/TransactionsPage.jsx'
import BudgetPage from './features/budget/BudgetPage.jsx'
import MembersPage from './features/household/MembersPage.jsx'
import PrivacyPage from './features/household/PrivacyPage.jsx'
import { GoalsPage, ReportPage } from './features/placeholder/ComingSoon.jsx'
import { ensureDemoHousehold, getHousehold } from './API/getData.js'

export default function App() {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [household, setHousehold] = useState(null)
  const [role, setRole] = useState(null)
  const [toast, setToast] = useState(null)
  const [bootError, setBootError] = useState(null)

  useEffect(() => {
    boot()
  }, [])

  /** Siapkan keluarga demo lalu buka Beranda. */
  async function boot() {
    setStatus('loading')
    setBootError(null)
    try {
      const { household: active } = await ensureDemoHousehold()
      await loadHousehold(active.id)
      setStatus('ready')
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

  /* status === 'ready' */
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <AppShell household={household}>
              <DashboardPage household={household} />
            </AppShell>
          }
        />
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
              <PrivacyPage household={household} showToast={showToast} />
            </AppShell>
          }
        />
        {/* Alamat lain diarahkan ke Beranda */}
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
