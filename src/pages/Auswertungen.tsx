import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics, getPresetRange, type DateRange } from '../hooks/useAnalytics';

// Format CHF currency
const formatCHF = (value: number) => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Color palette
const COLORS = {
  income: '#10b981', // green
  expense: '#ef4444', // red
  profit: '#3b82f6', // blue
  primary: '#14b8a6', // teal (freiluft)
};

const PIE_COLORS = ['#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

export default function Auswertungen() {
  // Default to current month
  const [selectedPreset, setSelectedPreset] = useState<string>('current_month');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Determine active date range - memoized to prevent infinite loop
  const dateRange = useMemo(() => {
    return customRange || getPresetRange(selectedPreset);
  }, [customRange, selectedPreset]);

  // Fetch analytics data
  const { loading, error, kpi, timeline, byCustomer, byCategory, byTags } = useAnalytics(dateRange);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setCustomRange(null);
    setShowCustomPicker(false);
  };

  const handleCustomRange = () => {
    setShowCustomPicker(true);
    setSelectedPreset('custom');
  };

  const applyCustomRange = (from: string, to: string) => {
    setCustomRange({
      from: new Date(from),
      to: new Date(to),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Auswertungen</h1>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={() => handlePresetChange('current_month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPreset === 'current_month'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aktueller Monat
            </button>
            <button
              onClick={() => handlePresetChange('last_month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPreset === 'last_month'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Letzter Monat
            </button>
            <button
              onClick={() => handlePresetChange('current_year')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPreset === 'current_year'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dieses Jahr
            </button>
            <button
              onClick={() => handlePresetChange('last_year')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPreset === 'last_year'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Letztes Jahr
            </button>
            <button
              onClick={() => handlePresetChange('last_30_days')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPreset === 'last_30_days'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Letzte 30 Tage
            </button>
            <button
              onClick={() => handlePresetChange('last_90_days')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPreset === 'last_90_days'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Letzte 90 Tage
            </button>
            <button
              onClick={handleCustomRange}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedPreset === 'custom'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Benutzerdefiniert
            </button>
          </div>

          {/* Custom Date Picker */}
          {showCustomPicker && (
            <div className="mt-4 flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Von:</label>
                <input
                  type="date"
                  onChange={(e) => {
                    if (customRange) {
                      applyCustomRange(e.target.value, customRange.to.toISOString().split('T')[0]);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Bis:</label>
                <input
                  type="date"
                  onChange={(e) => {
                    if (customRange) {
                      applyCustomRange(customRange.from.toISOString().split('T')[0], e.target.value);
                    } else {
                      const today = new Date().toISOString().split('T')[0];
                      applyCustomRange(today, e.target.value);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Income */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Gesamteinnahmen</div>
          <div className="text-3xl font-bold text-green-600">{formatCHF(kpi.income)}</div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Gesamtausgaben</div>
          <div className="text-3xl font-bold text-red-600">{formatCHF(kpi.expense)}</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Nettogewinn</div>
          <div
            className={`text-3xl font-bold ${
              kpi.profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCHF(kpi.profit)}
          </div>
        </div>
      </div>

      {/* Main Timeline Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Zeitverlauf</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatCHF(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number | undefined) => value !== undefined ? formatCHF(value) : ''}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              name="Einnahmen"
              stroke={COLORS.income}
              strokeWidth={2}
              dot={{ fill: COLORS.income }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Ausgaben"
              stroke={COLORS.expense}
              strokeWidth={2}
              dot={{ fill: COLORS.expense }}
            />
            <Line
              type="monotone"
              dataKey="monthlyProfit"
              name="Perioden-Gewinn"
              stroke={COLORS.profit}
              strokeWidth={2}
              dot={{ fill: COLORS.profit }}
            />
            <Line
              type="monotone"
              dataKey="cumulativeProfit"
              name="Kumulativer Gewinn"
              stroke={COLORS.primary}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: COLORS.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Customer */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Pro Kunde</h2>
          {byCustomer.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCustomer.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCHF(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? formatCHF(value) : ''}
                />
                <Bar dataKey="amount" fill={COLORS.primary}>
                  {byCustomer.slice(0, 10).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === 'einnahme' ? COLORS.income : COLORS.expense}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">Keine Daten verfügbar</div>
          )}
        </div>

        {/* By Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Nach Konto (Kategorie)</h2>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byCategory.slice(0, 8)}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.category}: ${formatCHF(entry.amount)}`}
                  labelLine={false}
                >
                  {byCategory.slice(0, 8).map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? formatCHF(value) : ''}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">Keine Daten verfügbar</div>
          )}
        </div>

        {/* By Tags */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Nach Tags</h2>
          {byTags.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byTags.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => formatCHF(value)}
                />
                <YAxis
                  type="category"
                  dataKey="tag"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) => value !== undefined ? formatCHF(value) : ''}
                />
                <Bar dataKey="amount" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">Keine Tags vorhanden</div>
          )}
        </div>
      </div>
    </div>
  );
}
