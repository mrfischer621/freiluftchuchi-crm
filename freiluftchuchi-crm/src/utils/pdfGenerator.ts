import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { Invoice, InvoiceItem, Customer } from '../lib/supabase';

// Generate QR reference from invoice number (27 digits with check digit)
function generateQRReference(invoiceNumber: string): string {
  // Extract number from invoice format (RE-2025-001)
  const match = invoiceNumber.match(/\d+/g);
  const numbers = match ? match.join('') : '';

  // Pad to 26 digits
  const reference = numbers.padStart(26, '0');

  // Calculate check digit (Modulo 10, recursive)
  let carry = 0;
  for (let i = 0; i < reference.length; i++) {
    carry = (carry + parseInt(reference[i])) % 10;
    carry = (carry * 2) % 10;
    if (carry === 0) carry = 10;
    carry = (10 - carry) % 10;
  }

  return reference + carry.toString();
}

// Generate Swiss QR Bill payload according to ISO 20022 standard
function generateSwissQRPayload(
  amount: number,
  reference: string,
  customerName: string,
  customerStreet: string,
  customerBuildingNumber: string,
  customerZip: string,
  customerCity: string,
  message: string
): string {
  // Swiss Payment Code (SPC) format - Version 2.0
  // WICHTIG: Jede Zeile ist ein Feld, Zeilenumbruch mit \n
  const lines = [
    'SPC',                           // QRType
    '0200',                          // Version
    '1',                             // Coding Type (1 = UTF-8)
    'CH9300762011623852957',        // IBAN (ohne Leerzeichen)
    'S',                             // Creditor Address Type (S = Strukturiert)
    'Freiluftchuchi',               // Creditor Name
    '[Deine Strasse]',              // Creditor Street
    '',                              // Creditor Building Number
    '[PLZ]',                        // Creditor Postal Code
    '[Ort]',                        // Creditor City
    'CH',                            // Creditor Country (2-stellig)
    '',                              // Ultimate Creditor Name (leer)
    '',                              // Ultimate Creditor Street (leer)
    '',                              // Ultimate Creditor Building (leer)
    '',                              // Ultimate Creditor Postal Code (leer)
    '',                              // Ultimate Creditor City (leer)
    '',                              // Ultimate Creditor Country (leer)
    amount.toFixed(2),               // Amount (mit Punkt als Dezimaltrenner)
    'CHF',                           // Currency
    'S',                             // Debtor Address Type (S = Strukturiert)
    customerName,                    // Debtor Name
    customerStreet,                  // Debtor Street
    customerBuildingNumber,          // Debtor Building Number
    customerZip,                     // Debtor Postal Code
    customerCity,                    // Debtor City
    'CH',                            // Debtor Country (2-stellig)
    'QRR',                           // Reference Type (QRR = QR Reference)
    reference,                       // Reference (27-stellig)
    message,                         // Zusätzliche Informationen
    'EPD'                            // End Payment Data (Trailer)
  ];

  return lines.join('\n');
}

export async function generateInvoicePDF(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer
) {
  const doc = new jsPDF();

  // Company info (top left)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Freiluftchuchi', 20, 20);
  doc.setFont('helvetica', 'normal');
  doc.text('Nicolas [Nachname]', 20, 26);
  doc.text('[Deine Strasse]', 20, 32);
  doc.text('[PLZ] [Ort]', 20, 38);

  // Invoice details (top right)
  doc.setFontSize(10);
  doc.text(`Rechnungsnummer: ${invoice.invoice_number}`, 120, 20);
  doc.text(`Datum: ${new Date(invoice.issue_date).toLocaleDateString('de-CH')}`, 120, 26);
  if (invoice.due_date) {
    doc.text(`Fälligkeit: ${new Date(invoice.due_date).toLocaleDateString('de-CH')}`, 120, 32);
  }

  // Customer address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.name, 20, 60);
  if (customer.address) {
    const addressLines = customer.address.split('\n');
    addressLines.forEach((line, index) => {
      doc.text(line, 20, 66 + (index * 6));
    });
  }

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RECHNUNG', 20, 100);

  // Items table
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toFixed(2),
    `CHF ${item.unit_price.toFixed(2)}`,
    `CHF ${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 110,
    head: [['Pos', 'Beschreibung', 'Menge', 'Einzelpreis', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [92, 136, 143], // freiluft color
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    styles: {
      fontSize: 10,
    },
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 110;

  // Totals (bottom right)
  const totalsX = 130;
  let currentY = finalY + 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.text('Zwischentotal:', totalsX, currentY);
  doc.text(`CHF ${invoice.subtotal.toFixed(2)}`, 185, currentY, { align: 'right' });

  // VAT
  currentY += 6;
  doc.text(`MwSt ${invoice.vat_rate.toFixed(1)}%:`, totalsX, currentY);
  doc.text(`CHF ${invoice.vat_amount.toFixed(2)}`, 185, currentY, { align: 'right' });

  // Line
  currentY += 3;
  doc.line(totalsX, currentY, 185, currentY);

  // Total
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX, currentY);
  doc.text(`CHF ${invoice.total.toFixed(2)}`, 185, currentY, { align: 'right' });

  // Payment note (before QR section)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Zahlbar innert 30 Tagen - bitte verwenden Sie den QR-Einzahlungsschein unten', 20, 190);
  doc.text('Vielen Dank für Ihr Vertrauen', 20, 196);

  // Separation line with scissors
  doc.setDrawColor(150, 150, 150);
  // Use dashed line pattern if available
  if (typeof (doc as any).setLineDash === 'function') {
    (doc as any).setLineDash([2, 2]);
  }
  doc.line(10, 205, 200, 205);
  if (typeof (doc as any).setLineDash === 'function') {
    (doc as any).setLineDash([]);
  }
  doc.setFontSize(8);
  doc.text('✂', 5, 207);

  // Swiss QR Bill - Manual implementation with qrcode library
  try {
    // Prepare customer address for QR bill
    const customerAddressLines = customer.address ? customer.address.split('\n') : [''];
    const streetLine = customerAddressLines[0] || '';
    const cityLine = customerAddressLines[1] || '';

    // Parse street and building number (e.g., "Musterstrasse 123" -> street: "Musterstrasse", buildingNumber: "123")
    const streetMatch = streetLine.match(/^(.+?)\s+(\d+[a-zA-Z]*)$/);
    const customerStreet = streetMatch ? streetMatch[1] : streetLine || '';
    const customerBuildingNumber = streetMatch ? streetMatch[2] : '';

    // Parse ZIP and city (e.g., "8000 Zürich" -> zip: "8000", city: "Zürich")
    const zipMatch = cityLine.match(/^(\d{4})\s+(.+)$/);
    const zip = zipMatch ? zipMatch[1] : '';
    const city = zipMatch ? zipMatch[2] : cityLine;

    const qrReference = generateQRReference(invoice.invoice_number);

    // Generate Swiss QR Bill payload according to ISO 20022
    const qrPayload = generateSwissQRPayload(
      invoice.total,
      qrReference,
      customer.name,
      customerStreet,
      customerBuildingNumber,
      zip,
      city,
      `Rechnung ${invoice.invoice_number}`
    );

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      width: 174, // 46mm at 96 DPI (46 * 3.78)
      margin: 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Swiss QR Bill Layout (all measurements in mm)
    const startY = 210;

    // Receipt section (left, 62mm wide)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Empfangsschein', 5, startY + 5);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Konto / Zahlbar an', 5, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CH93 0076 2011 6238 5295 7', 5, startY + 16);
    doc.text('Freiluftchuchi', 5, startY + 20);
    doc.text('[Deine Strasse]', 5, startY + 24);
    doc.text('[PLZ] [Ort]', 5, startY + 28);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Referenz', 5, startY + 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(qrReference, 5, startY + 40);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlbar durch', 5, startY + 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(customer.name, 5, startY + 52);
    const displayStreet = customerBuildingNumber ? `${customerStreet} ${customerBuildingNumber}` : customerStreet;
    if (displayStreet) doc.text(displayStreet, 5, startY + 56);
    if (zip && city) doc.text(`${zip} ${city}`, 5, startY + 60);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Währung', 5, startY + 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CHF', 5, startY + 84);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Betrag', 38, startY + 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(invoice.total.toFixed(2), 38, startY + 84);

    // Vertical separation line between receipt and payment part
    doc.line(62, startY, 62, startY + 105);

    // Payment section (right, 148mm wide)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlteil', 67, startY + 5);

    // QR Code (46x46mm at position 67mm from left, 17mm from top of payment section)
    doc.addImage(qrCodeDataUrl, 'PNG', 67, startY + 17, 46, 46);

    // Add Swiss Cross in center of QR code
    doc.setFillColor(255, 255, 255);
    doc.rect(67 + 18, startY + 17 + 18, 10, 10, 'F');
    doc.setFillColor(0, 0, 0);
    doc.rect(67 + 20, startY + 17 + 20, 6, 2, 'F');
    doc.rect(67 + 22, startY + 17 + 18, 2, 10, 'F');

    // Amount section (right side)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Währung', 118, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CHF', 118, startY + 16);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Betrag', 151, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(invoice.total.toFixed(2), 151, startY + 16);

    // Account / Payable to (right side)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Konto / Zahlbar an', 118, startY + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CH93 0076 2011 6238 5295 7', 118, startY + 28);
    doc.text('Freiluftchuchi', 118, startY + 32);
    doc.text('[Deine Strasse]', 118, startY + 36);
    doc.text('[PLZ] [Ort]', 118, startY + 40);

    // Reference (right side)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Referenz', 118, startY + 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(qrReference, 118, startY + 52);

    // Additional information (right side)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Zusätzliche Informationen', 118, startY + 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Rechnung ${invoice.invoice_number}`, 118, startY + 64);

    // Payable by (right side)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlbar durch', 118, startY + 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(customer.name, 118, startY + 76);
    if (displayStreet) doc.text(displayStreet, 118, startY + 80);
    if (zip && city) doc.text(`${zip} ${city}`, 118, startY + 84);

  } catch (error) {
    console.error('Error generating Swiss QR Bill:', error);

    // Fallback: Add manual QR section note
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Zahlteil', 20, 215);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Konto / Zahlbar an:', 20, 222);
    doc.text('CH93 0076 2011 6238 5295 7', 20, 227);
    doc.text('Freiluftchuchi', 20, 232);
    doc.text('Nicolas [Nachname]', 20, 237);
    doc.text('[Deine Strasse]', 20, 242);
    doc.text('[PLZ] [Ort]', 20, 247);

    doc.text('Zahlbar durch:', 20, 257);
    doc.text(customer.name, 20, 262);
    if (customer.address) {
      const lines = customer.address.split('\n');
      lines.forEach((line, i) => {
        doc.text(line, 20, 267 + (i * 5));
      });
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Betrag: CHF ${invoice.total.toFixed(2)}`, 20, 285);
    doc.text(`Referenz: ${generateQRReference(invoice.invoice_number)}`, 20, 290);
  }

  // Save PDF
  doc.save(`${invoice.invoice_number}.pdf`);
}
