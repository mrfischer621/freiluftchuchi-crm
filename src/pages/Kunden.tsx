import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Customer } from '../lib/supabase';
import CustomerForm from '../components/CustomerForm';
import CustomerTable from '../components/CustomerTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';
import { Plus } from 'lucide-react';

export default function Kunden() {
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchCustomers();
    }
  }, [selectedCompany]);

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
      </div>
    );
  }

  const fetchCustomers = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Fehler beim Laden der Kunden. Bitte überprüfen Sie Ihre Supabase-Konfiguration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (customerData: Omit<Customer, 'id' | 'created_at'>) => {
    if (!selectedCompany) return;

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([{ ...customerData, company_id: selectedCompany.id }] as any);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingCustomer(null);
      await fetchCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      throw err;
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Kunden wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Fehler beim Löschen des Kunden.');
    }
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Kundendaten</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
        >
          <Plus size={20} />
          Neuer Kunde
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-500 text-center">Lädt Kunden...</p>
        </div>
      ) : (
        <CustomerTable
          customers={customers}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
        size="lg"
      >
        <CustomerForm
          onSubmit={handleSubmit}
          editingCustomer={editingCustomer}
          onCancelEdit={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
