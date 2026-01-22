-- ================================================
-- MULTI-TENANCY MIGRATION SCRIPT
-- ================================================
-- Run this script in your Supabase SQL Editor
-- ================================================

-- Step 1: Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Step 2: Insert 2 initial companies
INSERT INTO companies (name, logo_url) VALUES
  ('Freiluftchuchi', NULL),
  ('Handelsfirma Müller', NULL)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Add company_id column to all tables (initially nullable)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Step 4: CRITICAL DATA MIGRATION - Set all existing rows to 'Freiluftchuchi'
-- This prevents data loss by assigning existing data to the default company
DO $$
DECLARE
  freiluftchuchi_id uuid;
BEGIN
  -- Get the ID of Freiluftchuchi
  SELECT id INTO freiluftchuchi_id FROM companies WHERE name = 'Freiluftchuchi';

  -- Update all tables with existing data
  UPDATE customers SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
  UPDATE projects SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
  UPDATE products SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
  UPDATE invoices SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
  UPDATE time_entries SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
  UPDATE transactions SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
  UPDATE expenses SET company_id = freiluftchuchi_id WHERE company_id IS NULL;
END $$;

-- Step 5: Make company_id NOT NULL (safe now that all rows have values)
ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE time_entries ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN company_id SET NOT NULL;

-- Step 6: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company_id ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Next steps:
-- 1. Verify the companies table has 2 rows
-- 2. Verify all tables now have company_id column
-- 3. Verify existing data is assigned to 'Freiluftchuchi'
-- ================================================
