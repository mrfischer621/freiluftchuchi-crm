/**
 * Invoice Validation Utility
 *
 * Validates invoice data before PDF generation to prevent crashes
 * caused by missing master data (company/customer information).
 */

import type { Invoice, Customer, Company } from '../lib/supabase';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that all required data for PDF generation is present.
 *
 * Checks:
 * - Company information (name, address, IBAN/QR-IBAN)
 * - Customer information (name, address)
 * - Invoice items (at least one valid item)
 *
 * @param invoice - The invoice to validate
 * @param company - The company issuing the invoice
 * @param customer - The customer receiving the invoice
 * @returns Validation result with list of errors (if any)
 */
export function validateInvoiceData(
  invoice: Invoice | { items?: Array<{ description?: string }> },
  company: Company,
  customer: Customer
): ValidationResult {
  const errors: string[] = [];

  // ============================================================================
  // Company Validation
  // ============================================================================

  if (!company.name?.trim()) {
    errors.push('Firmenname fehlt in den Einstellungen.');
  }

  if (!company.street?.trim()) {
    errors.push('Strasse fehlt im Firmenprofil. Bitte ergänzen Sie die Adresse in den Einstellungen.');
  }

  if (!company.house_number?.trim()) {
    errors.push('Hausnummer fehlt im Firmenprofil. Bitte ergänzen Sie die Adresse in den Einstellungen.');
  }

  if (!company.zip_code?.trim()) {
    errors.push('PLZ fehlt im Firmenprofil. Bitte ergänzen Sie die Adresse in den Einstellungen.');
  }

  if (!company.city?.trim()) {
    errors.push('Ort fehlt im Firmenprofil. Bitte ergänzen Sie die Adresse in den Einstellungen.');
  }

  // IBAN or QR-IBAN required for Swiss QR-Bill
  if (!company.iban?.trim() && !company.qr_iban?.trim()) {
    errors.push('IBAN oder QR-IBAN fehlt für die QR-Rechnung. Bitte ergänzen Sie die Bankverbindung in den Einstellungen.');
  }

  // ============================================================================
  // Customer Validation
  // ============================================================================

  if (!customer.name?.trim()) {
    errors.push('Kundenname fehlt. Bitte ergänzen Sie die Kundendaten.');
  }

  if (!customer.street?.trim()) {
    errors.push('Kundenadresse unvollständig: Strasse fehlt. Bitte ergänzen Sie die Kundenadresse.');
  }

  if (!customer.house_number?.trim()) {
    errors.push('Kundenadresse unvollständig: Hausnummer fehlt. Bitte ergänzen Sie die Kundenadresse.');
  }

  if (!customer.zip_code?.trim()) {
    errors.push('Kundenadresse unvollständig: PLZ fehlt. Bitte ergänzen Sie die Kundenadresse.');
  }

  if (!customer.city?.trim()) {
    errors.push('Kundenadresse unvollständig: Ort fehlt. Bitte ergänzen Sie die Kundenadresse.');
  }

  // ============================================================================
  // Invoice Items Validation
  // ============================================================================

  const items = 'items' in invoice ? invoice.items : [];

  if (!items || items.length === 0) {
    errors.push('Keine Rechnungspositionen vorhanden. Bitte fügen Sie mindestens eine Position hinzu.');
  } else {
    // Check for empty descriptions
    const hasEmptyDescription = items.some(
      (item) => !item.description?.trim()
    );

    if (hasEmptyDescription) {
      errors.push('Eine oder mehrere Rechnungspositionen haben keine Beschreibung. Bitte ergänzen Sie alle Positionen.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Quick validation for company profile completeness.
 * Useful for settings page to show warnings.
 *
 * @param company - The company to validate
 * @returns Validation result with list of missing fields
 */
export function validateCompanyProfile(company: Company): ValidationResult {
  const errors: string[] = [];

  if (!company.name?.trim()) {
    errors.push('Firmenname');
  }

  if (!company.street?.trim()) {
    errors.push('Strasse');
  }

  if (!company.house_number?.trim()) {
    errors.push('Hausnummer');
  }

  if (!company.zip_code?.trim()) {
    errors.push('PLZ');
  }

  if (!company.city?.trim()) {
    errors.push('Ort');
  }

  if (!company.iban?.trim() && !company.qr_iban?.trim()) {
    errors.push('IBAN/QR-IBAN');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0
      ? [`Fehlende Pflichtfelder: ${errors.join(', ')}`]
      : [],
  };
}

/**
 * Quick validation for customer data completeness.
 * Useful for customer form to show warnings.
 *
 * @param customer - The customer to validate
 * @returns Validation result with list of missing fields
 */
export function validateCustomerProfile(customer: Customer): ValidationResult {
  const errors: string[] = [];

  if (!customer.name?.trim()) {
    errors.push('Kundenname');
  }

  if (!customer.street?.trim()) {
    errors.push('Strasse');
  }

  if (!customer.house_number?.trim()) {
    errors.push('Hausnummer');
  }

  if (!customer.zip_code?.trim()) {
    errors.push('PLZ');
  }

  if (!customer.city?.trim()) {
    errors.push('Ort');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0
      ? [`Fehlende Pflichtfelder für Rechnungserstellung: ${errors.join(', ')}`]
      : [],
  };
}
