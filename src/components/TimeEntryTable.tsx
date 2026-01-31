import { Pencil, Trash2 } from 'lucide-react';
import type { TimeEntry, Project } from '../lib/supabase';
import { getWeek, parseISO, format } from 'date-fns';

// Extended TimeEntry with customer name from project
interface TimeEntryWithCustomer extends TimeEntry {
  customerName?: string;
  projectName?: string;
}

type GroupingMode = 'date' | 'week';

type TimeEntryTableProps = {
  entries: TimeEntryWithCustomer[];
  projects: Project[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => Promise<void>;
  groupingMode?: GroupingMode;
  groupedEntries?: Record<string, TimeEntryWithCustomer[]> | null;
};

export default function TimeEntryTable({
  entries,
  projects,
  onEdit,
  onDelete,
  groupingMode = 'date',
  groupedEntries,
}: TimeEntryTableProps) {
  const getProjectName = (projectId: string, entry: TimeEntryWithCustomer) => {
    if (entry.projectName) return entry.projectName;
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unbekannt';
  };

  const getCustomerName = (entry: TimeEntryWithCustomer) => {
    if (entry.customerName) return entry.customerName;
    const project = projects.find((p) => p.id === entry.project_id) as any;
    return project?.customers?.name || '-';
  };

  const getWeekNumber = (dateStr: string) => {
    const date = parseISO(dateStr);
    return getWeek(date, { weekStartsOn: 1 });
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (window.confirm(`Möchten Sie den Zeiteintrag für "${projectName}" wirklich löschen?`)) {
      await onDelete(id);
    }
  };

  const calculateTotals = (entriesToSum: TimeEntryWithCustomer[] = entries) => {
    const totalHours = entriesToSum.reduce((sum, entry) => sum + entry.hours, 0);
    const totalAmount = entriesToSum.reduce((sum, entry) => sum + (entry.hours * entry.rate), 0);
    const billableHours = entriesToSum.filter(e => e.billable).reduce((sum, entry) => sum + entry.hours, 0);
    return { totalHours, totalAmount, billableHours };
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Keine Zeiteinträge vorhanden. Erstellen Sie den ersten Eintrag.</p>
      </div>
    );
  }

  const { totalHours, totalAmount, billableHours } = calculateTotals();

  const renderTableRow = (entry: TimeEntryWithCustomer) => {
    const amount = entry.hours * entry.rate;
    const projectName = getProjectName(entry.project_id, entry);

    return (
      <tr key={entry.id} className="hover:bg-gray-50 transition">
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-600">
            {format(parseISO(entry.date), 'dd.MM.yyyy')}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-500">
            KW {getWeekNumber(entry.date)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-600">
            {getCustomerName(entry)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {projectName}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-600 max-w-xs truncate">
            {entry.description || '-'}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="text-sm text-gray-900">
            {entry.hours.toFixed(2)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="text-sm text-gray-600">
            CHF {entry.rate.toFixed(0)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="text-sm font-medium text-gray-900">
            CHF {amount.toFixed(2)}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              entry.billable
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {entry.billable ? 'Ja' : 'Nein'}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              entry.invoiced
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {entry.invoiced ? 'Verrechnet' : 'Offen'}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="flex justify-end gap-1">
            <button
              onClick={() => onEdit(entry)}
              className="p-1.5 text-freiluft hover:bg-teal-50 rounded transition"
              title="Bearbeiten"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDelete(entry.id, projectName)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
              title="Löschen"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderGroupHeader = (weekKey: string, weekEntries: TimeEntryWithCustomer[]) => {
    const { totalHours: weekHours, totalAmount: weekAmount, billableHours: weekBillable } = calculateTotals(weekEntries);
    const [year, kw] = weekKey.split('-');

    return (
      <tr key={`header-${weekKey}`} className="bg-gray-100 border-t-2 border-gray-300">
        <td colSpan={5} className="px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">{kw} / {year}</span>
            <span className="text-sm text-gray-500">
              {weekEntries.length} {weekEntries.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          </div>
        </td>
        <td className="px-4 py-2 text-right">
          <span className="font-semibold text-gray-900">{weekHours.toFixed(2)} h</span>
        </td>
        <td className="px-4 py-2"></td>
        <td className="px-4 py-2 text-right">
          <span className="font-semibold text-gray-900">CHF {weekAmount.toFixed(2)}</span>
        </td>
        <td className="px-4 py-2 text-center">
          <span className="text-xs text-gray-500">{weekBillable.toFixed(1)}h verr.</span>
        </td>
        <td colSpan={2}></td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                KW
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kunde
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projekt
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beschreibung
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stunden
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Satz
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Betrag
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verr.
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groupingMode === 'week' && groupedEntries ? (
              // Grouped by week
              Object.entries(groupedEntries).map(([weekKey, weekEntries]) => (
                <>
                  {renderGroupHeader(weekKey, weekEntries)}
                  {weekEntries.map(entry => renderTableRow(entry))}
                </>
              ))
            ) : (
              // Flat list by date
              entries.map(entry => renderTableRow(entry))
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td colSpan={5} className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-freiluft uppercase">Total</span>
                  <span className="text-xs text-gray-500">
                    davon {billableHours.toFixed(1)}h verrechenbar
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="text-sm font-bold text-freiluft">
                  {totalHours.toFixed(2)} h
                </div>
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right">
                <div className="text-sm font-bold text-freiluft">
                  CHF {totalAmount.toFixed(2)}
                </div>
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
