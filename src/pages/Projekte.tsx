import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, Customer } from '../lib/supabase';
import ProjectForm from '../components/ProjectForm';
import ProjectTable from '../components/ProjectTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';
import { Plus } from 'lucide-react';

export default function Projekte() {
  const { selectedCompany } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      const [projectsResult, customersResult] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', selectedCompany.id)
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

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Fehler beim Löschen des Projekts.');
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
          onDelete={handleDelete}
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
