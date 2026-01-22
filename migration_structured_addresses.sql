-- Migration: Switch to Structured Addresses for Swiss QR-Bill Compliance (SPS 2025)
-- This migration adds separate fields for street and house_number to ensure 100% valid QR-Bills
-- Date: 2026-01-22

-- ============================================================================
-- STEP 1: Add new columns to companies table
-- ============================================================================

-- Add street and house_number columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS house_number TEXT;

-- ============================================================================
-- STEP 2: Migrate existing data for companies (best effort)
-- ============================================================================

-- Try to split address_line1 into street and house_number
-- This uses a regex to extract trailing numbers as house_number
-- Example: "Musterstrasse 123" -> street: "Musterstrasse", house_number: "123"
-- Example: "Bahnhofstrasse 45A" -> street: "Bahnhofstrasse", house_number: "45A"

UPDATE companies
SET
  street = TRIM(REGEXP_REPLACE(address_line1, '\s+[0-9]+[A-Za-z]?\s*$', '')),
  house_number = TRIM(REGEXP_REPLACE(address_line1, '^.*\s+([0-9]+[A-Za-z]?)\s*$', '\1'))
WHERE
  address_line1 IS NOT NULL
  AND address_line1 != ''
  AND address_line1 ~ '\s+[0-9]+[A-Za-z]?\s*$';

-- For addresses that don't match the pattern, put everything in street
UPDATE companies
SET
  street = TRIM(address_line1),
  house_number = NULL
WHERE
  address_line1 IS NOT NULL
  AND address_line1 != ''
  AND street IS NULL;

-- ============================================================================
-- STEP 3: Add new column to customers table
-- ============================================================================

-- Add house_number column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS house_number TEXT;

-- ============================================================================
-- STEP 4: Migrate existing data for customers (best effort)
-- ============================================================================

-- Try to split street into street and house_number
-- This uses a regex to extract trailing numbers as house_number

UPDATE customers
SET
  house_number = TRIM(REGEXP_REPLACE(street, '^.*\s+([0-9]+[A-Za-z]?)\s*$', '\1'))
WHERE
  street IS NOT NULL
  AND street != ''
  AND street ~ '\s+[0-9]+[A-Za-z]?\s*$';

-- Update street to remove the house number
UPDATE customers
SET
  street = TRIM(REGEXP_REPLACE(street, '\s+[0-9]+[A-Za-z]?\s*$', ''))
WHERE
  street IS NOT NULL
  AND street != ''
  AND street ~ '\s+[0-9]+[A-Za-z]?\s*$';

-- ============================================================================
-- STEP 5: Make columns NOT NULL after data migration (optional)
-- ============================================================================

-- Uncomment these lines if you want to enforce NOT NULL constraints
-- This should only be done after ensuring all addresses are properly split

-- For companies (street and house_number should be required for QR-Bills)
-- ALTER TABLE companies ALTER COLUMN street SET NOT NULL;
-- ALTER TABLE companies ALTER COLUMN house_number SET NOT NULL;

-- For customers (keep them nullable for flexibility)
-- ALTER TABLE customers ALTER COLUMN house_number SET NOT NULL;

-- ============================================================================
-- STEP 6: Drop old address_line1 column from companies (optional)
-- ============================================================================

-- WARNING: Only run this after verifying that all data has been migrated correctly!
-- Uncomment this line when you're ready to drop the old column:

-- ALTER TABLE companies DROP COLUMN IF EXISTS address_line1;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check companies with missing street or house_number
-- SELECT id, name, address_line1, street, house_number, zip_code, city
-- FROM companies
-- WHERE street IS NULL OR house_number IS NULL OR street = '' OR house_number = '';

-- Check customers with missing house_number
-- SELECT id, name, street, house_number, zip_code, city
-- FROM customers
-- WHERE street IS NOT NULL AND (house_number IS NULL OR house_number = '');

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- If something goes wrong, you can rollback by removing the new columns:
-- ALTER TABLE companies DROP COLUMN IF EXISTS street;
-- ALTER TABLE companies DROP COLUMN IF EXISTS house_number;
-- ALTER TABLE customers DROP COLUMN IF EXISTS house_number;
