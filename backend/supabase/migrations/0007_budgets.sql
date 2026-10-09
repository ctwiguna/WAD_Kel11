-- ============================================================
-- Migrasi tabel budgets (batas pengeluaran per kategori per bulan)
-- Penulis: Apri Kuncoro
-- Dipasang setelah households, categories, dan transactions
-- (0002, 0005, 0006).
-- Cadangan disiapkan tim pada 4 Oktober 2026 supaya sesuai timeline.
-- Satu kategori hanya punya satu anggaran per bulan, dijaga batasan unik.
-- Batas pemakaian dan sisanya dihitung backend saat data dibaca.
-- ============================================================

-- 1. Tabel budgets
create table if not exists public.budgets (
    id           uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete restrict,
    category_id  uuid not null references public.categories(id) on delete cascade,
    period_month date not null,
    limit_amount bigint not null check (limit_amount >= 0),
    created_by   uuid not null references auth.users(id) on delete restrict,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    constraint period_awal_bulan check (extract(day from period_month) = 1),
    constraint budget_unik_per_bulan unique (household_id, category_id, period_month)
);

create index if not exists idx_budgets_periode
    on public.budgets (household_id, period_month);

-- 2. Trigger updated_at, memakai fungsi bersama yang sama seperti 0004
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at
    before update on public.budgets
    for each row execute function public.set_updated_at();

-- 3. RLS: seluruh anggota membaca, hanya ayah dan ibu yang menulis
alter table public.budgets enable row level security;

drop policy if exists anggaran_baca_anggota on public.budgets;
create policy anggaran_baca_anggota on public.budgets
    for select
    using (private.is_household_member(household_id));

drop policy if exists anggaran_tulis_ayah_ibu on public.budgets;
create policy anggaran_tulis_ayah_ibu on public.budgets
    for all
    using (private.household_role(household_id) in ('ayah', 'ibu'))
    with check (private.household_role(household_id) in ('ayah', 'ibu'));
