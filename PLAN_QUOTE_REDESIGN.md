# Plan: Swiss International Style Redesign for Offer/Quote Module

## Context

Redesign the quote ("Angebot") PDF generation and form UI to follow "Swiss International Style" — clean, minimalistic, structured. Accent color: `#6b8a5e` (olive green). No web preview component — only the PDF output and the form UI are changed.

**Current state:** Quote PDF (`pdfGenerator.ts:1015-1349`) uses manual jsPDF drawing, renders "ANGEBOT" in all-caps, shows "Gültig bis" in red, has no logo, no structured footer, places sender address top-left. The form (`QuoteForm.tsx`) works but the totals section has CSS alignment issues.

**Key decisions:**
- **No schema change** — Keep single `description` field, parse title/description by splitting on first `\n`
- **Dynamic footer** — Pull from `company.name`, `company.street`, `company.phone`, `company.email`
- **No web preview** — Only redesign the PDF output + fix the form UI

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/pdfGenerator.ts` | Rewrite `drawQuoteHeader()`, `drawQuoteItems()`, `generateQuotePDF()`. Add Swiss rounding, logo support, accent-colored autoTable header, structured footer. |
| `src/components/QuoteForm.tsx` | Replace single-line description input with textarea (title on first line, description below). Fix totals section CSS. Format numbers with Swiss apostrophe. |
| `src/pages/Angebote.tsx` | Update `QuoteFormData` type, pass logo data to PDF generator. |

## Step 1: Swiss Rounding Utility

Add to `pdfGenerator.ts`:
```typescript
function swissRound(amount: number): number {
  return Math.round(amount * 20) / 20;
}
```
Apply to Grand Total only. Subtotals and line items stay precise.

## Step 2: QuoteForm UI Changes (`QuoteForm.tsx`)

**Item rows:**
- Replace `description` single-line `<input>` with `<textarea>` (3 rows)
- Placeholder text: "Erste Zeile = Titel (fett)\nWeitere Zeilen = Beschreibung"
- Columns: Beschreibung (textarea), Menge, Einzelpreis, Total
- Keep product selector but move it above the textarea or as a separate dropdown that pre-fills

**Totals section — fix CSS with proper flex layout:**
```
Zwischensumme          1'250.00
Rabatt                  - 50.00  (green text)
────────────────────────────────
Total (bold)           1'200.00  (Swiss-rounded)
```
- Use `justify-between` on each row
- Discount amount in green (`text-green-600`), prefixed with "- "
- Total row: `border-t-2`, bold, larger font
- Format all amounts with apostrophe thousand separators: `amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")`

## Step 3: PDF Generation Rewrite (`pdfGenerator.ts`)

### 3a. Logo Handling

Add helper to fetch logo as base64:
```typescript
async function fetchLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}
```

In `generateQuotePDF()`: Fetch logo before drawing, pass to `drawQuoteHeader()`.

### 3b. Rewrite `drawQuoteHeader()`

**Layout:**
- **Top-right (x=160, y=15):** Company logo via `doc.addImage()`, square ~25mm. Skip if no logo.
- **Left (x=20, y=55):** Recipient address block (window envelope position):
  - Customer name
  - Contact person (if exists)
  - Street + house number
  - ZIP + City
  - Country (only if not CH)
- **Remove** sender company address from top-left entirely
- **Title (x=20, y=85):** "Angebot" — bold, ~14pt, not ALL CAPS
- **Metadata (x=20, y=95):**
  - "Angebotsnummer: AN-2026-001"
  - "Datum: 23.02.2026"
  - "Gültig bis: 25.03.2026" — **BLACK text** (remove red)
  - "Kunden-Nr: [customer id or name]" (if useful)
  - All dates in black, clean alignment

### 3c. Rewrite `drawQuoteItems()` — Use `jspdf-autotable`

**Table:**
- Header row: Background `#6b8a5e`, white bold text
- Columns: "Beschreibung", "Menge", "Einzelpreis (CHF)", "Total (CHF)"
- Column widths: ~95, ~20, ~35, ~30 (proportional to A4 width minus margins)
- **Description cell:** Use `didParseCell` or `willDrawCell` hook:
  - Split cell text on `\n` — first line bold, rest normal
  - Or render via `didDrawCell` with manual `doc.text()` calls using different font weights
- Price cells: Numbers only, formatted with apostrophe (e.g., "1'250.00")

**Totals below table:**
- Right-aligned section (x=130-190mm area):
  - "Zwischensumme" — right: formatted amount
  - "Rabatt" (if discount > 0) — right: green "- amount" text
  - Separator line
  - "Total" — bold, 11pt, Swiss-rounded amount
- No MwSt/VAT line (removed per spec)

### 3d. Footer

**At bottom of page (or after content, ~y=260):**
- Accent line: `doc.setDrawColor(107, 138, 94)` → full-width line 2pt thick
- Below line, 3 columns:
  - Col 1: `{company.name} c/o {sender_contact_name}`, `{street} {house_number}`, `{zip} {city}`
  - Col 2: `Telefon: {company.phone}`
  - Col 3: `E-Mail: {company.email}`
- Font size: 7-8pt, normal weight

### 3e. Closing Section

- Remove hardcoded "Dieses Angebot ist gültig bis..." and "Bei Fragen..." text
- Instead, use `company.quote_footer_text` (dynamic from Settings)
- If no footer text set, render nothing (no hardcoded fallback)
- Remove "Freundliche Grüsse" + company name block — the footer bar replaces this

### 3f. Intro Text

- Keep existing `drawIntroText()` behavior — renders `company.quote_intro_text` above the items table

## Step 4: Wire Up in Angebote Page (`Angebote.tsx`)

- Update `preparePdfData()` to also fetch the logo as base64
- Pass `logoBase64` in the QuoteData object to `generateQuotePDF()`
- Update the `QuoteData` interface to include optional `logoBase64: string | null`

## Existing Utilities to Reuse

- `formatAmount()` (`pdfGenerator.ts:275`) — Already formats with apostrophe thousand separator
- `formatDate()` (`pdfGenerator.ts:282`) — DD.MM.YYYY format
- `formatAddress()` (`pdfGenerator.ts:172`) — Combines street + house number
- `sanitizeForPDF()` (`pdfGenerator.ts:140`) — Strips control chars and non-Latin-1
- `renderCompanySender()` (`pdfGenerator.ts:189`) — Renders optional contact name + company name
- `drawIntroText()` / `drawFooterText()` — Existing dynamic text rendering
- `getCountryName()` (`pdfGenerator.ts:293`) — ISO code to German name

## Verification

1. `npm run build` — must pass
2. Create a quote with:
   - Multi-line item descriptions (first line = title)
   - Discount (both percent and fixed)
   - Large amounts (verify "1'250.00" formatting)
3. Generate PDF and verify:
   - Logo top-right (or gracefully omitted)
   - No sender address top-left
   - Recipient address left side
   - "Angebot" title (not "ANGEBOT")
   - All dates in black (no red)
   - Table header in #6b8a5e with white text
   - Description column: first line bold, rest normal
   - Price columns: numbers only, "CHF" in header only
   - Totals: proper alignment, green discount, Swiss-rounded total
   - Footer bar with accent line + 3-column company info
   - No hardcoded closing text (uses dynamic footer text)
