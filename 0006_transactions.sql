-- ============================================================
-- Migrasi tabel transactions (catatan keuangan keluarga)
-- Penulis: Apri Kuncoro
-- Dipasang setelah households, household_members, accounts, dan
-- categories (0002, 0003, 0004, 0005).
-- Cadangan disiapkan tim pada 4 Oktober 2026 supaya tonggak minggu
-- pertama tidak tertunda.
-- Transfer antar dompet memakai kolom to_account_id dan tetap satu baris.
-- ============================================================

-- 1. Enum jenis transaksi
do $$ begin
    create type transaction_type as enum ('expense', 'income', 'transfer');
exception
    when duplicate_object then null;
end $$;

-- 2. Tabel transactions
create table if not exists public.transactions (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id) on delete restrict,
    account_id    uuid not null references public.accounts(id) on delete restrict,
    to_account_id uuid references public.accounts(id) on delete restrict,
    category_id   uuid references public.categories(id) on delete set null,
    member_id     uuid not null references public.household_members(id) on delete restrict,
    type          transaction_type not null,
    amount        bigint not null check (amount > 0),
    txn_date      date not null,
    merchant      varchar(140),
    notes         text,
    created_by    uuid not null references auth.users(id) on delete restrict,
    created_at    timestamptz not null default now(),
    deleted_at    timestamptz,
    constraint transfer_perlu_tujuan check
        (type <> 'transfer' or to_account_id is not null)
);

-- 3. Indeks untuk daftar transaksi dan laporan bulanan
create index if not exists idx_txn_household_tanggal
    on public.transactions (household_id, txn_date desc)
    where deleted_at is null;

create index if not exists idx_txn_household_kategori
    on public.transactions (household_id, category_id);

create index if not exists idx_txn_household_anggota
    on public.transactions (household_id, member_id);

-- 4. RLS: batas data per rumah tangga, peran anak hanya catatannya sendiri
alter table public.transactions enable row level security;

drop policy if exists transaksi_baca_anggota on public.transactions;
create policy transaksi_baca_anggota on public.transactions
    for select
    using (
        private.is_household_member(household_id)
        and (
            private.household_role(household_id) in ('ayah', 'ibu')
            or member_id = (
                select m.id from public.household_members m
                where m.household_id = transactions.household_id
                  and m.user_id = auth.uid()
            )
        )
    );

drop policy if exists transaksi_tambah_anggota on public.transactions;
create policy transaksi_tambah_anggota on public.transactions
    for insert
    with check (
        private.is_household_member(household_id)
        and created_by = auth.uid()
    );

drop policy if exists transaksi_ubah_penulis on public.transactions;
create policy transaksi_ubah_penulis on public.transactions
    for update
    using (
        private.is_household_member(household_id)
        and (
            private.household_role(household_id) in ('ayah', 'ibu')
            or created_by = auth.uid()
        )
    )
    with check (
        private.is_household_member(household_id)
        and (
            private.household_role(household_id) in ('ayah', 'ibu')
            or created_by = auth.uid()
        )
    );

drop policy if exists transaksi_hapus_penulis on public.transactions;
create policy transaksi_hapus_penulis on public.transactions
    for delete
    using (
        private.is_household_member(household_id)
        and (
            private.household_role(household_id) in ('ayah', 'ibu')
            or created_by = auth.uid()
        )
    );
