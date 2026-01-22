-- ============================================
-- FIX: Permissive RLS Policies for companies
-- ============================================
-- This script drops ALL existing policies and creates
-- a simple permissive policy for authenticated users.

-- Step 1: Drop all existing policies on companies table
DROP POLICY IF EXISTS "Allow SELECT for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow INSERT and UPDATE for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow INSERT for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow UPDATE for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;

-- Step 2: Ensure RLS is enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a super permissive SELECT policy
-- This allows ALL authenticated users to see ALL companies
CREATE POLICY "Enable read access for all authenticated users"
ON companies
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Step 4: Allow INSERT for authenticated users
CREATE POLICY "Enable insert for all authenticated users"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Step 5: Allow UPDATE for authenticated users
CREATE POLICY "Enable update for all authenticated users"
ON companies
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Step 6: Allow DELETE for authenticated users
CREATE POLICY "Enable delete for all authenticated users"
ON companies
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

-- ============================================
-- Verification Query
-- ============================================
-- Run this after applying the policies to verify:
-- SELECT * FROM companies;
-- You should see all rows if you're authenticated.
