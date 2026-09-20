/**
 * Onboarding — membuat workspace keluarga (langkah 3–6).
 * Landing & auth sudah dilewati user sebelum halaman ini tampil.
 */
import { useState } from 'react'
import { friendlyMessage } from '../../API/getData.js'
import {
  DEFAULT_MEMBER_SLOTS, FEATURE_FLAGS, MEMBER_ROLE, TRUST_COPY,
} from '../../lib/domain.js'
import { formatIDR, parseAmountInput } from '../../lib/money.js'
import { track } from '../../lib/analytics.js'
import { InlineBanner, TrustCallout } from '../../components/ui/feedback.jsx'
import {
  Button, Card, Chip, Field, MemberAvatar, TextInput, cx,
} from '../../components/ui/primitives.jsx'

const BUDGET_PRESETS = [1_000_000, 2_000_000, 5_000_000]
const GOAL_TEMPLATES = ['Dana darurat', 'Pendidikan anak', 'Liburan', 'Rumah']

/** Progress dots 6 langkah (landing & auth sudah dilewati user). */
function Stepper({ step, total = 6 }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Langkah ${step} dari ${total}`}>
      <span className="text-caption text-ink-500">
        Langkah {step}/{total}
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cx('h-1.5 w-4 rounded-full', i < step ? 'bg-brand-600' : 'bg-line')}
          />
        ))}
      </span>
    </div>
  )
}

function StepFrame({ step, title, subtitle, children, footer, onBack, optionalNote }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        {step > 3 ? (
          <button type="button" onClick={onBack} className="min-h-11 min-w-11 text-left text-label font-semibold text-ink-500">
            ← Kembali
          </button>
        ) : (
          <span />
        )}
        <Stepper step={step} />
      </div>

      <main className="flex flex-1 flex-col gap-5 py-6">
        <div>
          <h1 className="text-h1 font-bold">{title}</h1>
          <p className="mt-1 text-body text-ink-500">{subtitle}</p>
        </div>
        {children}
        {optionalNote}
      </main>

      <div className="safe-bottom flex flex-col gap-2">{footer}</div>
    </div>
  )
}

export default function OnboardingFlow({ onCreateHousehold, showToast }) {
  const [step, setStep] = useState(3)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(null)

  const [members, setMembers] = useState(() =>
    DEFAULT_MEMBER_SLOTS.map((slot) => ({ ...slot, enabled: true })),
  )

  const [budgetChoice, setBudgetChoice] = useState('skip')
  const [customBudget, setCustomBudget] = useState('')
  const [budgetError, setBudgetError] = useState(null)

  const [goal, setGoal] = useState({ name: '', target: '', deadline: '' })
  const [submitState, setSubmitState] = useState('idle')
  const [submitError, setSubmitError] = useState(null)

  const activeMembers = members.filter((m) => m.enabled)
  const overallValid = name.trim().length >= 2 && activeMembers.length >= 1

  function resolveBudgetAmount() {
    if (budgetChoice === 'skip') return { ok: true, amount: null }
    if (budgetChoice === 'custom') return parseAmountInput(customBudget)
    return { ok: true, amount: budgetChoice }
  }

  async function submit() {
    const budget = resolveBudgetAmount()
    if (!budget.ok) {
      setBudgetError(budget.error)
      return
    }
    setSubmitState('pending')
    setSubmitError(null)
    try {
      await onCreateHousehold({
        name: name.trim(),
        members: activeMembers.map((m) => ({
          display_name: m.display_name.trim(),
          role: m.role,
          slot: m.slot,
        })),
        budget_intent: budget.amount ? { amount: budget.amount } : null,
      })
      showToast('Household siap. Selamat datang di KeluargaFin!', 'success')
    } catch (error) {
      setSubmitError(friendlyMessage(error))
      setSubmitState('error')
    }
  }

  /* ----------------------------- Step: Household ---------------------------- */
  if (step === 3) {
    return (
      <StepFrame
        step={3}
        title="Namai workspace keluarga"
        subtitle="Satu workspace untuk Ayah, Ibu, dan Anak. Bisa diubah nanti."
        footer={
          <Button
            size="lg"
            disabled={!overallValid}
            onClick={() => {
              if (name.trim().length < 2) {
                setNameError('Nama household harus 2–60 karakter.')
                return
              }
              track('onboarding_step_viewed', { step: 'members' })
              setStep(4)
            }}
          >
            Lanjut
          </Button>
        }
      >
        <Field
          label="Nama household"
          htmlFor="hh-name"
          required
          error={nameError}
          hint="Contoh: Keluarga Wiguna"
        >
          <TextInput
            id="hh-name"
            value={name}
            maxLength={60}
            autoFocus
            placeholder="Keluarga Wiguna"
            invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'hh-name-error' : 'hh-name-hint'}
            onChange={(e) => {
              setName(e.target.value)
              setNameError(null)
            }}
          />
        </Field>

        <Card className="p-4">
          <dl className="flex flex-col gap-2 text-caption">
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Mata uang</dt>
              <dd className="font-semibold text-ink-900">IDR (Rp) — terkunci</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Zona waktu</dt>
              <dd className="font-semibold text-ink-900">Asia/Jakarta</dd>
            </div>
          </dl>
        </Card>

        <TrustCallout variant="compact" />
      </StepFrame>
    )
  }

  /* ------------------------------ Step: Members ----------------------------- */
  if (step === 4) {
    return (
      <StepFrame
        step={4}
        title="Siapa saja di rumah?"
        subtitle="Tiga profil sudah disiapkan. Ubah nama panggilan sesuai kebiasaan keluarga."
        footer={
          <Button
            size="lg"
            disabled={activeMembers.length === 0 || activeMembers.some((m) => !m.display_name.trim())}
            onClick={() => {
              track('member_profiles_created', { count: activeMembers.length })
              setStep(5)
            }}
          >
            Lanjut
          </Button>
        }
      >
        <ul className="flex flex-col gap-3">
          {members.map((member, index) => (
            <li key={member.slot}>
              <Card className={cx('p-3', !member.enabled && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <MemberAvatar name={member.display_name} slot={member.slot} />
                  <div className="min-w-0 flex-1">
                    <p className="text-label font-semibold text-ink-900">
                      {member.role_label}
                      <span className="ml-2 rounded-full border border-line bg-canvas px-2 py-0.5 text-micro font-medium text-ink-500">
                        {member.slot === 'anak' ? 'Profil tanpa login' : member.role}
                      </span>
                    </p>
                    <div className="mt-2">
                      <Field label="Nama panggilan" htmlFor={`member-${member.slot}`} required>
                        <TextInput
                          id={`member-${member.slot}`}
                          value={member.display_name}
                          disabled={!member.enabled}
                          maxLength={30}
                          onChange={(e) => {
                            const value = e.target.value
                            setMembers((prev) =>
                              prev.map((m, i) => (i === index ? { ...m, display_name: value } : m)),
                            )
                          }}
                        />
                      </Field>
                    </div>
                    {member.slot === 'anak' && (
                      <p className="mt-2 text-caption text-ink-500">
                        Anak dibuat sebagai profil household tanpa akun login pada MVP, dan total
                        household disembunyikan darinya sampai kamu mengizinkan.
                      </p>
                    )}
                  </div>
                </div>
                <label className="mt-3 flex min-h-11 items-center gap-2 text-caption text-ink-700">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#1D6FF2]"
                    checked={member.enabled}
                    disabled={member.slot === 'ayah'}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((m, i) => (i === index ? { ...m, enabled: e.target.checked } : m)),
                      )
                    }
                  />
                  Sertakan profil ini
                  {member.slot === 'ayah' && ' (kamu sendiri — wajib)'}
                </label>
              </Card>
            </li>
          ))}
        </ul>

        <InlineBanner tone="info">
          Peran tidak boleh kosong. Kamu bisa menambah anggota lain di Pengaturan → Anggota.
        </InlineBanner>
      </StepFrame>
    )
  }

  /* --------------------------- Step: Budget intent -------------------------- */
  if (step === 5) {
    return (
      <StepFrame
        step={5}
        onBack={() => setStep(4)}
        title="Pasang budget bulan ini?"
        subtitle="Opsional. Bisa diisi nanti — Dashboard tetap bisa dipakai tanpa budget."
        footer={
          <>
            <Button
              size="lg"
              onClick={() => {
                const resolved = resolveBudgetAmount()
                if (!resolved.ok) {
                  setBudgetError(resolved.error)
                  return
                }
                if (resolved.amount) track('budget_created', { source: 'onboarding', amount: resolved.amount })
                setBudgetError(null)
                if (FEATURE_FLAGS.goals) {
                  setStep(6)
                } else {
                  submit()
                }
              }}
            >
              {FEATURE_FLAGS.goals ? 'Lanjut' : 'Selesaikan & buka Dashboard'}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setBudgetChoice('skip')
                setBudgetError(null)
                setCustomBudget('')
                if (FEATURE_FLAGS.goals) {
                  setStep(6)
                } else {
                  submit()
                }
              }}
              loading={submitState === 'pending' && budgetChoice === 'skip'}
            >
              Nanti saja
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Chip selected={budgetChoice === 'skip'} onClick={() => setBudgetChoice('skip')}>
            Belum ada
          </Chip>
          {BUDGET_PRESETS.map((preset) => (
            <Chip
              key={preset}
              selected={budgetChoice === preset}
              onClick={() => {
                setBudgetChoice(preset)
                setBudgetError(null)
              }}
            >
              {formatIDR(preset)}
            </Chip>
          ))}
          <Chip selected={budgetChoice === 'custom'} onClick={() => setBudgetChoice('custom')}>
            Isi sendiri
          </Chip>
        </div>

        {budgetChoice === 'custom' && (
          <Field
            label="Nominal budget bulanan"
            htmlFor="budget-custom"
            required
            error={budgetError}
            hint="Angka penuh tanpa desimal, contoh: 3000000"
          >
            <TextInput
              id="budget-custom"
              inputMode="decimal"
              value={customBudget}
              invalid={Boolean(budgetError)}
              placeholder="3.000.000"
              aria-describedby={budgetError ? 'budget-custom-error' : 'budget-custom-hint'}
              onChange={(e) => {
                setCustomBudget(e.target.value)
                setBudgetError(null)
              }}
            />
          </Field>
        )}

        <InlineBanner tone="info" title="Budget menghitung pengeluaran approved saja">
          Transfer antar akun tidak mengurangi budget. Draft OCR juga belum dihitung.
        </InlineBanner>
      </StepFrame>
    )
  }

  /* ----------------------------- Step: Goal (opsional) ---------------------- */
  if (step === 6 && FEATURE_FLAGS.goals) {
    return (
      <StepFrame
        step={6}
        onBack={() => setStep(5)}
        title="Punya target menabung?"
        subtitle="Opsional. Target membantumu tahu apakah bulan ini masih aman."
        footer={
          <>
            <Button size="lg" onClick={submit} loading={submitState === 'pending'}>
              Selesaikan &amp; buka Dashboard
            </Button>
            <Button size="lg" variant="ghost" onClick={submit} loading={submitState === 'pending'}>
              Lewati
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {GOAL_TEMPLATES.map((tpl) => (
            <Chip key={tpl} selected={goal.name === tpl} onClick={() => setGoal((g) => ({ ...g, name: tpl }))}>
              {tpl}
            </Chip>
          ))}
        </div>
        <Field label="Nama target" htmlFor="goal-name">
          <TextInput
            id="goal-name"
            value={goal.name}
            onChange={(e) => setGoal((g) => ({ ...g, name: e.target.value }))}
          />
        </Field>
        <Field label="Nominal target" htmlFor="goal-target">
          <TextInput
            id="goal-target"
            inputMode="decimal"
            value={goal.target}
            onChange={(e) => setGoal((g) => ({ ...g, target: e.target.value }))}
          />
        </Field>
        <Field label="Tanggal target" htmlFor="goal-date">
          <TextInput
            id="goal-date"
            type="date"
            value={goal.deadline}
            onChange={(e) => setGoal((g) => ({ ...g, deadline: e.target.value }))}
          />
        </Field>
        {submitState === 'error' && submitError && (
          <InlineBanner tone="danger" title="Gagal menyimpan">
            {submitError}
          </InlineBanner>
        )}
      </StepFrame>
    )
  }

  /* ------------------------- Step: menyimpan household ---------------------- */
  return (
    <StepFrame
      step={5}
      title="Menyiapkan workspace…"
      subtitle="Sebentar ya, kami menyimpan household dan anggotanya."
      footer={
        submitState === 'error' ? (
          <Button size="lg" onClick={submit} loading={submitState === 'pending'}>
            Coba lagi
          </Button>
        ) : (
          <Button size="lg" loading disabled>
            Menyimpan…
          </Button>
        )
      }
    >
      {submitState === 'error' && submitError && (
        <InlineBanner tone="danger" title="Belum berhasil menyimpan">
          {submitError} Datamu tidak hilang — coba lagi tanpa mengulang isian.
        </InlineBanner>
      )}
      <TrustCallout variant="compact">{TRUST_COPY.retention}</TrustCallout>
      <p className="text-caption text-ink-500">
        Household dibuat dengan role <strong>{MEMBER_ROLE.OWNER}</strong> untukmu.
      </p>
    </StepFrame>
  )
}
