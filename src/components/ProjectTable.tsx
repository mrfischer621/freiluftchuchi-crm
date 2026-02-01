import { Pencil, Archive, RotateCcw, Clock } from 'lucide-react';
import type { Project, Customer } from '../lib/supabase';

// Extended Project type with open hours
export interface ProjectWithOpenHours extends Project {
  open_hours: number;
}

type ProjectTableProps = {
  projects: ProjectWithOpenHours[];
  customers: Customer[];
  onEdit: (project: Project) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
};

const statusColors = {
  offen: 'bg-gray-100 text-gray-800',
  laufend: 'bg-blue-100 text-blue-800',
  abgeschlossen: 'bg-green-100 text-green-800',
};

const statusLabels = {
  offen: 'Offen',
  laufend: 'Laufend',
  abgeschlossen: 'Abgeschlossen',
};

export default function ProjectTable({ projects, customers, onEdit, onArchive, onRestore }: ProjectTableProps) {
  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || 'Unbekannt';
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Keine Projekte vorhanden. Erstellen Sie das erste Projekt.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projektname
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kunde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beschreibung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Offene Stunden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Budget
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Erstellt am
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktiv
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{project.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{getCustomerName(project.customer_id)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {project.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColors[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {project.open_hours > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <Clock size={12} />
                      {project.open_hours.toFixed(1)}h offen
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {project.budget !== null ? `${project.budget.toFixed(2)} CHF` : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {new Date(project.created_at).toLocaleDateString('de-CH')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.is_active ? 'Aktiv' : 'Archiviert'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(project)}
                      className="p-2 text-freiluft hover:bg-teal-50 rounded-lg transition"
                      title="Bearbeiten"
                    >
                      <Pencil size={18} />
                    </button>
                    {project.is_active ? (
                      <button
                        onClick={() => onArchive(project.id)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Archivieren"
                      >
                        <Archive size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onRestore(project.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Wiederherstellen"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
