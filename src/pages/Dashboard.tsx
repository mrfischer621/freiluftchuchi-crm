import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Invoice, Customer } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';
import FinancialChart from '../components/FinancialChart';
import { useCompany } from '../context/CompanyContext';

type TimeFilter = 7 | 30 | 90;

interface InvoiceWithCustomer extends Invoice {
  customer?: Customer;
}

interface ChartData {
  period: string;
  revenue: number;
  expenses: number;
}

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(30);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [openInvoices, setOpenInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      loadFinancialData();
    }
  }, [timeFilter, selectedCompany]);

  // Early return if no company selected
  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
      </div>
    );
  }

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
      const cutoffDateStr = cutoffDate.toISOString();

      // Load ALL paid invoices for this company (we'll filter client-side)
      const { data: allPaidInvoices } = await supabase
        .from('invoices')
        .select('total, paid_at, issue_date')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'bezahlt');

      // Load ALL expenses for this company (we'll filter client-side)
      const { data: allExpenseTransactions } = await supabase
        .from('transactions')
        .select('amount, date')
        .eq('company_id', selectedCompany.id)
        .eq('type', 'ausgabe');

      // Generate chart data based on timeFilter
      const chartData = generateChartData(
        allPaidInvoices || [],
        allExpenseTransactions || [],
        cutoffDate,
        timeFilter
      );
      setChartData(chartData);

      // Calculate KPIs (use paid_at if available, otherwise issue_date)
      const totalRevenue = allPaidInvoices?.reduce((sum, inv) => {
        const dateToCheck = inv.paid_at || inv.issue_date;
        if (dateToCheck && new Date(dateToCheck) >= new Date(cutoffDateStr)) {
          return sum + (inv.total || 0);
        }
        return sum;
      }, 0) || 0;
      setRevenue(totalRevenue);

      const totalExpenses = allExpenseTransactions?.reduce((sum, t) => {
        if (t.date && new Date(t.date) >= new Date(cutoffDateStr)) {
          return sum + (t.amount || 0);
        }
        return sum;
      }, 0) || 0;
      setExpenses(totalExpenses);

      // Load open invoices (status = 'versendet') for this company
      const { data: openInvoicesData } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'versendet')
        .order('due_date', { ascending: true });

      setOpenInvoices(openInvoicesData as InvoiceWithCustomer[] || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (
    invoices: any[],
    transactions: any[],
    cutoffDate: Date,
    days: number
  ): ChartData[] => {
    // Determine granularity based on time filter
    if (days === 7) {
      // Daily data for 7 days
      return generateDailyData(invoices, transactions, cutoffDate, 7);
    } else if (days === 30) {
      // Daily data for 30 days
      return generateDailyData(invoices, transactions, cutoffDate, 30);
    } else {
      // Weekly data for 90 days
      return generateWeeklyData(invoices, transactions, cutoffDate, 90);
    }
  };

  const generateDailyData = (
    invoices: any[],
    transactions: any[],
    cutoffDate: Date,
    days: number
  ): ChartData[] => {
    const dailyMap = new Map<string, { revenue: number; expenses: number }>();

    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyMap.set(key, { revenue: 0, expenses: 0 });
    }

    // Aggregate invoices by day
    invoices.forEach((inv) => {
      const dateToCheck = inv.paid_at || inv.issue_date;
      if (dateToCheck && new Date(dateToCheck) >= cutoffDate) {
        const key = dateToCheck.split('T')[0];
        if (dailyMap.has(key)) {
          const existing = dailyMap.get(key)!;
          dailyMap.set(key, { ...existing, revenue: existing.revenue + (inv.total || 0) });
        }
      }
    });

    // Aggregate transactions by day
    transactions.forEach((trans) => {
      if (trans.date && new Date(trans.date) >= cutoffDate) {
        const key = trans.date.split('T')[0];
        if (dailyMap.has(key)) {
          const existing = dailyMap.get(key)!;
          dailyMap.set(key, { ...existing, expenses: existing.expenses + (trans.amount || 0) });
        }
      }
    });

    // Convert to array
    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, values]) => {
        const date = new Date(key);
        return {
          period: date.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' }),
          revenue: values.revenue,
          expenses: values.expenses,
        };
      });
  };

  const generateWeeklyData = (
    invoices: any[],
    transactions: any[],
    cutoffDate: Date,
    days: number
  ): ChartData[] => {
    const weeklyMap = new Map<string, { revenue: number; expenses: number }>();

    // Initialize weeks (approximately 13 weeks for 90 days)
    const weeks = Math.ceil(days / 7);
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const key = `week-${weekStart.getTime()}`;
      weeklyMap.set(key, { revenue: 0, expenses: 0 });
    }

    // Helper function to get week key
    const getWeekKey = (dateStr: string): string | null => {
      const date = new Date(dateStr);
      if (date < cutoffDate) return null;

      const daysSinceStart = Math.floor((date.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysSinceStart / 7);
      const weekStart = new Date(cutoffDate);
      weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
      return `week-${weekStart.getTime()}`;
    };

    // Aggregate invoices by week
    invoices.forEach((inv) => {
      const dateToCheck = inv.paid_at || inv.issue_date;
      if (dateToCheck) {
        const key = getWeekKey(dateToCheck);
        if (key && weeklyMap.has(key)) {
          const existing = weeklyMap.get(key)!;
          weeklyMap.set(key, { ...existing, revenue: existing.revenue + (inv.total || 0) });
        }
      }
    });

    // Aggregate transactions by week
    transactions.forEach((trans) => {
      if (trans.date) {
        const key = getWeekKey(trans.date);
        if (key && weeklyMap.has(key)) {
          const existing = weeklyMap.get(key)!;
          weeklyMap.set(key, { ...existing, expenses: existing.expenses + (trans.amount || 0) });
        }
      }
    });

    // Convert to array
    return Array.from(weeklyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, values]) => {
        const timestamp = parseInt(key.replace('week-', ''));
        const date = new Date(timestamp);
        return {
          period: `KW ${date.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' })}`,
          revenue: values.revenue,
          expenses: values.expenses,
        };
      });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const profit = revenue - expenses;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Time Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setTimeFilter(7)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeFilter === 7
                ? 'bg-freiluft text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Tage
          </button>
          <button
            onClick={() => setTimeFilter(30)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeFilter === 30
                ? 'bg-freiluft text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Tage
          </button>
          <button
            onClick={() => setTimeFilter(90)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeFilter === 90
                ? 'bg-freiluft text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 Tage
          </button>
        </div>
      </div>

      {/* KPI Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Einnahmen</h3>
          <p className="text-3xl font-bold text-green-600">
            {loading ? '...' : formatCurrency(revenue)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Ausgaben</h3>
          <p className="text-3xl font-bold text-red-600">
            {loading ? '...' : formatCurrency(expenses)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Profit</h3>
          <p className={`text-3xl font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {loading ? '...' : formatCurrency(profit)}
          </p>
        </div>
      </div>

      {/* Financial Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Einnahmen vs. Ausgaben (Letzte {timeFilter} Tage)
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-gray-500">Laden...</p>
          </div>
        ) : (
          <FinancialChart data={chartData} height={300} />
        )}
      </div>

      {/* Open Invoices */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Offene Rechnungen</h2>

        {loading ? (
          <p className="text-gray-500">Laden...</p>
        ) : openInvoices.length === 0 ? (
          <p className="text-gray-500">Keine offenen Rechnungen</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Rechnungsnummer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Kunde</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Betrag</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Fälligkeitsdatum</th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.map((invoice) => {
                  const overdue = isOverdue(invoice.due_date);
                  return (
                    <tr
                      key={invoice.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        overdue ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {overdue && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={overdue ? 'font-semibold text-red-900' : ''}>
                            {invoice.invoice_number}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {invoice.customer?.name || 'Unbekannt'}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className={`py-3 px-4 ${overdue ? 'font-semibold text-red-600' : ''}`}>
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString('de-CH')
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
