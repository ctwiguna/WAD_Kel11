import { useState } from 'react'
import { addMember, updateMember, friendlyMessage } from '../../API/getData.js'
import { MEMBER_ROLE, MEMBER_ROLE_LABEL } from '../../lib/domain.js'
import { formatDateTime } from '../../lib/money.js'
import { track } from '../../lib/analytics.js'
import { BottomSheet } from '../../components/ui/BottomSheet.jsx'
import { InlineBanner } from '../../components/ui/feedback.jsx'
import {
  Button, Card, Chip, Field, MemberAvatar, SectionHeader, StatusPill, TextInput,
} from '../../components/ui/primitives.jsx'

/** Matriks visibilitas per peran. */
const VISIBILITY = [
  { label: 'Total keluarga & budget', owner: true, co: true, child: false },
  { label: 'Catat transaksi', owner: true, co: true, child: 'own' },
  { label: 'Budget & goal keluarga', owner: true, co: true, child: false },
  { label: 'Kelola anggota (invite/revoke)', owner: true, co: false, child: false },
  { label: 'Export laporan', owner: true, co: true, child: false },
]

const mark = (v) => (v === true ? '✅' : v === 'own' ? '✅ miliknya' : '⛔')

export default function MembersPage({ household, role, onRefreshHousehold, showToast }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState({ display_name: '', role: MEMBER_ROLE.CO_MANAGER })
  const [formError, setFormError] = useState(null)
  const [pending, setPending] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const isOwner = role === MEMBER_ROLE.OWNER
  const members = household?.members ?? []

  async function handleAddMember() {
    const name = form.display_name.trim()
    if (!name) {
      setFormError('Nama anggota wajib diisi.')
      return
    }
    if (!form.role) {
      setFormError('Peran tidak boleh kosong.')
      return
    }
    setPending(true)
    setFormError(null)
    try {
      await addMember(household.id, {
        display_name: name,
        role: form.role,
        slot: 'custom',
      })
      track('member_added', { role: form.role })
      await onRefreshHousehold?.()
      setSheetOpen(false)
      setForm({ display_name: '', role: MEMBER_ROLE.CO_MANAGER })
      showToast(`Profil “${name}” ditambahkan.`, 'success')
    } catch (error) {
      setFormError(friendlyMessage(error))
    } finally {
      setPending(false)
    }
  }

  async function handleUpdateMember(member, patch) {
    setBusyId(member.id)
    try {
      await updateMember(household.id, member.id, patch)
      await onRefreshHousehold?.()
      showToast('Perubahan tersimpan dan tercatat di audit log.', 'success')
    } catch (error) {
      showToast(friendlyMessage(error), 'danger')
    } finally {
      setBusyId(null)
    }
  }

  if (!household) return null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold">Anggota</h1>
          <p className="text-caption text-ink-500">
            Peranmu: <strong>{MEMBER_ROLE_LABEL[role] ?? role}</strong>
          </p>
        </div>
        {isOwner && <Button onClick={() => setSheetOpen(true)}>+ Tambah</Button>}
      </div>

      <ul className="flex flex-col gap-3">
        {members.map((m) => (
          <li key={m.id}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <MemberAvatar name={m.display_name} slot={m.slot} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-label font-semibold text-ink-900">{m.display_name}</span>
                    <StatusPill tone={m.status === 'active' ? 'success' : m.status === 'pending' ? 'warning' : 'danger'}>
                      {m.status === 'active' ? 'Aktif' : m.status === 'pending' ? 'Menunggu' : 'Dicabut'}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 text-caption text-ink-500">
                    {MEMBER_ROLE_LABEL[m.role] ?? m.role}
                    {!m.user_id && ' · profil tanpa login'}
                  </p>
                  <p className="mt-0.5 text-micro text-ink-500">
                    Dibuat {formatDateTime(m.created_at)}
                  </p>

                  {isOwner && m.role !== MEMBER_ROLE.OWNER && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="text-caption text-ink-500" htmlFor={`role-${m.id}`}>
                        Peran
                      </label>
                      <select
                        id={`role-${m.id}`}
                        value={m.role}
                        disabled={busyId === m.id}
                        onChange={(e) => handleUpdateMember(m, { role: e.target.value })}
                        className="min-h-11 rounded-xl border border-line bg-surface px-2 text-caption"
                      >
                        <option value={MEMBER_ROLE.CO_MANAGER}>{MEMBER_ROLE_LABEL.co_manager}</option>
                        <option value={MEMBER_ROLE.CHILD}>{MEMBER_ROLE_LABEL.child}</option>
                      </select>
                      <Button
                        size="sm"
                        variant={m.status === 'active' ? 'secondary' : 'primary'}
                        disabled={busyId === m.id}
                        onClick={() =>
                          handleUpdateMember(m, { status: m.status === 'active' ? 'revoked' : 'active' })
                        }
                      >
                        {m.status === 'active' ? 'Cabut akses' : 'Aktifkan'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {!isOwner && (
        <InlineBanner tone="info" title="Aksesmu berubah">
          Hanya owner yang bisa mengubah peran dan mencabut akses. Punya pertanyaan? Hubungi owner
          keluarga.
        </InlineBanner>
      )}

      <div>
        <SectionHeader
          title="Siapa bisa melihat apa"
          hint="Item yang tidak diizinkan disembunyikan, bukan dimatikan abu-abu."
        />
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-caption">
            <caption className="sr-only">
              Matriks visibilitas data per peran anggota keluarga
            </caption>
            <thead className="bg-canvas text-left text-micro uppercase text-ink-500">
              <tr>
                <th scope="col" className="px-3 py-2">Elemen</th>
                <th scope="col" className="px-3 py-2">Ayah</th>
                <th scope="col" className="px-3 py-2">Ibu</th>
                <th scope="col" className="px-3 py-2">Anak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {VISIBILITY.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink-900">
                    {row.label}
                  </th>
                  <td className="px-3 py-2">{mark(row.owner)}</td>
                  <td className="px-3 py-2">{mark(row.co)}</td>
                  <td className="px-3 py-2">{mark(row.child)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-micro text-ink-500">
          Anak default tidak melihat total keluarga. Owner dapat mengizinkan nanti di P1.
        </p>
      </div>

      <InlineBanner tone="info" title="Invite one-time link, menyusul">
        Sprint 1 membuat profil anggota di dalam keluarga. Undangan lewat tautan one-time
        masuk bersama Google Sheets di P1.
      </InlineBanner>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Tambah profil anggota"
        description="Profil tanpa login, tidak butuh email atau kredensial apa pun."
        footer={
          <div className="pt-1">
            <Button size="lg" onClick={handleAddMember} loading={pending} disabled={pending}>
              Simpan profil
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nama panggilan" htmlFor="new-member-name" required>
            <TextInput
              id="new-member-name"
              value={form.display_name}
              maxLength={30}
              placeholder="Contoh: Nenek"
              onChange={(e) => {
                setForm((f) => ({ ...f, display_name: e.target.value }))
                setFormError(null)
              }}
            />
          </Field>
          <fieldset>
            <legend className="text-label font-semibold text-ink-900">
              Peran <span className="text-danger-fg">*</span>
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[MEMBER_ROLE.CO_MANAGER, MEMBER_ROLE.CHILD].map((r) => (
                <Chip key={r} selected={form.role === r} onClick={() => setForm((f) => ({ ...f, role: r }))}>
                  {MEMBER_ROLE_LABEL[r]}
                </Chip>
              ))}
            </div>
          </fieldset>
          {formError && (
            <p role="alert" className="text-caption font-medium text-danger-fg">
              {formError}
            </p>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
