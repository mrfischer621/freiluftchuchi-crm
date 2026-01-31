import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry, Project, Customer } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { Clock, FileText, TrendingUp, DollarSign, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface TimeReportingProps {
  entries: TimeEntry[];
  projects: Project[];
}

export default function TimeReporting({ entries, projects }: TimeReportingProps) {
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [dateFrom, setDateFrom] = useState(() => {
    const date = startOfMonth(new Date());
    return format(date, 'yyyy-MM-dd');
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = endOfMonth(new Date());
    return format(date, 'yyyy-MM-dd');
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!selectedCompany) return;

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('name');

        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [selectedCompany]);

  // Filter entries based on selected filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Date filter
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;

      // Project filter
      if (selectedProjectId && entry.project_id !== selectedProjectId) return false;

      // Customer filter (via project)
      if (selectedCustomerId) {
        const project = projects.find(p => p.id === entry.project_id);
        if (project?.customer_id !== selectedCustomerId) return false;
      }

      return true;
    });
  }, [entries, dateFrom, dateTo, selectedProjectId, selectedCustomerId, projects]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalEntries = filteredEntries.length;
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = filteredEntries.filter(e => e.billable).reduce((sum, e) => sum + e.hours, 0);
    const nonBillableHours = totalHours - billableHours;
    const billablePercent = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    // Calculate total revenue from billable entries
    const totalRevenue = filteredEntries
      .filter(e => e.billable)
      .reduce((sum, e) => sum + (e.hours * e.rate), 0);

    // Effective hourly rate (revenue per billable hour)
    const effectiveRate = billableHours > 0 ? totalRevenue / billableHours : 0;

    // Average rate
    const avgRate = totalHours > 0
      ? filteredEntries.reduce((sum, e) => sum + (e.hours * e.rate), 0) / totalHours
      : 0;

    return {
      totalEntries,
      totalHours,
      billableHours,
      nonBillableHours,
      billablePercent,
      totalRevenue,
      effectiveRate,
      avgRate,
    };
  }, [filteredEntries]);

  // Chart data
  const chartData = [
    { category: 'Verrechenbar', hours: kpis.billableHours, color: '#16a34a' },
    { category: 'Nicht verrechenbar', hours: kpis.nonBillableHours, color: '#dc2626' },
  ];

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const breakdown: Record<string, { name: string; hours: number; revenue: number }> = {};

    filteredEntries.forEach(entry => {
      const project = projects.find(p => p.id === entry.project_id);
      const projectName = project?.name || 'Unbekannt';

      if (!breakdown[entry.project_id]) {
        breakdown[entry.project_id] = { name: projectName, hours: 0, revenue: 0 };
      }

      breakdown[entry.project_id].hours += entry.hours;
      if (entry.billable) {
        breakdown[entry.project_id].revenue += entry.hours * entry.rate;
      }
    });

    return Object.values(breakdown).sort((a, b) => b.hours - a.hours);
  }, [filteredEntries, projects]);

  // Quick date filters
  const setQuickDateRange = (days: number | 'month' | 'year') => {
    const today = new Date();
    if (days === 'month') {
      setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
    } else if (days === 'year') {
      setDateFrom(format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'));
      setDateTo(format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd'));
    } else {
      setDateFrom(format(subDays(today, days), 'yyyy-MM-dd'));
      setDateTo(format(today, 'yyyy-MM-dd'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Lädt Reporting-Daten...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-500" />
          <h3 className="font-medium text-gray-900">Filter</h3>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Quick Date Buttons */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Schnellauswahl</label>
            <div className="flex gap-1">
              <button
                onClick={() => setQuickDateRange(7)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                7 Tage
              </button>
              <button
                onClick={() => setQuickDateRange(30)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                30 Tage
              </button>
              <button
                onClick={() => setQuickDateRange('month')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                Monat
              </button>
              <button
                onClick={() => setQuickDateRange('year')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                Jahr
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-freiluft focus:ring-1 focus:ring-freiluft/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-freiluft focus:ring-1 focus:ring-freiluft/20 outline-none"
            />
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kunde</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-freiluft focus:ring-1 focus:ring-freiluft/20 outline-none min-w-[140px]"
            >
              <option value="">Alle Kunden</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Projekt</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-freiluft focus:ring-1 focus:ring-freiluft/20 outline-none min-w-[140px]"
            >
              <option value="">Alle Projekte</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setSelectedProjectId('');
              setSelectedCustomerId('');
              setQuickDateRange('month');
            }}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Leistungen</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.totalEntries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Stunden</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpis.billablePercent >= 70 ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <TrendingUp size={20} className={kpis.billablePercent >= 70 ? 'text-green-600' : 'text-yellow-600'} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Verrechenbar</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.billablePercent.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Eff. Stundensatz</p>
              <p className="text-2xl font-bold text-gray-900">CHF {kpis.effectiveRate.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Gesamtumsatz (verrechenbare Stunden)</p>
            <p className="text-3xl font-bold text-freiluft">CHF {kpis.totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Verrechenbare Stunden</p>
            <p className="text-xl font-semibold text-gray-900">{kpis.billableHours.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Billable vs Non-Billable */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4">Stunden nach Verrechenbarkeit</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v}h`} />
                <YAxis type="category" dataKey="category" width={120} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} Stunden`, '']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4">Stunden nach Projekt</h3>
          {projectBreakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Daten für den gewählten Zeitraum</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {projectBreakdown.map((project, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="h-2 bg-freiluft rounded-full"
                        style={{ width: `${(project.hours / kpis.totalHours) * 100}%`, minWidth: '4px' }}
                      />
                      <span className="text-xs text-gray-500">
                        {((project.hours / kpis.totalHours) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-gray-900">{project.hours.toFixed(1)}h</p>
                    <p className="text-xs text-gray-500">CHF {project.revenue.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
