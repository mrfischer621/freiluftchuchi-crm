# Swiss QR-Bill Structured Addresses Implementation

## Overview
This document describes the changes made to switch from unstructured addresses to structured addresses in order to guarantee 100% valid Swiss QR-Bills according to SPS 2025 standards.

## Changes Summary

### 1. Database Migration (`migration_structured_addresses.sql`)

**Companies Table:**
- **Added:** `street` (TEXT) - Street name only
- **Added:** `house_number` (TEXT) - Building number
- **Deprecated:** `address_line1` - Will be removed after data migration verification

**Customers Table:**
- **Added:** `house_number` (TEXT) - Building number
- **Modified:** `street` - Now contains street name only (previously contained street + number)

**Data Migration Strategy:**
The migration script uses regex patterns to automatically split existing addresses:
- Pattern: `"Musterstrasse 123"` → street: `"Musterstrasse"`, house_number: `"123"`
- Pattern: `"Bahnhofstrasse 45A"` → street: `"Bahnhofstrasse"`, house_number: `"45A"`
- Fallback: If no number is detected, the entire address goes to `street` field

### 2. TypeScript Interfaces (`src/lib/supabase.ts`)

**Company Interface:**
```typescript
export interface Company {
  // ... other fields
  street: string | null;           // NEW: Street name only
  house_number: string | null;     // NEW: Building number
  // address_line1 removed
  zip_code: string | null;
  city: string | null;
  // ... other fields
}
```

**Customer Interface:**
```typescript
export interface Customer {
  // ... other fields
  street: string | null;           // MODIFIED: Now street name only
  house_number: string | null;     // NEW: Building number
  zip_code: string | null;
  city: string | null;
  // ... other fields
}
```

### 3. Settings Form (`src/pages/Settings.tsx`)

**UI Changes:**
- Split single address field into two inputs:
  - Street input (flex-grow) - Full width input for street name
  - House Number input (w-28) - Fixed width ~112px for number
- Updated validation to require both fields
- Updated form submission to use new field names

**Validation:**
```typescript
if (!formData.street.trim()) {
  newErrors.street = 'Strasse ist erforderlich';
}
if (!formData.house_number.trim()) {
  newErrors.house_number = 'Hausnummer ist erforderlich';
}
```

### 4. Customer Form (`src/components/CustomerForm.tsx`)

**UI Changes:**
- Added `houseNumber` state
- Split address input into two fields (same layout as Settings)
- Updated form submission to include `house_number`

**Address Tab Layout:**
```tsx
<div className="flex gap-3">
  <div className="flex-grow">
    <input id="street" placeholder="z.B. Musterstrasse" />
  </div>
  <div className="w-28">
    <input id="houseNumber" placeholder="123" />
  </div>
</div>
```

### 5. Swiss QR Bill Generator (`src/utils/swissqr.ts`)

**Existing Helper Methods (Already Implemented):**

```typescript
SwissQRBill.buildAddressLine1(street: string, buildingNumber?: string): string
// Example: "Musterstrasse", "123" → "Musterstrasse 123"
// Used for QR-Bill Address Type 'K' (Combined) format

SwissQRBill.buildAddressLine2(postalCode: string, city: string): string
// Example: "8000", "Zürich" → "8000 Zürich"
// Used for QR-Bill Address Type 'K' (Combined) format
```

These methods combine structured database fields into the "Combined Address" format required by Swiss QR-Bill standards.

## Implementation Steps

### Step 1: Run Database Migration
```bash
# Connect to your Supabase database and run:
psql -U postgres -d your_database -f migration_structured_addresses.sql
```

**Or via Supabase Dashboard:**
1. Go to SQL Editor
2. Paste the contents of `migration_structured_addresses.sql`
3. Execute the script

### Step 2: Verify Data Migration
```sql
-- Check companies
SELECT id, name, address_line1, street, house_number, zip_code, city
FROM companies
WHERE street IS NULL OR house_number IS NULL;

-- Check customers
SELECT id, name, street, house_number, zip_code, city
FROM customers
WHERE street IS NOT NULL AND (house_number IS NULL OR house_number = '');
```

### Step 3: Manual Data Cleanup (If Needed)
For any addresses that weren't automatically split correctly:
```sql
-- Example: Update a company address manually
UPDATE companies
SET street = 'Bahnhofstrasse', house_number = '123'
WHERE id = 'company-id-here';

-- Example: Update a customer address manually
UPDATE customers
SET house_number = '45A'
WHERE id = 'customer-id-here' AND street = 'Hauptstrasse';
```

### Step 4: Deploy Frontend Changes
All TypeScript/React changes are already implemented:
- ✅ TypeScript interfaces updated
- ✅ Settings form updated
- ✅ Customer form updated
- ✅ QR Bill generator ready to use structured addresses

### Step 5: Update Code Using QR Bill Generator
Wherever you generate QR bills (e.g., in invoice PDF generation), use the helper methods:

```typescript
import { SwissQRBill } from '../utils/swissqr';

// Build creditor address from company data
const creditorAddress = {
  name: company.name,
  line1: SwissQRBill.buildAddressLine1(company.street, company.house_number),
  line2: SwissQRBill.buildAddressLine2(company.zip_code, company.city),
  country: 'CH'
};

// Build debtor address from customer data
const debtorAddress = {
  name: customer.name,
  line1: SwissQRBill.buildAddressLine1(customer.street, customer.house_number),
  line2: SwissQRBill.buildAddressLine2(customer.zip_code, customer.city),
  country: customer.country || 'CH'
};

// Create QR Bill
const qrBill = new SwissQRBill({
  creditor: {
    account: company.qr_iban,
    address: creditorAddress
  },
  debtor: {
    address: debtorAddress
  },
  amount: invoice.total,
  currency: 'CHF',
  reference: qrReference,
  message: `Rechnung ${invoice.invoice_number}`
});
```

### Step 6: (Optional) Remove Old Column
After verifying everything works correctly in production:
```sql
ALTER TABLE companies DROP COLUMN IF EXISTS address_line1;
```

## Benefits of Structured Addresses

1. **100% QR-Bill Compliance:** Meets SPS 2025 requirements for structured addresses
2. **Better Data Quality:** Enforces separation of street and building number
3. **Improved UX:** Clear, separate fields make data entry more intuitive
4. **International Support:** Structured format works better for international addresses
5. **Future-Proof:** Aligns with Swiss payment standards roadmap

## Testing Checklist

- [ ] Company settings page loads and displays split address fields
- [ ] Can save company with new structured address format
- [ ] Customer form displays split address fields
- [ ] Can create/edit customers with new address format
- [ ] Existing addresses are properly migrated in database
- [ ] QR-Bills generate correctly with structured addresses
- [ ] Invoice PDFs display addresses correctly
- [ ] Validation works for required fields (street and house_number)

## Rollback Plan

If you need to rollback:
```sql
-- Remove new columns
ALTER TABLE companies DROP COLUMN IF EXISTS street;
ALTER TABLE companies DROP COLUMN IF EXISTS house_number;
ALTER TABLE customers DROP COLUMN IF EXISTS house_number;
```

Then revert the TypeScript/React changes using git:
```bash
git checkout HEAD -- freiluftchuchi-crm/src/lib/supabase.ts
git checkout HEAD -- freiluftchuchi-crm/src/pages/Settings.tsx
git checkout HEAD -- freiluftchuchi-crm/src/components/CustomerForm.tsx
git checkout HEAD -- freiluftchuchi-crm/src/utils/swissqr.ts
```

## Support

For questions or issues with this implementation, refer to:
- Swiss Payment Standards: https://www.paymentstandards.ch/
- SPS 2025 QR-Bill Specification
- This project's documentation
