import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface KPI {
  income: number;
  expense: number;
  profit: number;
}

export interface TimelineData {
  date: string;
  income: number;
  expense: number;
  monthlyProfit: number;
  cumulativeProfit: number;
}

export interface CustomerBreakdown {
  name: string;
  amount: number;
  type: 'einnahme' | 'ausgabe';
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  type: 'einnahme' | 'ausgabe';
}

export interface TagBreakdown {
  tag: string;
  amount: number;
}

/**
 * Get a preset date range
 * @param preset - One of: 'current_month', 'last_month', 'current_year', 'last_year', 'last_30_days', 'last_90_days'
 * @returns DateRange object with from and to dates
 */
export function getPresetRange(preset: string): DateRange {
  const from = new Date();
  const to = new Date();

  switch (preset) {
    case 'current_month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_month':
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(from.getFullYear());
      to.setMonth(from.getMonth() + 1);
      to.setDate(0); // Last day of previous month
      to.setHours(23, 59, 59, 999);
      break;

    case 'current_year':
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_year':
      from.setFullYear(from.getFullYear() - 1);
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setFullYear(to.getFullYear() - 1);
      to.setMonth(11);
      to.setDate(31);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_30_days':
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    case 'last_90_days':
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;

    default:
      throw new Error(`Unknown preset: ${preset}`);
  }

  return { from, to };
}

/**
 * Custom hook for analytics data fetching and calculations
 * @param dateRange - Date range to filter transactions
 * @returns Analytics data including KPIs, timeline, and breakdowns
 */
export function useAnalytics(dateRange: DateRange) {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<KPI>({ income: 0, expense: 0, profit: 0 });
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [byCustomer, setByCustomer] = useState<CustomerBreakdown[]>([]);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const [byTags, setByTags] = useState<TagBreakdown[]>([]);

  useEffect(() => {
    if (selectedCompany && dateRange) {
      fetchAndCalculate();
    }
  }, [selectedCompany, dateRange]);

  const fetchAndCalculate = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      setError(null);

      // Format dates for SQL query (YYYY-MM-DD)
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];

      // Fetch both invoices and expenses in parallel
      const [invoicesResult, expensesResult] = await Promise.all([
        // A. Fetch paid invoices with customer data
        supabase
          .from('invoices')
          .select('*, customers(*)')
          .eq('company_id', selectedCompany.id)
          .eq('status', 'bezahlt'),

        // B. Fetch all expenses
        supabase
          .from('expenses')
          .select('*')
          .eq('company_id', selectedCompany.id)
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      // Convert paid invoices to transaction format (Type: 'Einnahme')
      const invoiceTransactions: Transaction[] = (invoicesResult.data || [])
        .map((invoice: any) => {
          // Use paid_at if available, otherwise fall back to issue_date
          const transactionDate = invoice.paid_at || invoice.issue_date;

          return {
            id: `invoice-${invoice.id}`,
            company_id: selectedCompany.id,
            type: 'einnahme' as const,
            date: transactionDate,
            amount: invoice.total,
            description: `Rechnung ${invoice.invoice_number} - ${invoice.customers?.name || 'Unbekannt'}`,
            category: 'Umsatz',
            project_id: invoice.project_id,
            customer_id: invoice.customer_id,
            invoice_id: invoice.id,
            document_url: null,
            receipt_url: null,
            tags: null,
            billable: true,
            transaction_number: invoice.invoice_number,
            created_at: invoice.created_at,
          };
        })
        // Filter by date range after mapping
        .filter((t) => t.date >= fromDate && t.date <= toDate);

      // Convert expenses to transaction format (Type: 'Ausgabe')
      const expenseTransactions: Transaction[] = (expensesResult.data || [])
        .map((expense: any) => ({
          id: `expense-${expense.id}`,
          company_id: selectedCompany.id,
          type: 'ausgabe' as const,
          date: expense.date,
          amount: expense.amount,
          description: expense.description,
          category: expense.category || 'Ohne Kategorie',
          project_id: null,
          customer_id: null,
          invoice_id: null,
          document_url: null,
          receipt_url: null,
          tags: null,
          billable: false,
          transaction_number: null,
          created_at: expense.created_at,
        }))
        // Filter by date range after mapping
        .filter((t) => t.date >= fromDate && t.date <= toDate);

      // Combine and sort all transactions
      const allTransactions = [...invoiceTransactions, ...expenseTransactions];
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // === Calculate KPIs ===
      const income = allTransactions
        .filter((t) => t.type === 'einnahme')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = allTransactions
        .filter((t) => t.type === 'ausgabe')
        .reduce((sum, t) => sum + t.amount, 0);
      const profit = income - expense;

      setKpi({ income, expense, profit });

      // === Calculate Timeline ===
      const daysDiff = Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      );
      const groupByMonth = daysDiff > 31;

      // Group transactions by date (day or month)
      const timelineMap = new Map<string, { income: number; expense: number }>();

      allTransactions.forEach((t) => {
        const date = new Date(t.date);
        let key: string;

        if (groupByMonth) {
          // Format: YYYY-MM
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // Format: YYYY-MM-DD
          key = date.toISOString().split('T')[0];
        }

        if (!timelineMap.has(key)) {
          timelineMap.set(key, { income: 0, expense: 0 });
        }

        const entry = timelineMap.get(key)!;
        if (t.type === 'einnahme') {
          entry.income += t.amount;
        } else {
          entry.expense += t.amount;
        }
      });

      // Convert to array and sort by date
      const timelineArray: TimelineData[] = Array.from(timelineMap.entries())
        .map(([date, { income, expense }]) => ({
          date,
          income,
          expense,
          monthlyProfit: income - expense,
          cumulativeProfit: 0, // Will be calculated below
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate cumulative profit
      let cumulativeSum = 0;
      timelineArray.forEach((item) => {
        cumulativeSum += item.monthlyProfit;
        item.cumulativeProfit = cumulativeSum;
      });

      setTimeline(timelineArray);

      // === Calculate By Customer ===
      // First fetch all customers to map IDs to names
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', selectedCompany.id);

      const customersById = new Map((customersData || []).map((c) => [c.id, c.name]));

      const customerMap = new Map<string, { name: string; income: number; expense: number }>();

      allTransactions.forEach((t) => {
        if (!t.customer_id) return;

        const customerName = customersById.get(t.customer_id) || 'Unbekannt';
        const key = `${t.customer_id}`;

        if (!customerMap.has(key)) {
          customerMap.set(key, { name: customerName, income: 0, expense: 0 });
        }

        const entry = customerMap.get(key)!;
        if (t.type === 'einnahme') {
          entry.income += t.amount;
        } else {
          entry.expense += t.amount;
        }
      });

      // Convert to array, separate by type, and sort by total volume
      const customerArray: CustomerBreakdown[] = Array.from(customerMap.values())
        .flatMap(({ name, income, expense }) => {
          const items: CustomerBreakdown[] = [];
          if (income > 0) items.push({ name, amount: income, type: 'einnahme' });
          if (expense > 0) items.push({ name, amount: expense, type: 'ausgabe' });
          return items;
        })
        .sort((a, b) => b.amount - a.amount);

      setByCustomer(customerArray);

      // === Calculate By Category ===
      const categoryMap = new Map<string, { income: number; expense: number }>();

      allTransactions.forEach((t) => {
        const category = t.category || 'Ohne Kategorie';

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { income: 0, expense: 0 });
        }

        const entry = categoryMap.get(category)!;
        if (t.type === 'einnahme') {
          entry.income += t.amount;
        } else {
          entry.expense += t.amount;
        }
      });

      // Convert to array, separate by type, and sort by amount
      const categoryArray: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .flatMap(([category, { income, expense }]) => {
          const items: CategoryBreakdown[] = [];
          if (income > 0) items.push({ category, amount: income, type: 'einnahme' });
          if (expense > 0) items.push({ category, amount: expense, type: 'ausgabe' });
          return items;
        })
        .sort((a, b) => b.amount - a.amount);

      setByCategory(categoryArray);

      // === Calculate By Tags (unwind arrays) ===
      const tagMap = new Map<string, number>();

      allTransactions.forEach((t) => {
        if (t.tags && Array.isArray(t.tags)) {
          t.tags.forEach((tag) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, 0);
            }
            tagMap.set(tag, tagMap.get(tag)! + t.amount);
          });
        }
      });

      // Convert to array and sort by amount
      const tagArray: TagBreakdown[] = Array.from(tagMap.entries())
        .map(([tag, amount]) => ({ tag, amount }))
        .sort((a, b) => b.amount - a.amount);

      setByTags(tagArray);

    } catch (err) {
      console.error('Error in useAnalytics:', err);
      setError('Fehler beim Laden der Analysedaten');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    kpi,
    timeline,
    byCustomer,
    byCategory,
    byTags,
  };
}
