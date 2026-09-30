-- ============================================================
-- Migrasi tabel household_members (anggota rumah tangga)
-- Penulis: Nizar Hermawan
-- Dipasang setelah 0002_households.sql
-- Berisi: tabel anggota, fungsi bantu RLS, kebijakan RLS untuk
-- household_members dan households, serta trigger yang menjadikan
-- pembuat rumah tangga sebagai anggota berperan ayah.
-- ============================================================

-- peran anggota
do $$ begin
    create type member_role as enum ('ayah', 'ibu', 'anak');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.household_members (
    id                 uuid primary key default gen_random_uuid(),
    household_id       uuid not null references public.households(id) on delete cascade,
    user_id            uuid not null references auth.users(id) on delete cascade,
    role               member_role not null,
    display_name       varchar(60) not null,
    can_approve_budget boolean not null default false,
    joined_at          timestamptz not null default now(),
    -- satu pengguna hanya satu kali menjadi anggota pada rumah tangga yang sama
    unique (household_id, user_id)
);

create index if not exists idx_household_members_user
    on public.household_members (user_id);

alter table public.household_members enable row level security;

-- ------------------------------------------------------------
-- Fungsi bantu RLS.
-- security definer membuat pembacaan household_members di dalam
-- fungsi tidak memicu kebijakan tabel itu lagi, sehingga tidak ada
-- rekursi tak terbatas saat kebijakan household_members merujuk
-- tabelnya sendiri.
-- ------------------------------------------------------------
create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.household_members
        where household_id = p_household_id
          and user_id = auth.uid()
    );
$$;

create or replace function public.household_role(p_household_id uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
    select role from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
    limit 1;
$$;

-- ------------------------------------------------------------
-- Kebijakan household_members
-- baca: semua anggota rumah tangga; tulis: hanya ayah
-- ------------------------------------------------------------
drop policy if exists anggota_baca on public.household_members;
create policy anggota_baca on public.household_members
    for select
    using (public.is_household_member(household_id));

drop policy if exists anggota_tambah on public.household_members;
create policy anggota_tambah on public.household_members
    for insert
    with check (public.household_role(household_id) = 'ayah');

drop policy if exists anggota_ubah on public.household_members;
create policy anggota_ubah on public.household_members
    for update
    using (public.household_role(household_id) = 'ayah')
    with check (public.household_role(household_id) = 'ayah');

drop policy if exists anggota_hapus on public.household_members;
create policy anggota_hapus on public.household_members
    for delete
    using (public.household_role(household_id) = 'ayah');

-- ------------------------------------------------------------
-- Kebijakan households
-- baca: pemilik atau anggota (pemilik disertakan supaya hasil INSERT
--       ... RETURNING lolos sebelum trigger anggota berjalan)
-- tambah: hanya untuk dirinya sendiri sebagai pemilik
-- ubah: hanya ayah, termasuk penghapusan lunak lewat deleted_at
-- hapus permanen: tidak ada kebijakan, jadi ditolak
-- Penyaringan deleted_at dilakukan di API, bukan di RLS, karena
-- kebijakan baca yang menyaring deleted_at membuat UPDATE penghapusan
-- lunak gagal saat baris baru diperiksa.
-- ------------------------------------------------------------
drop policy if exists rumah_baca on public.households;
create policy rumah_baca on public.households
    for select
    using (owner_user_id = auth.uid() or public.is_household_member(id));

drop policy if exists rumah_tambah on public.households;
create policy rumah_tambah on public.households
    for insert
    with check (owner_user_id = auth.uid());

drop policy if exists rumah_ubah on public.households;
create policy rumah_ubah on public.households
    for update
    using (public.household_role(id) = 'ayah')
    with check (public.household_role(id) = 'ayah');

-- ------------------------------------------------------------
-- Pembuat rumah tangga otomatis menjadi anggota berperan ayah,
-- sehingga tidak terjadi kebuntuan: hanya ayah yang boleh menambah
-- anggota, tetapi rumah tangga baru belum punya ayah.
-- ------------------------------------------------------------
create or replace function public.tambah_pemilik_sebagai_ayah()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.household_members
        (household_id, user_id, role, display_name, can_approve_budget)
    values (
        new.id,
        new.owner_user_id,
        'ayah',
        coalesce((select full_name from public.profiles where id = new.owner_user_id), 'Ayah'),
        true
    )
    on conflict (household_id, user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists trg_tambah_pemilik_sebagai_ayah on public.households;
create trigger trg_tambah_pemilik_sebagai_ayah
    after insert on public.households
    for each row execute function public.tambah_pemilik_sebagai_ayah();