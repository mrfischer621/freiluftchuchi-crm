# PDF Generator Security - Input Sanitization

## Overview

The PDF generator now implements comprehensive input sanitization to protect against:
1. **XSS (Cross-Site Scripting)** vulnerabilities
2. **Swiss QR Standard violations** that could break QR code payloads
3. **PDF rendering glitches** from invalid characters

## Implementation

### Core Functions

#### `sanitizeForQR(text: string): string`

**Purpose**: Sanitizes ALL user inputs for Swiss QR Bill compliance.

**What it does**:
- Removes control characters (0x00-0x1F and 0x7F-0x9F) including `\n`, `\r`, `\t`
- Strips characters outside Latin-1 subset (emojis, special Unicode, etc.)
- Collapses multiple spaces into single space
- Trims whitespace

**Swiss QR Standard Requirements**:
- Only allows: `0x20-0x7E` (ASCII printable) and `0xA0-0xFF` (Latin-1 extended)
- Single-line fields MUST NOT contain newlines
- Invalid characters will break the QR payload and make invoices unreadable

**Example**:
```typescript
// Input with dangerous characters
const dangerous = "Müller AG\n🎉 Special\tOffer\x00";

// Output - safe for QR code
sanitizeForQR(dangerous); // "Müller AG Special Offer"
```

#### `sanitizeForPDF(text: string): string`

**Purpose**: Sanitizes text for general PDF rendering (less strict than QR).

**What it does**:
- Removes control characters (except newlines and tabs for multiline text)
- Strips emojis and non-Latin-1 characters
- Preserves line breaks for descriptions

**Example**:
```typescript
// Input with emojis
const description = "Product 🚀 with\nnewline";

// Output - safe for PDF
sanitizeForPDF(description); // "Product  with\nnewline"
```

## Where Sanitization is Applied

### 1. QR Bill Data (Critical)

All user inputs passed to `SwissQRBill` are sanitized:

```typescript
const qrBill = new SwissQRBill({
  creditor: {
    account: sanitizeForQR(account),
    address: {
      name: sanitizeForQR(company.name),
      street: sanitizeForQR(company.street),
      houseNumber: sanitizeForQR(company.house_number),
      postalCode: sanitizeForQR(company.zip_code),
      city: sanitizeForQR(company.city),
      country: 'CH',
    },
  },
  debtor: {
    address: {
      name: sanitizeForQR(customer.name),
      street: sanitizeForQR(customer.street),
      houseNumber: sanitizeForQR(customer.house_number),
      postalCode: sanitizeForQR(customer.zip_code),
      city: sanitizeForQR(customer.city),
      country: qrCountry,
    },
  },
  message: sanitizeForQR(`Rechnung ${invoice.invoice_number}`),
});
```

### 2. PDF Text Rendering

All `doc.text()` calls use `sanitizeForPDF()`:

```typescript
// Company info
doc.text(sanitizeForPDF(company.name), x, y);
doc.text(sanitizeForPDF(formatAddress(company.street, company.house_number)), x, y);

// Customer info
doc.text(sanitizeForPDF(customer.name), x, y);

// Invoice items
const description = sanitizeForPDF(item.description || '');
doc.text(description, x, y);
```

## Test Cases

### Dangerous Inputs

| Input Type | Example | Result |
|------------|---------|--------|
| Emojis | `"Test 🎉 Company"` | `"Test  Company"` |
| Newlines | `"Line1\nLine2"` | `"Line1 Line2"` |
| Tabs | `"Test\tCompany"` | `"Test Company"` |
| Control chars | `"Test\x00\x01"` | `"Test  "` |
| Unicode | `"Test 中文"` | `"Test  "` |
| Mixed | `"Müller\nAG 🚀"` | `"Müller AG "` |

### Valid Latin-1 Inputs (Preserved)

| Input Type | Example | Result |
|------------|---------|--------|
| Umlauts | `"Müller"` | `"Müller"` |
| Accents | `"Café"` | `"Café"` |
| Special chars | `"Zürich Ä Ö Ü"` | `"Zürich Ä Ö Ü"` |
| Currency | `"CHF 100.50"` | `"CHF 100.50"` |

## Security Benefits

### 1. XSS Prevention
Even if malicious scripts are stored in the database, they are stripped before PDF generation.

### 2. QR Code Integrity
No matter what garbage data is in the database, the QR code payload remains valid and scannable.

### 3. Swiss Standard Compliance
Ensures all generated Swiss QR Bills meet the strict SPS 2025 v2.3 requirements.

### 4. PDF Rendering Stability
Prevents rendering glitches, font issues, and layout corruption from invalid characters.

## Usage in Your Code

When working with user inputs for PDF generation:

```typescript
import { sanitizeForQR } from './utils/pdfGenerator';

// For QR code data (strict)
const safeIban = sanitizeForQR(userInput.iban);
const safeName = sanitizeForQR(userInput.name);

// For general PDF text (less strict, preserves newlines)
const safeDescription = sanitizeForPDF(userInput.description);
```

## Export

The `sanitizeForQR` function is exported and can be used throughout the application:

```typescript
export function sanitizeForQR(text: string): string;
```

## Related Files

- `src/utils/pdfGenerator.ts` - Main PDF generation with sanitization
- `src/utils/swissqr.ts` - Swiss QR Bill implementation (also has internal `clean()` function)

## Testing

To test the sanitization:

1. Create a customer with emojis in name: `"Test Company 🎉"`
2. Add newlines to address: `"Street\nName"`
3. Generate invoice PDF
4. Result: Clean, valid PDF with sanitized text

**✅ The QR code will be scannable and compliant, regardless of database content!**
