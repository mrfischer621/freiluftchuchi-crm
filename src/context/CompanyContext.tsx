import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Company } from '../lib/supabase';
import { useAuth } from './AuthProvider';

interface CompanyContextType {
  selectedCompany: Company | null;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCompany = async () => {
      // Wait for auth to finish loading
      if (loading) {
        setIsLoading(true);
        return;
      }

      // If no user or profile, clear company and stop loading
      if (!user || !profile) {
        setSelectedCompany(null);
        setIsLoading(false);
        return;
      }

      // If profile exists but has no company_id, stop loading
      if (!profile.company_id) {
        setSelectedCompany(null);
        setIsLoading(false);
        return;
      }

      // Fetch company details using the company_id from profile
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (error) {
          console.error('Error loading company:', error);
          setSelectedCompany(null);
        } else {
          setSelectedCompany(data);
        }
      } catch (error) {
        console.error('Unexpected error loading company:', error);
        setSelectedCompany(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompany();
  }, [user, profile, loading]);

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
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
