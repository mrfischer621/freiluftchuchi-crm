import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry, Project } from '../lib/supabase';
import TimeEntryForm from '../components/TimeEntryForm';
import TimeEntryTable from '../components/TimeEntryTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';
import { Plus } from 'lucide-react';

export default function Zeiterfassung() {
  const { selectedCompany } = useCompany();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  // Early return if no company selected
  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
      </div>
    );
  }

  const fetchData = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoading(true);
      setError(null);

      // Clear existing data to force React re-render
      setEntries([]);
      setProjects([]);

      const [entriesResult, projectsResult] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('date', { ascending: false }),
        supabase
          .from('projects')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('name', { ascending: true }),
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setEntries(entriesResult.data || []);
      setProjects(projectsResult.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Fehler beim Laden der Daten. Bitte überprüfen Sie Ihre Supabase-Konfiguration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (entryData: Omit<TimeEntry, 'id' | 'created_at'>) => {
    if (!selectedCompany) return;

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from('time_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('time_entries')
          .insert([{ ...entryData, company_id: selectedCompany.id }] as any);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingEntry(null);
      await fetchData();
    } catch (err) {
      console.error('Error saving time entry:', err);
      throw err;
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Zeiteintrag wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting time entry:', err);
      alert('Fehler beim Löschen des Zeiteintrags.');
    }
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const filteredEntries = selectedProjectId
    ? entries.filter((entry) => entry.project_id === selectedProjectId)
    : entries;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zeiterfassung</h1>
          <p className="text-gray-600 mt-1">Erfassen Sie Ihre Arbeitszeiten</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
        >
          <Plus size={20} />
          Neuer Zeiteintrag
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Warning if no projects */}
      {projects.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Bitte erstellen Sie zuerst Projekte, bevor Sie Zeiteinträge erfassen.
        </div>
      )}

      {/* Project Filter */}
      {entries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 mb-2">
            Nach Projekt filtern
          </label>
          <select
            id="projectFilter"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
          >
            <option value="">Alle Projekte</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-500 text-center">Lädt Zeiteinträge...</p>
        </div>
      ) : (
        <TimeEntryTable
          entries={filteredEntries}
          projects={projects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEntry ? 'Zeiteintrag bearbeiten' : 'Neuer Zeiteintrag'}
        size="lg"
      >
        <TimeEntryForm
          onSubmit={handleSubmit}
          editingEntry={editingEntry}
          onCancelEdit={handleCloseModal}
          projects={projects}
        />
      </Modal>
    </div>
  );
}
