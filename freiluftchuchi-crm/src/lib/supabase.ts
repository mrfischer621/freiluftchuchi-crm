import { createClient } from '@supabase/supabase-js';

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  status: 'offen' | 'laufend' | 'abgeschlossen';
  budget: number | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  company_id: string;
  project_id: string;
  date: string;
  hours: number;
  rate: number;
  description: string | null;
  invoiced: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string;
  project_id: string | null;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: 'entwurf' | 'versendet' | 'bezahlt' | 'überfällig';
  paid_at: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Transaction {
  id: string;
  company_id: string;
  type: 'einnahme' | 'ausgabe';
  date: string;
  amount: number;
  description: string | null;
  category: string | null;
  project_id: string | null;
  customer_id: string | null;
  invoice_id: string | null;
  document_url: string | null;
  tags: string[] | null;
  billable: boolean;
  transaction_number: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  price: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id' | 'created_at'>;
        Update: Partial<Omit<Company, 'id' | 'created_at'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at'>;
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      time_entries: {
        Row: TimeEntry;
        Insert: Omit<TimeEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<TimeEntry, 'id' | 'created_at'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'created_at'>;
        Update: Partial<Omit<Invoice, 'id' | 'created_at'>>;
      };
      invoice_items: {
        Row: InvoiceItem;
        Insert: Omit<InvoiceItem, 'id'>;
        Update: Partial<Omit<InvoiceItem, 'id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at'>;
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create client without strict typing to avoid TypeScript issues with Supabase generics
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
