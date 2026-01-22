import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Company } from '../lib/supabase';

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_company_id';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);

      // DEBUG: Check authentication status BEFORE fetching
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log('🔐 Auth Session Check:');
      console.log('  - Session exists:', !!session);
      console.log('  - User ID:', session?.user?.id || 'NO USER LOGGED IN');
      console.log('  - User Email:', session?.user?.email || 'N/A');
      console.log('  - Auth Error:', authError);

      // NOTE: Proceeding without session check (RLS is disabled for development)
      if (!session) {
        console.warn('⚠️ NO ACTIVE SESSION - Proceeding anyway (RLS disabled)');
      }

      // Fetch all companies from Supabase
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading companies:', error);
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      console.log('✅ Companies fetched successfully:', data?.length || 0, 'companies');
      setCompanies(data || []);

      // AUTO-SELECT: Restore selected company from localStorage or default to first
      if (data && data.length > 0) {
        // Step 1: Check LocalStorage for saved company ID
        const savedCompanyId = localStorage.getItem(STORAGE_KEY);
        console.log('📦 Saved company ID from localStorage:', savedCompanyId);

        // Step 2: Find match in fetched data
        let companyToSelect: Company | null = null;
        if (savedCompanyId) {
          companyToSelect = data.find(c => c.id === savedCompanyId) || null;
          if (companyToSelect) {
            console.log('✅ Found saved company:', companyToSelect.name);
          } else {
            console.log('⚠️ Saved company ID not found in data, falling back to first company');
          }
        }

        // Step 3: Fallback to first company if no match
        if (!companyToSelect) {
          companyToSelect = data[0];
          console.log('✅ Auto-selecting first company:', companyToSelect.name);
        }

        // Step 4: Set state
        setSelectedCompanyState(companyToSelect);
        console.log('✅ Selected company set:', companyToSelect.name, '(ID:', companyToSelect.id + ')');
      } else {
        console.warn('⚠️ No companies found in database. selectedCompany will remain null.');
      }
    } catch (error) {
      console.error('❌ Error loading companies (catch block):', error);
      console.log('Full error details:', JSON.stringify(error, null, 2));
      setCompanies([]);
    } finally {
      setIsLoading(false);
      console.log('🏁 Loading completed. isLoading set to false');
    }
  };

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem(STORAGE_KEY, company.id);
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany,
        isLoading,
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
