import type { Customer } from '../lib/supabase';

/**
 * Get the display name for a customer contact.
 * Falls back to company name if contact_person is not set (B2B use case).
 *
 * @param customer - Customer object
 * @returns Display name for the contact person
 */
export const getCustomerDisplayName = (customer: Customer): string => {
  return customer.contact_person || customer.name;
};
