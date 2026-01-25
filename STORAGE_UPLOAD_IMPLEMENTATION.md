# Storage Upload Implementation Guide

## Current Status

✅ **Migration Created:** `supabase/migrations/20260123_secure_storage_setup.sql`
✅ **Bucket:** `invoices` (private, RLS-protected)
⚠️ **Frontend Integration:** NOT YET IMPLEMENTED

## Database Schema Analysis

### Fields That Could Use File Storage

1. **`companies.logo_url`** (string | null)
   - Purpose: Company logo for branding
   - Current: URL field (could be external or Supabase Storage)
   - Suggested bucket: `logos` or `invoices`

2. **`transactions.document_url`** (string | null)
   - Purpose: Receipt/invoice attachments for financial transactions
   - Current: URL field (currently always `null` in code)
   - Suggested bucket: `invoices`

### Current Code Behavior

**No file uploads are implemented yet!**
- `logo_url` is defined in the schema but never written to
- `document_url` is always set to `null` when creating transactions
- No UI components for file selection exist

---

## Implementation Plan

### Phase 1: Logo Upload (Settings Page)

**File:** `src/pages/Settings.tsx`

**Current State:**
- Company settings form exists
- No file input for logo upload
- `logo_url` field is not exposed in the UI

**Required Changes:**

1. **Add file input to form:**
```tsx
// Add to FormData interface (line 6)
interface FormData {
  // ... existing fields
  logo_file?: File | null;  // NEW: Store selected file
}

// Add file input in JSX (after company name input)
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Company Logo
  </label>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleLogoChange}
    className="block w-full text-sm text-gray-500
      file:mr-4 file:py-2 file:px-4
      file:rounded-md file:border-0
      file:text-sm file:font-semibold
      file:bg-blue-50 file:text-blue-700
      hover:file:bg-blue-100"
  />
  {formData.logo_url && (
    <img
      src={formData.logo_url}
      alt="Current logo"
      className="mt-2 h-20 object-contain"
    />
  )}
</div>
```

2. **Add file change handler:**
```tsx
const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setFormData(prev => ({ ...prev, logo_file: file }));
  }
};
```

3. **Modify `handleSave` to upload logo before saving company:**
```tsx
const handleSave = async () => {
  try {
    // ... existing validation

    let logoUrl = formData.logo_url;

    // Upload logo if a new file was selected
    if (formData.logo_file) {
      const filePath = `${company.id}/logo-${Date.now()}.${formData.logo_file.name.split('.').pop()}`;

      const { data, error } = await supabase.storage
        .from('invoices')  // Or create separate 'logos' bucket
        .upload(filePath, formData.logo_file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath);

      logoUrl = publicData.publicUrl;
    }

    // Update company with new logo URL
    const { error: companyError } = await supabase
      .from('companies')
      .update({
        name: formData.name.trim(),
        // ... other fields
        logo_url: logoUrl,  // NEW: Save logo URL
      })
      .eq('id', company.id);

    // ... rest of save logic
  } catch (error) {
    console.error('Error saving company:', error);
    // ... error handling
  }
};
```

---

### Phase 2: Transaction Document Upload

**File:** `src/components/TransactionForm.tsx` (create if doesn't exist)

**Current State:**
- Transaction creation in `src/pages/Buchungen.tsx` (line 71)
- `document_url` is hardcoded to `null`
- No UI for document attachment

**Required Changes:**

1. **Create TransactionForm component:**
```tsx
// src/components/TransactionForm.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

interface TransactionFormProps {
  onSubmit: (data: TransactionData) => void;
  onCancel: () => void;
  initialData?: Partial<Transaction>;
}

export function TransactionForm({ onSubmit, onCancel, initialData }: TransactionFormProps) {
  const { company } = useCompany();
  const [formData, setFormData] = useState({
    type: initialData?.type || 'ausgabe',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    amount: initialData?.amount?.toString() || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    document_file: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let documentUrl: string | null = null;

    // Upload document if attached
    if (formData.document_file) {
      const filePath = `${company.id}/transaction-${Date.now()}-${formData.document_file.name}`;

      const { data, error } = await supabase.storage
        .from('invoices')
        .upload(filePath, formData.document_file);

      if (error) {
        console.error('Error uploading document:', error);
        return;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath);

      documentUrl = publicData.publicUrl;
    }

    onSubmit({
      type: formData.type,
      date: formData.date,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      document_url: documentUrl,  // Now includes actual file!
      // ... other fields
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... existing form fields */}

      <div>
        <label>Attachment (Receipt/Invoice)</label>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setFormData({
            ...formData,
            document_file: e.target.files?.[0] || null
          })}
        />
      </div>

      {/* ... submit buttons */}
    </form>
  );
}
```

2. **Update TransactionTable to show download link:**
```tsx
// In src/components/TransactionTable.tsx (if exists)
{transaction.document_url && (
  <a
    href={transaction.document_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 hover:underline"
  >
    View Document
  </a>
)}
```

---

## Security Considerations

### ✅ What's Already Secured

1. **RLS Policies:** Enforced on `storage.objects`
2. **Path Validation:** `(storage.foldername(name))[1] = get_user_company_id()::text`
3. **Private Bucket:** `public = false` prevents anonymous access
4. **File Size Limit:** 10MB per file

### ⚠️ Additional Security Measures Needed

1. **File Type Validation (Frontend):**
```tsx
const ALLOWED_TYPES = {
  logos: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['application/pdf', 'image/jpeg', 'image/png']
};

const validateFile = (file: File, type: 'logos' | 'documents') => {
  if (!ALLOWED_TYPES[type].includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > 10 * 1024 * 1024) {  // 10MB
    throw new Error('File too large (max 10MB)');
  }
};
```

2. **Filename Sanitization:**
```tsx
const sanitizeFilename = (filename: string) => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')  // Replace special chars
    .replace(/-+/g, '-')            // Collapse multiple dashes
    .substring(0, 100);             // Limit length
};

const filePath = `${companyId}/${sanitizeFilename(file.name)}`;
```

3. **Delete Old Files When Updating:**
```tsx
// When updating logo, delete the old one first
if (company.logo_url) {
  const oldPath = extractPathFromUrl(company.logo_url);
  await supabase.storage.from('invoices').remove([oldPath]);
}
```

---

## File Path Format (CRITICAL)

**All uploads MUST follow this pattern:**
```
{company_id}/{filename}
```

**Examples:**
```
550e8400-e29b-41d4-a716-446655440000/logo-1234567890.png
550e8400-e29b-41d4-a716-446655440000/transaction-receipt-123.pdf
550e8400-e29b-41d4-a716-446655440000/invoice-2024-001.pdf
```

**Why?**
- RLS policy extracts first folder segment: `(storage.foldername(name))[1]`
- Compares it to `get_user_company_id()::text`
- If mismatch → access denied

**DO NOT:**
- Use nested folders: ❌ `{company_id}/2024/invoices/file.pdf`
- Omit company_id: ❌ `file.pdf`
- Use hardcoded paths: ❌ `uploads/file.pdf`

---

## Testing Checklist

### After Implementation:

1. **Logo Upload Test:**
   - [ ] Upload logo in Settings page
   - [ ] Verify file appears in Supabase Storage under `{company_id}/logo-*.png`
   - [ ] Verify logo displays in Settings page
   - [ ] Try uploading as different user → should create separate file
   - [ ] Try accessing another company's logo URL → should fail (403)

2. **Document Upload Test:**
   - [ ] Upload receipt to transaction
   - [ ] Verify `document_url` is saved in database
   - [ ] Click download link → should open file
   - [ ] Login as different company → should NOT see other company's files

3. **Security Test:**
   - [ ] Try uploading 15MB file → should reject (10MB limit)
   - [ ] Try uploading `.exe` file → should reject (MIME type)
   - [ ] Manually craft URL to access other company's file → should 403

---

## Migration Deployment

**To apply the storage migration:**

1. Run migration in Supabase Dashboard:
   ```bash
   # Copy contents of supabase/migrations/20260123_secure_storage_setup.sql
   # Paste into SQL Editor in Supabase Dashboard
   # Execute
   ```

2. Verify bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'invoices';
   ```

3. Verify policies exist:
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects';
   ```

4. Test with authenticated user:
   ```sql
   -- Should return your company_id
   SELECT get_user_company_id();
   ```

---

## Future Enhancements

1. **Multiple Buckets:**
   - `logos` - Company logos (images only)
   - `invoices` - Invoice PDFs
   - `receipts` - Transaction receipts
   - `documents` - General documents

2. **Image Optimization:**
   - Resize logos to max 500x500px on upload
   - Convert to WebP for better compression
   - Generate thumbnails for large images

3. **File Management UI:**
   - List all uploaded files
   - Delete unused files
   - Show storage usage stats

4. **Backup Strategy:**
   - Scheduled backups of storage bucket
   - Download all files for export

---

## Summary

✅ **Migration Ready:** Storage security is configured
⚠️ **Frontend Pending:** No upload UI exists yet
📋 **Next Steps:** Implement Phase 1 (Logo Upload) or Phase 2 (Document Upload)

**Estimated Development Time:**
- Phase 1 (Logos): ~2 hours
- Phase 2 (Documents): ~3 hours
- Testing: ~1 hour

**Total: ~6 hours**
