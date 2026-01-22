-- Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to SELECT from companies table
CREATE POLICY "Allow SELECT for authenticated users"
ON companies
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to INSERT and UPDATE on companies table
CREATE POLICY "Allow INSERT and UPDATE for authenticated users"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow UPDATE for authenticated users"
ON companies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
