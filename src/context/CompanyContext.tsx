import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Company } from '../lib/supabase';
import { useAuth } from './AuthProvider';

interface CompanyContextType {
  companies: Company[]; // ALL companies user has access to
  selectedCompany: Company | null; // Currently active company
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>; // Reload companies list
  isLoading: boolean;
  error: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all companies user has access to
  const fetchUserCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call get_user_companies RPC function
      // This now returns full company data, bypassing RLS restrictions
      const { data, error: rpcError } = await supabase.rpc('get_user_companies');

      if (rpcError) {
        console.error('Error fetching user companies:', rpcError);
        setError('Fehler beim Laden der Firmen');
        setCompanies([]);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('No companies found for user');
        setCompanies([]);
        setError('Keine Firmen gefunden. Bitte kontaktieren Sie Ihren Administrator.');
        return;
      }

      // Transform RPC data to Company objects
      // The RPC now returns full company data, so no separate SELECT needed!
      const companiesData: Company[] = data.map((row: any) => ({
        id: row.company_id,
        name: row.company_name,
        logo_url: row.logo_url,
        street: row.street,
        house_number: row.house_number,
        zip_code: row.zip_code,
        city: row.city,
        iban: row.iban,
        qr_iban: row.qr_iban,
        bank_name: row.bank_name,
        uid_number: row.uid_number,
        vat_number: row.vat_number,
        vat_registered: row.vat_registered,
        created_at: row.created_at,
      }));

      setCompanies(companiesData);

      // Determine which company should be selected
      await selectInitialCompany(companiesData, data);
    } catch (err) {
      console.error('Unexpected error fetching companies:', err);
      setError('Unerwarteter Fehler beim Laden der Firmen');
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Select initial company based on last_active or first available
  const selectInitialCompany = async (
    availableCompanies: Company[],
    userCompanies: { company_id: string; is_active: boolean }[]
  ) => {
    if (availableCompanies.length === 0) {
      setSelectedCompany(null);
      return;
    }

    // Try to find the currently active company from RPC result
    const activeCompany = userCompanies.find((uc) => uc.is_active);
    if (activeCompany) {
      const company = availableCompanies.find((c) => c.id === activeCompany.company_id);
      if (company) {
        setSelectedCompany(company);
        return;
      }
    }

    // Fallback: Use last_active_company_id from profile
    if (profile?.last_active_company_id) {
      const lastActiveCompany = availableCompanies.find(
        (c) => c.id === profile.last_active_company_id
      );
      if (lastActiveCompany) {
        // Set as active in session
        await setActiveCompanySession(lastActiveCompany.id);
        setSelectedCompany(lastActiveCompany);
        return;
      }
    }

    // Final fallback: Use first available company
    const firstCompany = availableCompanies[0];
    await setActiveCompanySession(firstCompany.id);
    setSelectedCompany(firstCompany);
  };

  // Set active company in session (calls set_active_company RPC)
  const setActiveCompanySession = async (companyId: string) => {
    try {
      const { error } = await supabase.rpc('set_active_company', { company_id: companyId });
      if (error) {
        console.error('Error setting active company:', error);
      }
    } catch (err) {
      console.error('Unexpected error setting active company:', err);
    }
  };

  // Refresh companies list (useful after creating a new company)
  const refreshCompanies = async () => {
    if (!user) return;
    await fetchUserCompanies();
  };

  // Switch to a different company
  const switchCompany = async (companyId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to find company in local list first
      let targetCompany = companies.find((c) => c.id === companyId);

      // If company not found in local list, try fetching it directly from DB
      if (!targetCompany) {

        const { data: companyData, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (fetchError || !companyData) {
          console.error('Error fetching company:', fetchError);
          throw new Error('Company not found or access denied');
        }

        targetCompany = companyData as Company;

        // Also refresh the companies list in background
        if (user) {
          fetchUserCompanies().catch(console.error);
        }
      }

      // Call set_active_company RPC (validates access + updates session + updates last_active)
      const { error: rpcError } = await supabase.rpc('set_active_company', { company_id: companyId });

      if (rpcError) {
        console.error('Error switching company:', rpcError);
        setError('Fehler beim Wechseln der Firma');
        return;
      }

      // Update local state
      setSelectedCompany(targetCompany);

      // Reload page to refresh all data with new company context
      // This ensures all subscriptions and queries are reset
      window.location.reload();
    } catch (err) {
      console.error('Unexpected error switching company:', err);
      setError('Unerwarteter Fehler beim Wechseln der Firma');
      setIsLoading(false);
    }
  };

  // Load companies when user/profile changes
  useEffect(() => {
    const loadCompanies = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        setIsLoading(true);
        return;
      }

      // If no user or profile, clear state
      if (!user || !profile) {
        setCompanies([]);
        setSelectedCompany(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Fetch user's companies
      await fetchUserCompanies();
    };

    loadCompanies();
  }, [user, profile, authLoading]);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        switchCompany,
        refreshCompanies,
        isLoading,
        error,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
