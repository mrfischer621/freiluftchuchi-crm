import { Pencil, Trash2 } from 'lucide-react';
import type { TimeEntry, Project } from '../lib/supabase';

type TimeEntryTableProps = {
  entries: TimeEntry[];
  projects: Project[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => Promise<void>;
};

export default function TimeEntryTable({ entries, projects, onEdit, onDelete }: TimeEntryTableProps) {
  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unbekannt';
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (window.confirm(`Möchten Sie den Zeiteintrag für "${projectName}" wirklich löschen?`)) {
      await onDelete(id);
    }
  };

  const calculateTotals = () => {
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalAmount = entries.reduce((sum, entry) => sum + (entry.hours * entry.rate), 0);
    return { totalHours, totalAmount };
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Keine Zeiteinträge vorhanden. Erstellen Sie den ersten Eintrag.</p>
      </div>
    );
  }

  const { totalHours, totalAmount } = calculateTotals();

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projekt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beschreibung
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stunden
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Satz
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Betrag
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => {
              const amount = entry.hours * entry.rate;
              return (
                <tr key={entry.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {getProjectName(entry.project_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString('de-CH')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {entry.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {entry.hours.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-600">
                      CHF {entry.rate.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      CHF {amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        entry.invoiced
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.invoiced ? 'Verrechnet' : 'Offen'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(entry)}
                        className="p-2 text-freiluft hover:bg-teal-50 rounded-lg transition"
                        title="Bearbeiten"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id, getProjectName(entry.project_id))}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td colSpan={3} className="px-6 py-4">
                <div className="text-sm font-bold text-freiluft uppercase">
                  Total
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="text-sm font-bold text-freiluft">
                  {totalHours.toFixed(2)} h
                </div>
              </td>
              <td className="px-6 py-4"></td>
              <td className="px-6 py-4 text-right">
                <div className="text-sm font-bold text-freiluft">
                  CHF {totalAmount.toFixed(2)}
                </div>
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
