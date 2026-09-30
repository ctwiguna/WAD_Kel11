-- ============================================================
-- Migrasi Tabel: goals & goal_contributions
-- Penulis: Arjuna Rangga Lengkey
-- Revisi: Penyesuaian Kontrak API, Tipe Data BIGINT & Kebijakan RLS
-- ============================================================

-- 1. Tipe ENUM untuk Status Goals
DO $$ BEGIN
    CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Membuat Tabel Goals (Target Keuangan)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    target_amount BIGINT NOT NULL CHECK (target_amount > 0),
    deadline DATE,
    icon VARCHAR(8),
    color CHAR(7) NOT NULL DEFAULT '#10B981',
    status goal_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Membuat Tabel Goal Contributions (Riwayat Setoran Target)
CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.household_members(id) ON DELETE RESTRICT,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    notes TEXT,
    contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indeks untuk Optimasi Performa Query
CREATE INDEX IF NOT EXISTS idx_goals_household ON public.goals (household_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON public.goal_contributions (goal_id);

-- ============================================================
-- 5. Kebijakan Row Level Security (RLS)
-- ============================================================

-- Aktifkan RLS pada kedua tabel
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- Policy RLS untuk goals (akses diperiksa lewat keanggotaan rumah tangga)
DROP POLICY IF EXISTS goals_household_policy ON public.goals;
CREATE POLICY goals_household_policy ON public.goals
    FOR ALL
    USING (
        household_id IN (
            SELECT household_id FROM public.household_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM public.household_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy RLS untuk goal_contributions (lewat goal_id menuju goals.household_id)
DROP POLICY IF EXISTS goal_contributions_household_policy ON public.goal_contributions;
CREATE POLICY goal_contributions_household_policy ON public.goal_contributions
    FOR ALL
    USING (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE household_id IN (
                SELECT household_id FROM public.household_members
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.goals
            WHERE household_id IN (
                SELECT household_id FROM public.household_members
                WHERE user_id = auth.uid()
            )
        )
    );