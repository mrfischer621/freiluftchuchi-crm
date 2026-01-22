-- =====================================================
-- MIGRATION: Year-End Closings (Jahresabschluss)
-- =====================================================
-- Purpose: Store year-end tax adjustments for Swiss Sole Proprietorships
-- Based on: Einnahmen-Überschuss-Rechnung with manual adjustments

-- =====================================================
-- 1. CREATE TABLE: year_end_closings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.year_end_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked')),

    -- Flexible JSONB storage for all adjustment data
    data JSONB NOT NULL DEFAULT '{
        "assets": [],
        "private_shares": [],
        "social_security_provision": 0
    }'::jsonb,

    -- Cached final calculation (updated when saving)
    final_profit NUMERIC(12, 2) DEFAULT 0,

    -- Metadata
    locked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure one closing per company per year
    UNIQUE(company_id, year)
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_year_end_closings_company_id
    ON public.year_end_closings(company_id);

CREATE INDEX IF NOT EXISTS idx_year_end_closings_year
    ON public.year_end_closings(year);

CREATE INDEX IF NOT EXISTS idx_year_end_closings_status
    ON public.year_end_closings(status);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.year_end_closings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see closings for their own company
CREATE POLICY "Users can view their company's year-end closings"
    ON public.year_end_closings
    FOR SELECT
    USING (
        company_id IN (
            SELECT id FROM public.companies
            WHERE id = company_id
        )
    );

-- Policy: Users can insert closings for their own company
CREATE POLICY "Users can insert year-end closings for their company"
    ON public.year_end_closings
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT id FROM public.companies
            WHERE id = company_id
        )
    );

-- Policy: Users can update closings for their own company
CREATE POLICY "Users can update their company's year-end closings"
    ON public.year_end_closings
    FOR UPDATE
    USING (
        company_id IN (
            SELECT id FROM public.companies
            WHERE id = company_id
        )
    );

-- Policy: Users can delete closings for their own company
CREATE POLICY "Users can delete their company's year-end closings"
    ON public.year_end_closings
    FOR DELETE
    USING (
        company_id IN (
            SELECT id FROM public.companies
            WHERE id = company_id
        )
    );

-- =====================================================
-- 4. TRIGGER: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_year_end_closings_updated_at
    BEFORE UPDATE ON public.year_end_closings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE public.year_end_closings IS
    'Stores year-end closing adjustments for Swiss tax calculations';

COMMENT ON COLUMN public.year_end_closings.data IS
    'JSONB structure: {
        "assets": [{"name": "string", "value": number, "depreciation_rate": number, "amount": number}],
        "private_shares": [{"category": "string", "percentage": number, "amount": number}],
        "social_security_provision": number
    }';

COMMENT ON COLUMN public.year_end_closings.final_profit IS
    'Cached taxable income: (Income - Expense) - Depreciations + Private Shares - Provisions';

COMMENT ON COLUMN public.year_end_closings.status IS
    'draft: editable, locked: finalized and immutable';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
