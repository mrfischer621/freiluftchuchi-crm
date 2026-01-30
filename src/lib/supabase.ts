import { createClient } from '@supabase/supabase-js';

// User Profile (linked to auth.users)
export interface Profile {
  id: string; // auth.users.id
  email: string;
  full_name: string | null;
  last_active_company_id: string | null; // Last selected company
  created_at: string;
  updated_at: string;
}

// User-Company Junction (many-to-many relationship)
export interface UserCompany {
  id: string;
  user_id: string; // auth.users.id
  company_id: string; // companies.id
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  street: string | null;
  house_number: string | null;
  zip_code: string | null;
  city: string | null;
  iban: string | null;
  qr_iban: string | null;
  uid_number: string | null;
  bank_name: string | null;
  vat_number: string | null;
  vat_registered: boolean;
  created_at: string;
  // Text templates for invoices and quotes
  invoice_intro_text: string | null;
  invoice_footer_text: string | null;
  quote_intro_text: string | null;
  quote_footer_text: string | null;
  // Optional fields that may not exist in DB yet:
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  updated_at?: string;
}

export interface Customer {
  id: string;
  company_id: string;
  // Tab: General
  name: string;
  contact_person: string | null;
  email: string | null;
  hourly_rate: number | null;
  // Tab: Address (structured for Swiss QR-Bills)
  street: string | null;
  house_number: string | null;
  zip_code: string | null;
  city: string | null;
  country: string | null;
  alternate_billing_address: string | null;
  // Tab: More
  co: string | null;
  department: string | null;
  phone: string | null;
  website: string | null;
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

// Year-End Closing Types
export interface Asset {
  name: string;
  value: number;
  depreciation_rate: number;
  amount: number;
}

export interface PrivateShare {
  category: string;
  percentage: number;
  amount: number;
}

export interface YearEndClosingData {
  assets: Asset[];
  private_shares: PrivateShare[];
  social_security_provision: number;
}

export interface YearEndClosing {
  id: string;
  company_id: string;
  year: number;
  status: 'draft' | 'locked';
  data: YearEndClosingData;
  final_profit: number;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

// Sales Pipeline Types
export interface ProspectInfo {
  name?: string;
  company?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export interface PipelineStage {
  id: string;
  company_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  company_id: string;
  existing_customer_id: string | null;
  prospect_info: ProspectInfo | null;
  title: string;
  stage_id: string;
  expected_value: number | null;
  last_contact_at: string;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_companies: {
        Row: UserCompany;
        Insert: Omit<UserCompany, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserCompany, 'id' | 'created_at' | 'updated_at'>>;
      };
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
      year_end_closings: {
        Row: YearEndClosing;
        Insert: Omit<YearEndClosing, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<YearEndClosing, 'id' | 'created_at' | 'updated_at'>>;
      };
      pipeline_stages: {
        Row: PipelineStage;
        Insert: Omit<PipelineStage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PipelineStage, 'id' | 'created_at' | 'updated_at'>>;
      };
      opportunities: {
        Row: Opportunity;
        Insert: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create client without strict typing to avoid TypeScript issues with Supabase generics
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
