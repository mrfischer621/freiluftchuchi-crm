# Sales Pipeline Implementation Guide

**Date:** 2026-01-23
**Module:** Sales Pipeline (Akquise/Deals)
**Status:** ✅ Complete and Ready for Deployment

---

## Overview

The Sales Pipeline module provides a Kanban-style board for tracking sales opportunities from initial contact through to closing deals. It supports both existing customers and new prospects, with the ability to convert prospects into customers.

---

## Features Implemented

### 1. Kanban Board Workflow

- **6 Default Pipeline Stages:**
  1. Recherche (Research) - Gray
  2. Kontaktaufnahme (Initial Contact) - Blue
  3. Bedarfsanalyse (Needs Analysis) - Purple
  4. Angebot (Proposal) - Amber
  5. Verhandlung (Negotiation) - Red
  6. Gewonnen (Won) - Green

- **Drag & Drop:** Move opportunities between stages using @dnd-kit
- **Visual Indicators:**
  - Color-coded stages
  - Card counts per stage
  - Stale deal warnings (>14 days since last contact)

### 2. Opportunity Management

**Two Types of Opportunities:**

1. **Existing Customer Deals:**
   - Link to customer from dropdown
   - Leverages existing customer data

2. **Prospect Deals (New Leads):**
   - Store prospect info in JSONB field
   - Fields: name, company, email, phone, contact_person
   - Can be converted to full customer records

**Deal Information:**
- Title (required)
- Expected value (CHF)
- Next action date
- Notes
- Last contact timestamp (auto-updated)

### 3. Prospect-to-Customer Conversion

**One-Click Conversion:**
- "Als Kunde anlegen" button on prospect cards
- Confirmation modal
- Automatic customer creation from prospect data
- Opportunity automatically linked to new customer
- Prospect info cleared after conversion

**Backend Function:**
- `convert_prospect_to_customer(opportunity_id)`
- Secure implementation with tenant isolation
- Returns new customer_id

### 4. Activity Tracking

- **Last Contact:** Automatically updated when moving deals
- **Stale Detection:** Red warning if >14 days since contact
- **Next Action Date:** Calendar field for follow-ups

---

## File Structure

```
/supabase/migrations/
  └── 20260123_sales_pipeline.sql          # Database schema + RLS

/src/lib/
  └── supabase.ts                          # TypeScript interfaces added

/src/components/
  └── OpportunityForm.tsx                  # Create/Edit form
  └── Sidebar.tsx                          # Updated with Sales link

/src/pages/
  └── Sales.tsx                            # Main Kanban board page

/src/
  └── App.tsx                              # Route added

/docs/
  └── SALES_PIPELINE_IMPLEMENTATION.md     # This file
  └── SALES_PIPELINE_SECURITY_AUDIT.md     # Security report
```

---

## Database Schema

### Table: `pipeline_stages`

Defines the workflow stages for the Kanban board.

| Column        | Type          | Description                          |
|---------------|---------------|--------------------------------------|
| id            | UUID          | Primary key                          |
| company_id    | UUID          | FK to companies (tenant isolation)   |
| name          | TEXT          | Stage name (e.g., "Recherche")       |
| position      | INTEGER       | Display order (0-based)              |
| color         | TEXT          | Hex color code (e.g., "#6B7280")     |
| created_at    | TIMESTAMPTZ   | Creation timestamp                   |
| updated_at    | TIMESTAMPTZ   | Last update (auto-updated)           |

**Unique Constraint:** (company_id, position) - prevents duplicate positions
**RLS Policy:** Tenant isolation on company_id

### Table: `opportunities`

Stores sales deals/opportunities.

| Column                  | Type          | Description                               |
|------------------------|---------------|-------------------------------------------|
| id                     | UUID          | Primary key                               |
| company_id             | UUID          | FK to companies (tenant isolation)        |
| existing_customer_id   | UUID (NULL)   | FK to customers (if existing customer)    |
| prospect_info          | JSONB (NULL)  | Prospect data (if new lead)               |
| title                  | TEXT          | Deal title (required)                     |
| stage_id               | UUID          | FK to pipeline_stages                     |
| expected_value         | NUMERIC       | Deal value in CHF                         |
| last_contact_at        | TIMESTAMPTZ   | Last interaction timestamp                |
| next_action_date       | DATE (NULL)   | Follow-up date                            |
| notes                  | TEXT (NULL)   | Additional notes                          |
| created_at             | TIMESTAMPTZ   | Creation timestamp                        |
| updated_at             | TIMESTAMPTZ   | Last update (auto-updated)                |

**XOR Constraint:** Must have EITHER existing_customer_id OR prospect_info (not both)
**RLS Policy:** Tenant isolation on company_id

### Function: `convert_prospect_to_customer()`

PostgreSQL function for converting prospects to customers.

**Signature:**
```sql
convert_prospect_to_customer(opportunity_id_param UUID) RETURNS UUID
```

**Security:**
- `SECURITY DEFINER` with `SET search_path = public`
- Manual tenant check using `get_user_company_id()`
- Validates opportunity exists and belongs to user's company
- Validates opportunity has prospect_info (not already a customer)

**Process:**
1. Fetch opportunity with tenant check
2. Validate prospect_info exists
3. Create customer from prospect_info
4. Link opportunity to new customer
5. Clear prospect_info from opportunity
6. Return new customer_id

---

## TypeScript Interfaces

### ProspectInfo
```typescript
export interface ProspectInfo {
  name?: string;
  company?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}
```

### PipelineStage
```typescript
export interface PipelineStage {
  id: string;
  company_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}
```

### Opportunity
```typescript
export interface Opportunity {
  id: string;
  company_id: string;
  existing_customer_id: string | null;
  prospect_info: ProspectInfo | null;
  title: string;
  stage_id: string;
  expected_value: number | null;
  last_contact_at: string;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Frontend Components

### OpportunityForm.tsx

**Props:**
```typescript
{
  onSubmit: (opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editingOpportunity: Opportunity | null;
  onCancelEdit: () => void;
  customers: Customer[];
  stageId: string;
}
```

**Features:**
- Radio button selection: "Neuer Interessent" vs "Bestehende Firma"
- Dynamic form fields based on selection
- Customer dropdown (when linking to existing customer)
- Prospect info fields (when creating new lead)
- Expected value, next action date, notes
- Submit/Cancel actions

**Validation:**
- Title: Required
- Customer or Prospect: Must select one
- Type safety via TypeScript

### Sales.tsx (Main Page)

**Components:**
- `OpportunityCard`: Individual deal card with drag & drop
- `KanbanColumn`: Stage column with cards and "Add" button
- `Sales`: Main page with board and form

**Features:**
- Fetches stages, opportunities, customers on load
- Drag & drop between stages (updates stage_id)
- Edit opportunity (opens form)
- Convert prospect (confirmation + API call)
- Add new deal (opens form with pre-selected stage)
- Stale deal indicators (>14 days)

**DndContext:**
- Uses @dnd-kit/core for drag & drop
- Sortable context for each column
- Drag overlay for visual feedback
- Updates last_contact_at when moving deals

---

## Usage Guide

### For Users

1. **Navigate to Sales Pipeline:**
   - Click "Sales Pipeline" in the sidebar (TrendingUp icon)

2. **View Pipeline:**
   - See all opportunities organized by stage
   - Each card shows title, customer/prospect name, value, and next action
   - Red warning if no contact in 14+ days

3. **Add New Deal:**
   - Click "Neuer Deal" button (top right)
   - Choose "Neuer Interessent" or "Bestehende Firma"
   - Fill in deal details
   - Click "Speichern"

4. **Move Deal Between Stages:**
   - Drag card to desired stage column
   - Deal automatically moves
   - Last contact updated to now

5. **Convert Prospect to Customer:**
   - Click "Als Kunde anlegen" on prospect card
   - Confirm conversion
   - New customer created automatically
   - Deal now linked to customer

6. **Edit Deal:**
   - Click "Bearbeiten" on any card
   - Form opens at top of page
   - Make changes and save

---

## Deployment Steps

### 1. Database Migration

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `/supabase/migrations/20260123_sales_pipeline.sql`
3. Run migration
4. Verify tables created with `\dt pipeline_stages, opportunities`

**Option B: Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push
```

### 2. Verify Migration

**Check Tables:**
```sql
SELECT * FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('pipeline_stages', 'opportunities');
```

**Check RLS:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('pipeline_stages', 'opportunities');
-- Both should show rowsecurity = true
```

**Check Seed Data:**
```sql
SELECT name, position, color
FROM pipeline_stages
ORDER BY position;
-- Should show 6 stages for each company
```

**Check Function:**
```sql
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'convert_prospect_to_customer';
-- Should show SECURITY DEFINER and search_path=public
```

### 3. Deploy Frontend

**Local Testing:**
```bash
npm run dev
# Navigate to http://localhost:5173/sales
```

**Production Deployment:**
```bash
# Commit changes
git add .
git commit -m "feat: Add Sales Pipeline module with Kanban board"
git push origin main

# Vercel auto-deploys from main branch
# Or manually deploy:
npm run build
# Upload /dist to hosting
```

### 4. Verify Deployment

1. Login to application
2. Navigate to Sales Pipeline
3. Verify stages loaded
4. Try adding a new deal (both prospect and customer types)
5. Test drag & drop
6. Test prospect conversion (if you have a prospect)
7. Check no errors in browser console

---

## Security Verification

Run these queries to verify security:

### 1. RLS Status
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('pipeline_stages', 'opportunities');
```
**Expected:** Both tables have `rowsecurity = true`

### 2. Policies Exist
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pipeline_stages', 'opportunities');
```
**Expected:** At least one policy per table with "Tenant Isolation" pattern

### 3. Function Security
```sql
SELECT
  proname,
  prosecdef as security_definer,
  proconfig as settings
FROM pg_proc
WHERE proname = 'convert_prospect_to_customer';
```
**Expected:** `security_definer = true` and `settings` contains `search_path=public`

### 4. Manual Tenant Test

**Setup:**
1. Create two test companies (if not exists)
2. Create user accounts for each company
3. Create opportunities for each company

**Test:**
1. Login as Company A user
2. Navigate to Sales Pipeline
3. Note the opportunity IDs visible
4. Open browser console
5. Try to fetch Company B's opportunities:
```javascript
const { data } = await supabase
  .from('opportunities')
  .select('*')
  .eq('company_id', 'company-b-id');
console.log(data); // Should be EMPTY due to RLS
```

**Expected:** No data returned (RLS blocks cross-tenant access)

---

## Troubleshooting

### Issue: "Firma wird geladen..." stuck

**Cause:** Company context not loaded
**Fix:** Check CompanyProvider in App.tsx, verify user has profile with company_id

### Issue: Stages not appearing

**Cause:** Seed data not created for this company
**Fix:** Run seed insert for your company:
```sql
INSERT INTO public.pipeline_stages (company_id, name, position, color)
VALUES
  ('YOUR-COMPANY-ID', 'Recherche', 0, '#6B7280'),
  ('YOUR-COMPANY-ID', 'Kontaktaufnahme', 1, '#3B82F6'),
  ('YOUR-COMPANY-ID', 'Bedarfsanalyse', 2, '#8B5CF6'),
  ('YOUR-COMPANY-ID', 'Angebot', 3, '#F59E0B'),
  ('YOUR-COMPANY-ID', 'Verhandlung', 4, '#EF4444'),
  ('YOUR-COMPANY-ID', 'Gewonnen', 5, '#10B981');
```

### Issue: Drag & drop not working

**Cause:** Library not installed
**Fix:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Issue: "convert_prospect_to_customer" function error

**Cause:** Function not created or incorrect permissions
**Fix:**
```sql
-- Verify function exists
\df convert_prospect_to_customer

-- Grant execute permission
GRANT EXECUTE ON FUNCTION convert_prospect_to_customer TO authenticated;
```

### Issue: TypeScript errors

**Cause:** Interfaces not added to supabase.ts
**Fix:** Verify ProspectInfo, PipelineStage, and Opportunity interfaces exist in `/src/lib/supabase.ts`

---

## Performance Considerations

### Indexes Created

All queries optimized with proper indexes:

```sql
-- Stage lookups
CREATE INDEX idx_pipeline_stages_company_id ON pipeline_stages(company_id);
CREATE INDEX idx_pipeline_stages_position ON pipeline_stages(company_id, position);

-- Opportunity queries
CREATE INDEX idx_opportunities_company_id ON opportunities(company_id);
CREATE INDEX idx_opportunities_stage_id ON opportunities(stage_id);
CREATE INDEX idx_opportunities_customer_id ON opportunities(existing_customer_id);
CREATE INDEX idx_opportunities_last_contact ON opportunities(company_id, last_contact_at DESC);
```

**Expected Performance:**
- Pipeline load: <200ms (with 100s of opportunities)
- Drag & drop update: <100ms
- Conversion: <300ms (creates customer + updates opportunity)

---

## Future Enhancements

### Potential Features (Not Yet Implemented)

1. **Custom Pipeline Stages:**
   - Allow users to add/edit/remove stages
   - Drag to reorder stages

2. **Activity History:**
   - Log all stage changes
   - Show timeline on opportunity detail view

3. **Email Integration:**
   - Send follow-up reminders
   - Track email opens/clicks

4. **Reporting:**
   - Conversion rates per stage
   - Average time in each stage
   - Win/loss analysis

5. **Automation:**
   - Auto-move deals after X days
   - Assign deals to team members
   - Task creation on stage change

6. **Advanced Filtering:**
   - Filter by expected value range
   - Filter by next action date
   - Search by prospect/customer name

7. **Deal Deletion:**
   - Currently no delete functionality
   - Add with confirmation modal

8. **Bulk Actions:**
   - Select multiple deals
   - Bulk stage changes
   - Bulk export

---

## API Reference

### Supabase Queries Used

**Fetch Stages:**
```typescript
await supabase
  .from('pipeline_stages')
  .select('*')
  .eq('company_id', companyId)
  .order('position', { ascending: true });
```

**Fetch Opportunities:**
```typescript
await supabase
  .from('opportunities')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });
```

**Create Opportunity:**
```typescript
await supabase
  .from('opportunities')
  .insert([opportunityData]);
```

**Update Opportunity Stage:**
```typescript
await supabase
  .from('opportunities')
  .update({ stage_id: newStageId, last_contact_at: new Date().toISOString() })
  .eq('id', opportunityId);
```

**Convert Prospect:**
```typescript
await supabase.rpc('convert_prospect_to_customer', {
  opportunity_id_param: opportunityId
});
```

---

## Compliance & Standards

### Follows Project Standards

✅ Database schema documented in `/docs/database_schema_reference.md`
✅ RLS policies follow standard pattern
✅ Migration naming: `YYYYMMDD_description.sql`
✅ Component pattern: `[Entity]Form.tsx`
✅ Page pattern: `/src/pages/[Entity].tsx`
✅ Route added to App.tsx and Sidebar.tsx
✅ Uses `useCompany()` hook for tenant context
✅ Follows "Milkee" design (minimalist, border-gray-200)

### Security Standards

✅ All tables have RLS enabled
✅ Policies enforce tenant isolation
✅ Functions use `SECURITY DEFINER` + `search_path` protection
✅ Input validation at multiple layers
✅ No SQL injection vulnerabilities
✅ No XSS vulnerabilities (React auto-escapes)

---

## Support & Maintenance

### Contact

For questions or issues with this module:
1. Review this documentation
2. Check `/docs/SALES_PIPELINE_SECURITY_AUDIT.md` for security details
3. Review `/docs/database_schema_reference.md` for database structure
4. Check CLAUDE.md for general project guidelines

### Version History

| Version | Date       | Changes                                    |
|---------|------------|--------------------------------------------|
| 1.0     | 2026-01-23 | Initial implementation with Kanban board   |

---

## Conclusion

The Sales Pipeline module is fully implemented and ready for production use. All security checks have passed, and the module follows project standards and best practices.

**Status:** ✅ **READY FOR DEPLOYMENT**

Enjoy tracking your sales opportunities with the new Kanban board!
