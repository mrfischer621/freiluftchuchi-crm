import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Invoice, Customer } from '../lib/supabase';
import { AlertCircle, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import FinancialChart from '../components/FinancialChart';
import { useCompany } from '../context/CompanyContext';
import { PageHeader, Card, KPICard, Button } from '../components/ui';

type TimeFilter = 7 | 30 | 90;
type ViewMode = 'days' | 'year';

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
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(30);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [openInvoices, setOpenInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate year options (last 3 years + current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  useEffect(() => {
    if (selectedCompany) {
      loadFinancialData();
    }
  }, [viewMode, timeFilter, selectedYear, selectedCompany]);

  // Early return if no company selected
  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Firma wird geladen...</p>
      </div>
    );
  }

  const loadFinancialData = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);

      // Clear existing data to force React re-render
      setRevenue(0);
      setExpenses(0);
      setOpenInvoices([]);
      setChartData([]);

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

      if (viewMode === 'year') {
        // Year view: filter by selected year
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

        // Generate monthly chart data
        const chartData = generateMonthlyData(
          allPaidInvoices || [],
          allExpenseTransactions || [],
          selectedYear
        );
        setChartData(chartData);

        // Calculate KPIs for the year
        const totalRevenue = allPaidInvoices?.reduce((sum, inv) => {
          const dateToCheck = inv.paid_at || inv.issue_date;
          if (dateToCheck) {
            const date = new Date(dateToCheck);
            if (date >= yearStart && date <= yearEnd) {
              return sum + (inv.total || 0);
            }
          }
          return sum;
        }, 0) || 0;
        setRevenue(totalRevenue);

        const totalExpenses = allExpenseTransactions?.reduce((sum, t) => {
          if (t.date) {
            const date = new Date(t.date);
            if (date >= yearStart && date <= yearEnd) {
              return sum + (t.amount || 0);
            }
          }
          return sum;
        }, 0) || 0;
        setExpenses(totalExpenses);
      } else {
        // Days view: filter by timeFilter days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
        const cutoffDateStr = cutoffDate.toISOString();

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
      }

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

  const generateMonthlyData = (
    invoices: any[],
    transactions: any[],
    year: number
  ): ChartData[] => {
    const monthlyMap = new Map<number, { revenue: number; expenses: number }>();

    // Initialize all 12 months
    for (let month = 0; month < 12; month++) {
      monthlyMap.set(month, { revenue: 0, expenses: 0 });
    }

    // Aggregate invoices by month
    invoices.forEach((inv) => {
      const dateToCheck = inv.paid_at || inv.issue_date;
      if (dateToCheck) {
        const date = new Date(dateToCheck);
        if (date.getFullYear() === year) {
          const month = date.getMonth();
          const existing = monthlyMap.get(month)!;
          monthlyMap.set(month, { ...existing, revenue: existing.revenue + (inv.total || 0) });
        }
      }
    });

    // Aggregate transactions by month
    transactions.forEach((trans) => {
      if (trans.date) {
        const date = new Date(trans.date);
        if (date.getFullYear() === year) {
          const month = date.getMonth();
          const existing = monthlyMap.get(month)!;
          monthlyMap.set(month, { ...existing, expenses: existing.expenses + (trans.amount || 0) });
        }
      }
    });

    // Month names in German
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    // Convert to array
    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, values]) => ({
        period: monthNames[month],
        revenue: values.revenue,
        expenses: values.expenses,
      }));
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

  // Time filter options
  const timeFilters: { value: TimeFilter; label: string }[] = [
    { value: 7, label: '7 Tage' },
    { value: 30, label: '30 Tage' },
    { value: 90, label: '90 Tage' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Time Filter */}
      <PageHeader
        title="Dashboard"
        description={viewMode === 'year' ? `Finanzübersicht ${selectedYear}` : `Finanzübersicht der letzten ${timeFilter} Tage`}
        actions={
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('days')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'days'
                    ? 'bg-brand text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tage
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'year'
                    ? 'bg-brand text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Jahr
              </button>
            </div>

            {/* Year Dropdown (only shown in year mode) */}
            {viewMode === 'year' && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time Filter (only shown in days mode) */}
            {viewMode === 'days' && (
              <div className="flex gap-2">
                {timeFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={timeFilter === filter.value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTimeFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* KPI Cards - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Einnahmen"
          value={loading ? '...' : formatCurrency(revenue)}
          trend="up"
          icon={<TrendingUp size={20} />}
          loading={loading}
        />

        <KPICard
          label="Ausgaben"
          value={loading ? '...' : formatCurrency(expenses)}
          trend="down"
          icon={<TrendingDown size={20} />}
          loading={loading}
        />

        <KPICard
          label="Profit"
          value={loading ? '...' : formatCurrency(profit)}
          trend={profit >= 0 ? 'up' : 'down'}
          icon={<Wallet size={20} />}
          loading={loading}
        />
      </div>

      {/* Financial Chart */}
      <Card padding="md" hover>
        <Card.Header
          title="Einnahmen vs. Ausgaben"
          subtitle={viewMode === 'year' ? `Jahr ${selectedYear}` : `Letzte ${timeFilter} Tage`}
        />
        <Card.Content>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-text-secondary">Laden...</p>
            </div>
          ) : (
            <FinancialChart data={chartData} height={300} />
          )}
        </Card.Content>
      </Card>

      {/* Open Invoices Table */}
      <Card padding="md">
        <Card.Header
          title="Offene Rechnungen"
          subtitle={openInvoices.length > 0 ? `${openInvoices.length} ausstehend` : undefined}
        />
        <Card.Content>
          {loading ? (
            <p className="text-text-secondary">Laden...</p>
          ) : openInvoices.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-text-secondary">Keine offenen Rechnungen</p>
            </div>
          ) : (
            <div className="table-container -mx-6">
              <table className="table">
                <thead>
                  <tr>
                    <th className="pl-6">Rechnungsnummer</th>
                    <th>Kunde</th>
                    <th>Betrag</th>
                    <th className="pr-6">Fälligkeitsdatum</th>
                  </tr>
                </thead>
                <tbody>
                  {openInvoices.map((invoice) => {
                    const overdue = isOverdue(invoice.due_date);
                    return (
                      <tr
                        key={invoice.id}
                        className={overdue ? 'bg-danger-light/50' : ''}
                      >
                        <td className="pl-6">
                          <div className="flex items-center gap-2">
                            {overdue && (
                              <AlertCircle className="w-4 h-4 text-danger" />
                            )}
                            <span className={overdue ? 'font-semibold text-danger-dark' : ''}>
                              {invoice.invoice_number}
                            </span>
                          </div>
                        </td>
                        <td>
                          {invoice.customer?.name || 'Unbekannt'}
                        </td>
                        <td className="font-medium">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className={`pr-6 ${overdue ? 'font-semibold text-danger' : ''}`}>
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
        </Card.Content>
      </Card>
    </div>
  );
}
