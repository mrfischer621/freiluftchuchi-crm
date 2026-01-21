import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, InvoiceItem, Customer } from '../lib/supabase';

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

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Zahlbar innert 30 Tagen', 20, 270);
  doc.text('Vielen Dank für Ihr Vertrauen', 20, 276);

  // Save PDF
  doc.save(`${invoice.invoice_number}.pdf`);
}
