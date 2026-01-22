# Swiss QR-Bill Logic Engine - SPS 2025 v2.3

## Overview
Complete rewrite of the Swiss QR-Bill generator using **Address Type 'S' (Structured)** format according to Swiss Payment Standards 2025 v2.3.

## Key Features

### 1. Address Type 'S' (Structured)
The implementation exclusively uses Address Type 'S' which requires:
- **Name** (max 70 chars) - Mandatory
- **Street** (max 70 chars) - Mandatory
- **House Number** (max 16 chars) - **Optional** (can be empty)
- **Postal Code** (max 16 chars) - Mandatory
- **City** (max 35 chars) - Mandatory
- **Country** (2 chars ISO code) - Mandatory

### 2. Security: Latin-1 Character Sanitization
The `clean()` function implements strict character filtering:

**Allowed Character Ranges:**
- `0x20-0x7E`: Basic ASCII printable characters
- `0xA0-0xFF`: Extended Latin-1 characters

**Explicitly Blocked:**
- `0x00-0x1F`: Control characters (including `\r`, `\n`)
- `0x7F-0x9F`: Additional control characters
- Any Unicode characters outside Latin-1 range

**Sanitization Process:**
1. Remove all line breaks (`\r\n`, `\n`, `\r`)
2. Replace non-Latin-1 characters with space
3. Collapse multiple spaces
4. Trim whitespace

**Example:**
```typescript
clean("Zürich\nSchweiz 🇨🇭") → "Zürich Schweiz"
```

### 3. Critical Validation Logic

#### QR-IBAN / Reference Pairing Rules
The implementation enforces strict pairing rules (SPS 2025 v2.3):

| IBAN Type | Reference Type | Valid? | Error Message |
|-----------|---------------|--------|---------------|
| QR-IBAN | QRR (27 digits) | ✅ Yes | - |
| QR-IBAN | SCOR (RF...) | ❌ No | "SCOR-Referenz kann nicht mit QR-IBAN verwendet werden" |
| QR-IBAN | None | ❌ No | "QR-IBAN erfordert eine QR-Referenz" |
| Normal IBAN | QRR (27 digits) | ❌ No | "QR-Referenz kann nur mit QR-IBAN verwendet werden" |
| Normal IBAN | SCOR (RF...) | ✅ Yes | - |
| Normal IBAN | None | ✅ Yes | - |

#### QR-IBAN Detection
QR-IBAN is identified by the Institution ID (IID) range:
```typescript
IID = IBAN[4:9]  // Characters 5-9
isQRIBAN = IID >= 30000 && IID <= 31999
```

**Example:**
- `CH44 3199 9123 0008 8901 2` → IID = 31999 → **QR-IBAN** ✅
- `CH93 0076 2011 6238 5295 7` → IID = 00762 → **Normal IBAN** ✅

### 4. Output Format

The `toString()` method generates exactly **33 lines** separated by `\r\n`:

```
Line 1:  SPC
Line 2:  0200
Line 3:  1
Line 4:  [IBAN]
Line 5:  S
Line 6:  [Creditor Name]
Line 7:  [Creditor Street]
Line 8:  [Creditor House Number]
Line 9:  [Creditor Postal Code]
Line 10: [Creditor City]
Line 11: [Creditor Country]
Line 12-18: [Empty - Ultimate Creditor]
Line 19: [Amount]
Line 20: [Currency]
Line 21: S
Line 22: [Debtor Name]
Line 23: [Debtor Street]
Line 24: [Debtor House Number]
Line 25: [Debtor Postal Code]
Line 26: [Debtor City]
Line 27: [Debtor Country]
Line 28: [Reference Type: QRR/SCOR/NON]
Line 29: [Reference]
Line 30: [Message]
Line 31: EPD
Line 32: [Alternative Procedure 1]
Line 33: [Alternative Procedure 2]
```

## API Reference

### Interfaces

#### `QRAddress`
```typescript
interface QRAddress {
  name: string;           // Mandatory
  street: string;         // Mandatory
  houseNumber?: string;   // Optional (can be empty!)
  postalCode: string;     // Mandatory
  city: string;           // Mandatory
  country: string;        // Mandatory (2-char ISO code)
}
```

#### `SwissQRBillData`
```typescript
interface SwissQRBillData {
  creditor: {
    account: string;      // Swiss IBAN (21 chars)
    address: QRAddress;
  };
  debtor?: {
    address: QRAddress;
  };
  amount?: number;        // Optional
  currency?: string;      // Default: 'CHF'
  reference?: string;     // QRR (27 digits) or SCOR (RF...)
  message?: string;       // Max 140 chars after cleaning
}
```

### Class: `SwissQRBill`

#### Constructor
```typescript
const qrBill = new SwissQRBill(data: SwissQRBillData);
```
Validates all data during construction. Throws errors if validation fails.

#### Methods

##### `toString(): string`
Generates the Swiss Payment Code (SPC) string with exactly 33 lines.
```typescript
const spcData = qrBill.toString();
```

##### `getReferenceType(): 'QRR' | 'SCOR' | 'NON'`
Returns the detected reference type.
```typescript
const refType = qrBill.getReferenceType();
```

### Static Helper Methods

#### `SwissQRBill.generateQRReference(input: string): string`
Generates a 27-digit QR reference with Modulo 10 check digit.
```typescript
const qrRef = SwissQRBill.generateQRReference('123456');
// Returns: "00000000000000000001234566" (27 digits)
```

#### `SwissQRBill.formatIBAN(iban: string): string`
Formats IBAN with spaces (every 4 characters).
```typescript
const formatted = SwissQRBill.formatIBAN('CH9300762011623852957');
// Returns: "CH93 0076 2011 6238 5295 7"
```

## Usage Examples

### Example 1: Basic Invoice with QR-IBAN
```typescript
import { SwissQRBill } from '../utils/swissqr';

// Generate QR reference from invoice number
const qrReference = SwissQRBill.generateQRReference('2024001');

// Create QR-Bill
const qrBill = new SwissQRBill({
  creditor: {
    account: 'CH44 3199 9123 0008 8901 2', // QR-IBAN
    address: {
      name: 'Freiluft Chuchi GmbH',
      street: 'Bahnhofstrasse',
      houseNumber: '123',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH'
    }
  },
  debtor: {
    address: {
      name: 'Musterfirma AG',
      street: 'Hauptstrasse',
      houseNumber: '45',
      postalCode: '8000',
      city: 'Zürich',
      country: 'CH'
    }
  },
  amount: 1500.00,
  currency: 'CHF',
  reference: qrReference,
  message: 'Rechnung 2024-001'
});

// Generate QR code data
const qrData = qrBill.toString();
```

### Example 2: Invoice with Normal IBAN (No Reference)
```typescript
const qrBill = new SwissQRBill({
  creditor: {
    account: 'CH93 0076 2011 6238 5295 7', // Normal IBAN
    address: {
      name: 'Freiluft Chuchi GmbH',
      street: 'Bahnhofstrasse',
      houseNumber: '123',
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH'
    }
  },
  debtor: {
    address: {
      name: 'Musterfirma AG',
      street: 'Hauptstrasse',
      houseNumber: '45',
      postalCode: '8000',
      city: 'Zürich',
      country: 'CH'
    }
  },
  amount: 1500.00,
  message: 'Rechnung 2024-001'
  // No reference - this is OK with normal IBAN
});

const qrData = qrBill.toString();
```

### Example 3: Address Without House Number
```typescript
const qrBill = new SwissQRBill({
  creditor: {
    account: 'CH93 0076 2011 6238 5295 7',
    address: {
      name: 'Freiluft Chuchi GmbH',
      street: 'Postfach',
      // houseNumber is optional - can be omitted!
      postalCode: '8001',
      city: 'Zürich',
      country: 'CH'
    }
  },
  // ... rest of data
});
```

### Example 4: Using Database Fields
```typescript
import { Company, Customer } from '../lib/supabase';
import { SwissQRBill } from '../utils/swissqr';

function createQRBillFromDB(company: Company, customer: Customer, invoice: Invoice) {
  // Generate QR reference
  const qrReference = SwissQRBill.generateQRReference(invoice.invoice_number);

  // Build addresses from database fields
  const qrBill = new SwissQRBill({
    creditor: {
      account: company.qr_iban || company.iban,
      address: {
        name: company.name,
        street: company.street,
        houseNumber: company.house_number || undefined,
        postalCode: company.zip_code,
        city: company.city,
        country: 'CH'
      }
    },
    debtor: {
      address: {
        name: customer.name,
        street: customer.street,
        houseNumber: customer.house_number || undefined,
        postalCode: customer.zip_code,
        city: customer.city,
        country: customer.country || 'CH'
      }
    },
    amount: invoice.total,
    currency: 'CHF',
    reference: qrReference,
    message: `Rechnung ${invoice.invoice_number}`
  });

  return qrBill.toString();
}
```

## Error Handling

The class throws descriptive German error messages for validation failures:

```typescript
try {
  const qrBill = new SwissQRBill(data);
} catch (error) {
  console.error(error.message);
  // Examples:
  // "QR-IBAN erfordert eine QR-Referenz (27 Ziffern)"
  // "Creditor: Strasse ist erforderlich"
  // "IBAN Prüfziffer ist ungültig"
  // "Debtor: Hausnummer darf max. 16 Zeichen lang sein"
}
```

## Validation Checklist

- ✅ Swiss IBAN format (21 chars, starts with 'CH')
- ✅ IBAN check digit (Mod 97)
- ✅ QR-IBAN detection (IID 30000-31999)
- ✅ QR-IBAN requires QRR reference
- ✅ Normal IBAN cannot use QRR reference
- ✅ QR reference validation (27 digits, Mod 10 check digit)
- ✅ SCOR reference validation (RF + Mod 97 check digits)
- ✅ Address field validation (mandatory fields, length limits)
- ✅ Latin-1 character sanitization
- ✅ Amount range (0.01 - 999'999'999.99)
- ✅ Currency (CHF or EUR)
- ✅ Message length (max 140 chars after cleaning)
- ✅ Output format (33 lines with \r\n)

## Testing

### Test Case 1: QR-IBAN with QRR Reference
```typescript
const data = {
  creditor: {
    account: 'CH4431999123000889012',
    address: {
      name: 'Test Company',
      street: 'Teststrasse',
      houseNumber: '1',
      postalCode: '8000',
      city: 'Zürich',
      country: 'CH'
    }
  },
  reference: '000000000000000000012345679'
};
// Should succeed ✅
```

### Test Case 2: QR-IBAN without Reference
```typescript
const data = {
  creditor: {
    account: 'CH4431999123000889012',
    address: { /* ... */ }
  }
  // No reference
};
// Should throw error ❌
// "QR-IBAN erfordert eine QR-Referenz"
```

### Test Case 3: Normal IBAN with QRR Reference
```typescript
const data = {
  creditor: {
    account: 'CH9300762011623852957',
    address: { /* ... */ }
  },
  reference: '000000000000000000012345679'
};
// Should throw error ❌
// "QR-Referenz kann nur mit QR-IBAN verwendet werden"
```

### Test Case 4: Character Sanitization
```typescript
const data = {
  creditor: {
    account: 'CH9300762011623852957',
    address: {
      name: 'Test 🎉 Company\nLine2',
      street: 'Teststrasse',
      houseNumber: '1',
      postalCode: '8000',
      city: 'Zürich',
      country: 'CH'
    }
  }
};
// Should succeed ✅
// Name becomes: "Test Company Line2"
```

### Test Case 5: Missing House Number (Valid)
```typescript
const data = {
  creditor: {
    account: 'CH9300762011623852957',
    address: {
      name: 'Test Company',
      street: 'Postfach',
      // No houseNumber
      postalCode: '8000',
      city: 'Zürich',
      country: 'CH'
    }
  }
};
// Should succeed ✅
// House number is optional
```

## Migration Notes

### Changes from Previous Implementation
1. **Address Format**: Changed from Type 'K' (Combined) to Type 'S' (Structured)
2. **Data Structure**: Now uses separate `street` and `houseNumber` fields
3. **Character Sanitization**: Enhanced to enforce Latin-1 subset
4. **Validation**: Stricter QR-IBAN/Reference pairing rules
5. **Output**: Maintains 33-line format with proper field mapping

### Breaking Changes
- Old helper methods `buildAddressLine1()` and `buildAddressLine2()` removed
- Address interface changed from `{line1, line2}` to `{street, houseNumber, postalCode, city}`
- Now directly uses database fields without string concatenation

## Standards Compliance

This implementation complies with:
- ✅ Swiss Payment Standards (SPS) 2025 v2.3
- ✅ ISO 11649 (SCOR reference standard)
- ✅ ISO 7064 Mod 97 (IBAN and SCOR check digits)
- ✅ ISO 8859-1 Latin-1 character set subset
- ✅ Swiss QR Code specification

## Support & References
- Swiss Payment Standards: https://www.paymentstandards.ch/
- QR-Bill Implementation Guidelines (SPS 2025)
- ISO 11649: Structured Creditor Reference
