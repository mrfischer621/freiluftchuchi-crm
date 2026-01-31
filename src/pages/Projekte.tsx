import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, Customer } from '../lib/supabase';
import ProjectForm from '../components/ProjectForm';
import ProjectTable from '../components/ProjectTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

type FilterType = 'alle' | 'aktiv' | 'archiviert';

export default function Projekte() {
  const { selectedCompany } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('aktiv');

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany, filter]);

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
      setProjects([]);
      setCustomers([]);

      // Build projects query with filter
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .eq('company_id', selectedCompany.id);

      // Apply filter
      if (filter === 'aktiv') {
        projectsQuery = projectsQuery.eq('is_active', true);
      } else if (filter === 'archiviert') {
        projectsQuery = projectsQuery.eq('is_active', false);
      }

      const [projectsResult, customersResult] = await Promise.all([
        projectsQuery.order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('is_active', true) // Only show active customers in dropdown
          .order('name', { ascending: true }),
      ]);

      if (projectsResult.error) throw projectsResult.error;
      if (customersResult.error) throw customersResult.error;

      setProjects(projectsResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Fehler beim Laden der Daten. Bitte überprüfen Sie Ihre Supabase-Konfiguration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (projectData: Omit<Project, 'id' | 'created_at'>) => {
    if (!selectedCompany) return;

    try {
      // Set active company session before INSERT/UPDATE
      await supabase.rpc('set_active_company', { company_id: selectedCompany.id });

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([{ ...projectData, company_id: selectedCompany.id }] as any);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingProject(null);
      await fetchData();
    } catch (err) {
      console.error('Error saving project:', err);
      throw err;
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Möchten Sie dieses Projekt wirklich archivieren?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Projekt archiviert');
      await fetchData();
    } catch (err) {
      console.error('Error archiving project:', err);
      toast.error('Fehler beim Archivieren des Projekts.');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Projekt wiederhergestellt');
      await fetchData();
    } catch (err) {
      console.error('Error restoring project:', err);
      toast.error('Fehler beim Wiederherstellen des Projekts.');
    }
  };

  const handleAddNew = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Projekte</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
        >
          <Plus size={20} />
          Neues Projekt
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('alle')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'alle'
              ? 'bg-freiluft text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('aktiv')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'aktiv'
              ? 'bg-freiluft text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Aktiv
        </button>
        <button
          onClick={() => setFilter('archiviert')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'archiviert'
              ? 'bg-freiluft text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Archiviert
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Warning if no customers */}
      {customers.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Bitte erstellen Sie zuerst Kunden, bevor Sie Projekte anlegen.
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-500 text-center">Lädt Projekte...</p>
        </div>
      ) : (
        <ProjectTable
          projects={projects}
          customers={customers}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'}
        size="lg"
      >
        <ProjectForm
          onSubmit={handleSubmit}
          editingProject={editingProject}
          onCancelEdit={handleCloseModal}
          customers={customers}
        />
      </Modal>
    </div>
  );
}
