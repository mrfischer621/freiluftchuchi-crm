import { useState, useEffect } from 'react';
import type { Project, Customer } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

type ProjectFormProps = {
  onSubmit: (project: Omit<Project, 'id' | 'created_at'>) => Promise<void>;
  editingProject: Project | null;
  onCancelEdit: () => void;
  customers: Customer[];
};

const statusOptions: Array<{ value: Project['status']; label: string }> = [
  { value: 'offen', label: 'Offen' },
  { value: 'laufend', label: 'Laufend' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
];

export default function ProjectForm({ onSubmit, editingProject, onCancelEdit, customers }: ProjectFormProps) {
  const { selectedCompany } = useCompany();
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Project['status']>('offen');
  const [budget, setBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setCustomerId(editingProject.customer_id);
      setDescription(editingProject.description || '');
      setStatus(editingProject.status);
      setBudget(editingProject.budget?.toString() || '');
    } else {
      resetForm();
    }
  }, [editingProject]);

  const resetForm = () => {
    setName('');
    setCustomerId('');
    setDescription('');
    setStatus('offen');
    setBudget('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        company_id: selectedCompany!.id,
        name,
        customer_id: customerId,
        description: description || null,
        status,
        budget: budget ? parseFloat(budget) : null,
      });
      resetForm();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Projektname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
              placeholder="Projektname"
            />
          </div>

          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
              Kunde <span className="text-red-500">*</span>
            </label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
            >
              <option value="">Kunde auswählen</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Beschreibung
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition resize-none"
            placeholder="Projektbeschreibung..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Project['status'])}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
              Budget (CHF)
            </label>
            <input
              type="number"
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 font-medium bg-freiluft text-white hover:bg-[#4a6d73] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Speichert...' : editingProject ? 'Aktualisieren' : 'Speichern'}
          </button>
          {editingProject && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-4 py-2 font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
