/**
 * Swiss Invoice PDF Generator with QR-Bill
 * Compliant with Swiss Payment Standards (SPS) 2025 v2.3
 *
 * Layout:
 * - Receipt (Empfangsschein): 62mm width, left side
 * - Payment Part (Zahlteil): 148mm width, right side
 * - Total width: 210mm (A4)
 * - QR section height: ~105mm at bottom of A4
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { SwissQRBill } from './swissqr';
import type { Invoice, InvoiceItem, Customer, Company } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface InvoiceData {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
  company: Company;
}

// ============================================================================
// CONSTANTS - Swiss QR-Bill Layout Dimensions
// ============================================================================

const LAYOUT = {
  // Page dimensions
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,

  // QR-Bill section
  QR_SECTION_HEIGHT: 105,
  QR_SECTION_Y: 192, // 297 - 105

  // Receipt part (Empfangsschein)
  RECEIPT_WIDTH: 62,
  RECEIPT_X: 5,

  // Payment part (Zahlteil)
  PAYMENT_WIDTH: 148,
  PAYMENT_X: 67, // 62 + 5 margin

  // Separator
  SEPARATOR_Y: 192,

  // QR code
  QR_SIZE: 46, // 46mm x 46mm
  QR_X: 67,
  QR_Y: 209,

  // Swiss cross
  CROSS_SIZE: 7,
};

const FONTS = {
  TITLE: { size: 11, style: 'bold' as const },
  LABEL: { size: 6, style: 'bold' as const },
  CONTENT: { size: 8, style: 'normal' as const },
  CONTENT_SMALL: { size: 7, style: 'normal' as const },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Combine street and house number for display.
 * Handles empty house numbers gracefully.
 */
function formatAddress(street: string | null, houseNumber: string | null): string {
  if (!street) return '';
  if (!houseNumber || houseNumber.trim() === '') return street.trim();
  return `${street.trim()} ${houseNumber.trim()}`;
}

/**
 * Draw the Swiss cross (vector graphics, no images).
 * - Black square: 7mm x 7mm
 * - White cross on top
 */
function drawSwissCross(doc: jsPDF, x: number, y: number, size: number = 7): void {
  // Black background square
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, size, size, 'F');

  // White cross on top
  doc.setFillColor(255, 255, 255);

  // Horizontal bar of cross (wider)
  const crossThickness = size * 0.2; // 20% of size
  const crossLength = size * 0.6; // 60% of size
  const offset = (size - crossLength) / 2;

  // Horizontal bar
  doc.rect(
    x + offset,
    y + (size - crossThickness) / 2,
    crossLength,
    crossThickness,
    'F'
  );

  // Vertical bar
  doc.rect(
    x + (size - crossThickness) / 2,
    y + offset,
    crossThickness,
    crossLength,
    'F'
  );
}

/**
 * Draw scissors symbol (for cutting line)
 */
function drawScissors(doc: jsPDF, x: number, y: number): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('✂', x, y);
}

/**
 * Draw dashed separator line
 */
function drawSeparatorLine(doc: jsPDF, y: number): void {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setLineDash([2, 2], 0);
  doc.line(0, y, LAYOUT.PAGE_WIDTH, y);
  doc.setLineDash([], 0); // Reset to solid line

  // Add scissors at left and center
  drawScissors(doc, 3, y + 1);
  drawScissors(doc, 62, y + 1);
}

/**
 * Format amount with thousand separators
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/**
 * Format date as DD.MM.YYYY
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Convert ISO country code to full country name (German)
 */
function getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'CH': 'Schweiz',
    'DE': 'Deutschland',
    'AT': 'Österreich',
    'FR': 'Frankreich',
    'IT': 'Italien',
    'LI': 'Liechtenstein',
    'BE': 'Belgien',
    'NL': 'Niederlande',
    'LU': 'Luxemburg',
    'ES': 'Spanien',
    'PT': 'Portugal',
    'GB': 'Grossbritannien',
    'UK': 'Grossbritannien',
    'US': 'USA',
    'CA': 'Kanada',
    'PL': 'Polen',
    'CZ': 'Tschechien',
    'SK': 'Slowakei',
    'HU': 'Ungarn',
    'RO': 'Rumänien',
    'BG': 'Bulgarien',
    'GR': 'Griechenland',
    'TR': 'Türkei',
    'SE': 'Schweden',
    'NO': 'Norwegen',
    'DK': 'Dänemark',
    'FI': 'Finnland',
  };

  const code = countryCode.toUpperCase();
  return countryMap[code] || code; // Fallback to code if not found
}

// ============================================================================
// RECEIPT SECTION (Empfangsschein - Left Part, 62mm)
// ============================================================================

function drawReceiptSection(
  doc: jsPDF,
  company: Company,
  customer: Customer,
  invoice: Invoice,
  qrReference?: string
): void {
  const x = LAYOUT.RECEIPT_X;
  let y = LAYOUT.QR_SECTION_Y + 5;

  // Title: "Empfangsschein"
  doc.setFont('helvetica', FONTS.TITLE.style);
  doc.setFontSize(FONTS.TITLE.size);
  doc.text('Empfangsschein', x, y);
  y += 7;

  // Account / Payable to (Konto / Zahlbar an)
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Konto / Zahlbar an', x, y);
  y += 3;

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  const iban = company.qr_iban || company.iban || '';
  doc.text(SwissQRBill.formatIBAN(iban), x, y);
  y += 3;
  doc.text(company.name, x, y);
  y += 3;
  doc.text(formatAddress(company.street, company.house_number), x, y);
  y += 3;
  doc.text(`${company.zip_code} ${company.city}`, x, y);
  y += 7;

  // Reference (only display if we have a QR reference)
  if (qrReference) {
    doc.setFont('helvetica', FONTS.LABEL.style);
    doc.setFontSize(FONTS.LABEL.size);
    doc.text('Referenz', x, y);
    y += 3;

    doc.setFont('helvetica', FONTS.CONTENT.style);
    doc.setFontSize(FONTS.CONTENT_SMALL.size);
    // Format QR reference for display (groups of 5)
    const formattedRef = qrReference.match(/.{1,5}/g)?.join(' ') || qrReference;
    doc.text(formattedRef, x, y, { maxWidth: 50 });
    y += 7;
  }

  // Payable by (Zahlbar durch)
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Zahlbar durch', x, y);
  y += 3;

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  doc.text(customer.name, x, y);
  y += 3;
  if (customer.street) {
    doc.text(formatAddress(customer.street, customer.house_number), x, y);
    y += 3;
  }
  if (customer.zip_code && customer.city) {
    doc.text(`${customer.zip_code} ${customer.city}`, x, y);
    y += 3;
  }

  // Acceptance point (Annahmestelle) - bottom right of receipt
  y = LAYOUT.QR_SECTION_Y + LAYOUT.QR_SECTION_HEIGHT - 5;
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Annahmestelle', x + 30, y, { align: 'right' });
}

// ============================================================================
// PAYMENT SECTION (Zahlteil - Right Part, 148mm)
// ============================================================================

async function drawPaymentSection(
  doc: jsPDF,
  company: Company,
  customer: Customer,
  invoice: Invoice,
  qrCodeDataURL: string,
  qrReference?: string
): Promise<void> {
  const x = LAYOUT.PAYMENT_X;
  let y = LAYOUT.QR_SECTION_Y + 5;

  // Title: "Zahlteil"
  doc.setFont('helvetica', FONTS.TITLE.style);
  doc.setFontSize(FONTS.TITLE.size);
  doc.text('Zahlteil', x, y);

  // QR Code
  doc.addImage(
    qrCodeDataURL,
    'PNG',
    LAYOUT.QR_X,
    LAYOUT.QR_Y,
    LAYOUT.QR_SIZE,
    LAYOUT.QR_SIZE
  );

  // Swiss cross in center of QR code
  const crossX = LAYOUT.QR_X + (LAYOUT.QR_SIZE - LAYOUT.CROSS_SIZE) / 2;
  const crossY = LAYOUT.QR_Y + (LAYOUT.QR_SIZE - LAYOUT.CROSS_SIZE) / 2;
  drawSwissCross(doc, crossX, crossY, LAYOUT.CROSS_SIZE);

  // Right side information (next to QR code)
  const infoX = LAYOUT.QR_X + LAYOUT.QR_SIZE + 5;
  let infoY = LAYOUT.QR_Y;

  // Currency & Amount
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Währung', infoX, infoY);
  y += 3;

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  doc.text('CHF', infoX, infoY + 3);

  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Betrag', infoX + 15, infoY);

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  doc.text(formatAmount(invoice.total), infoX + 15, infoY + 3);
  infoY += 10;

  // Account / Payable to
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Konto / Zahlbar an', infoX, infoY);
  infoY += 3;

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  const iban = company.qr_iban || company.iban || '';
  doc.text(SwissQRBill.formatIBAN(iban), infoX, infoY);
  infoY += 3;
  doc.text(company.name, infoX, infoY);
  infoY += 3;
  doc.text(formatAddress(company.street, company.house_number), infoX, infoY);
  infoY += 3;
  doc.text(`${company.zip_code} ${company.city}`, infoX, infoY);
  infoY += 7;

  // Reference (only display if we have a QR reference)
  if (qrReference) {
    doc.setFont('helvetica', FONTS.LABEL.style);
    doc.setFontSize(FONTS.LABEL.size);
    doc.text('Referenz', infoX, infoY);
    infoY += 3;

    doc.setFont('helvetica', FONTS.CONTENT.style);
    doc.setFontSize(FONTS.CONTENT_SMALL.size);
    const formattedRef = qrReference.match(/.{1,5}/g)?.join(' ') || qrReference;
    doc.text(formattedRef, infoX, infoY, { maxWidth: 60 });
    infoY += 7;
  }

  // Additional information
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Zusätzliche Informationen', infoX, infoY);
  infoY += 3;

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  doc.text(`Rechnung ${invoice.invoice_number}`, infoX, infoY);
  infoY += 3;
  doc.text(`Datum: ${formatDate(invoice.issue_date)}`, infoX, infoY);
  if (invoice.due_date) {
    infoY += 3;
    doc.text(`Fällig: ${formatDate(invoice.due_date)}`, infoX, infoY);
  }
  infoY += 7;

  // Payable by
  doc.setFont('helvetica', FONTS.LABEL.style);
  doc.setFontSize(FONTS.LABEL.size);
  doc.text('Zahlbar durch', infoX, infoY);
  infoY += 3;

  doc.setFont('helvetica', FONTS.CONTENT.style);
  doc.setFontSize(FONTS.CONTENT.size);
  doc.text(customer.name, infoX, infoY);
  infoY += 3;
  if (customer.street) {
    doc.text(formatAddress(customer.street, customer.house_number), infoX, infoY);
    infoY += 3;
  }
  if (customer.zip_code && customer.city) {
    doc.text(`${customer.zip_code} ${customer.city}`, infoX, infoY);
  }
}

// ============================================================================
// INVOICE HEADER & CONTENT
// ============================================================================

function drawInvoiceHeader(
  doc: jsPDF,
  company: Company,
  customer: Customer,
  invoice: Invoice
): void {
  let y = 20;

  // Company logo placeholder or name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.name, 20, y);
  y += 6;

  // Company address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(formatAddress(company.street, company.house_number), 20, y);
  y += 4;
  doc.text(`${company.zip_code} ${company.city}`, 20, y);
  y += 8;

  // Invoice title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('RECHNUNG', 20, y);
  y += 10;

  // Customer address (right side)
  const customerX = 120;
  let customerY = 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customer.name, customerX, customerY);
  customerY += 5;

  if (customer.contact_person) {
    doc.text(customer.contact_person, customerX, customerY);
    customerY += 5;
  }

  if (customer.street) {
    doc.text(formatAddress(customer.street, customer.house_number), customerX, customerY);
    customerY += 5;
  }

  if (customer.zip_code && customer.city) {
    doc.text(`${customer.zip_code} ${customer.city}`, customerX, customerY);
    customerY += 5;
  }

  // Display country only if different from Switzerland
  // Normalize country: handle both "CH", "Schweiz", or other formats
  const rawCountry = (customer.country || 'CH').trim();
  const customerCountry = (rawCountry === 'Schweiz' || rawCountry === 'CH')
    ? 'CH'
    : rawCountry.substring(0, 2).toUpperCase();

  if (customerCountry !== 'CH') {
    doc.text(getCountryName(customerCountry), customerX, customerY);
    customerY += 5;
  }

  // Invoice details
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Rechnungsnummer:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 70, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Datum:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.issue_date), 70, y);
  y += 6;

  if (invoice.due_date) {
    doc.setFont('helvetica', 'bold');
    doc.text('Fälligkeitsdatum:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.due_date), 70, y);
    y += 6;
  }

  if (company.uid_number) {
    doc.setFont('helvetica', 'bold');
    doc.text('UID:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(company.uid_number, 70, y);
    y += 6;
  }
}

function drawInvoiceItems(
  doc: jsPDF,
  items: InvoiceItem[],
  invoice: Invoice
): void {
  let y = 100;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Beschreibung', 20, y);
  doc.text('Menge', 120, y);
  doc.text('Preis', 145, y);
  doc.text('Total', 175, y, { align: 'right' });
  y += 2;

  // Header line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 6;

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  items.forEach((item) => {
    // Handle long descriptions
    const description = item.description || '';
    const lines = doc.splitTextToSize(description, 95);

    lines.forEach((line: string, index: number) => {
      doc.text(line, 20, y);
      if (index === 0) {
        doc.text(item.quantity.toString(), 120, y);
        doc.text(`CHF ${formatAmount(item.unit_price)}`, 145, y);
        doc.text(`CHF ${formatAmount(item.total)}`, 190, y, { align: 'right' });
      }
      y += 5;
    });
  });

  // Spacing
  y += 5;

  // Subtotal
  doc.setFont('helvetica', 'bold');
  doc.text('Zwischensumme:', 145, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`CHF ${formatAmount(invoice.subtotal)}`, 190, y, { align: 'right' });
  y += 6;

  // VAT
  if (invoice.vat_amount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`MWST (${invoice.vat_rate}%):`, 145, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`CHF ${formatAmount(invoice.vat_amount)}`, 190, y, { align: 'right' });
    y += 6;
  }

  // Total line
  doc.setLineWidth(0.5);
  doc.line(145, y, 190, y);
  y += 6;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Gesamtbetrag:', 110, y);
  doc.text(`CHF ${formatAmount(invoice.total)}`, 190, y, { align: 'right' });
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate invoice PDF with Swiss QR-Bill
 *
 * @param data - Invoice data with all related entities
 * @returns Promise<Blob> - PDF file as blob
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Blob> {
  const { invoice, items, customer, company } = data;

  // Safety checks - ensure required company data exists
  if (!company.street) {
    throw new Error(
      'Firmenadresse unvollständig: Strasse fehlt. ' +
      'Bitte vervollständigen Sie die Firmeneinstellungen.'
    );
  }

  if (!company.zip_code) {
    throw new Error(
      'Firmenadresse unvollständig: Postleitzahl fehlt. ' +
      'Bitte vervollständigen Sie die Firmeneinstellungen.'
    );
  }

  if (!company.city) {
    throw new Error(
      'Firmenadresse unvollständig: Ort fehlt. ' +
      'Bitte vervollständigen Sie die Firmeneinstellungen.'
    );
  }

  if (!company.qr_iban && !company.iban) {
    throw new Error(
      'Keine IBAN hinterlegt. ' +
      'Bitte hinterlegen Sie eine QR-IBAN oder IBAN in den Firmeneinstellungen.'
    );
  }

  // Safety checks for customer
  if (!customer.street) {
    throw new Error(
      `Kundenadresse unvollständig: Strasse fehlt für Kunde "${customer.name}".`
    );
  }

  if (!customer.zip_code || !customer.city) {
    throw new Error(
      `Kundenadresse unvollständig: PLZ/Ort fehlt für Kunde "${customer.name}".`
    );
  }

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Determine which account to use
  const account = company.qr_iban || company.iban || '';

  // Check if the account is a QR-IBAN
  const isQRIBAN = SwissQRBill.isQRIBAN(account);

  // Generate QR reference ONLY if using QR-IBAN
  // Normal IBANs cannot use QR references (27 digits)
  const qrReference = isQRIBAN
    ? SwissQRBill.generateQRReference(invoice.invoice_number)
    : undefined;

  // Normalize country for QR code: handle both "CH", "Schweiz", or other formats
  const rawCountryQR = (customer.country || 'CH').trim();
  const qrCountry = (rawCountryQR === 'Schweiz' || rawCountryQR === 'CH')
    ? 'CH'
    : rawCountryQR.substring(0, 2).toUpperCase();

  const qrBill = new SwissQRBill({
    creditor: {
      account: account,
      address: {
        name: company.name,
        street: company.street,
        houseNumber: company.house_number || undefined,
        postalCode: company.zip_code,
        city: company.city,
        country: 'CH',
      },
    },
    debtor: {
      address: {
        name: customer.name,
        street: customer.street,
        houseNumber: customer.house_number || undefined,
        postalCode: customer.zip_code,
        city: customer.city,
        country: qrCountry,
      },
    },
    amount: invoice.total,
    currency: 'CHF',
    reference: qrReference, // Only set if QR-IBAN
    message: `Rechnung ${invoice.invoice_number}`,
  });

  // Generate QR code as data URL
  const qrCodeData = qrBill.toString();
  const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 200, // High resolution
  });

  // Draw invoice content
  drawInvoiceHeader(doc, company, customer, invoice);
  drawInvoiceItems(doc, items, invoice);

  // Draw separator line with scissors
  drawSeparatorLine(doc, LAYOUT.SEPARATOR_Y);

  // Draw QR-Bill sections
  drawReceiptSection(doc, company, customer, invoice, qrReference);
  await drawPaymentSection(doc, company, customer, invoice, qrCodeDataURL, qrReference);

  // Add payment instructions at bottom of main content
  let footerY = 170;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Bitte verwenden Sie für die Zahlung den untenstehenden Einzahlungsschein.',
    20,
    footerY
  );
  footerY += 5;
  doc.text(
    'Vielen Dank für Ihr Vertrauen.',
    20,
    footerY
  );

  // Convert to blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePDF(data: InvoiceData): Promise<void> {
  const pdfBlob = await generateInvoicePDF(data);
  const url = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Rechnung_${data.invoice.invoice_number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
