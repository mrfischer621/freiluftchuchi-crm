import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Transaction, Customer, Project } from '../lib/supabase';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';

export default function Buchungen() {
  const { selectedCompany } = useCompany();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'einnahme' | 'ausgabe'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'30' | '90' | '365' | 'all'>('30');

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, filterPeriod]);

  const fetchData = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);

      // Clear existing data to force React re-render
      setTransactions([]);

      // Fetch transactions for this company
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch paid invoices for this company and convert them to transaction format
      const { data: paidInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('company_id', selectedCompany.id)
        .eq('status', 'bezahlt')
        .order('issue_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Convert paid invoices to transactions
      const invoiceTransactions: Transaction[] = (paidInvoices || []).map((invoice: any) => ({
        id: `invoice-${invoice.id}`,
        company_id: selectedCompany.id,
        type: 'einnahme' as const,
        date: invoice.paid_at || invoice.issue_date,
        amount: invoice.total,
        description: `Rechnung ${invoice.invoice_number} - ${invoice.customers?.name || 'Unbekannt'}`,
        category: 'Rechnung',
        project_id: invoice.project_id,
        customer_id: invoice.customer_id,
        invoice_id: invoice.id,
        document_url: null,
        receipt_url: null,
        tags: null,
        billable: true,
        transaction_number: invoice.invoice_number,
        created_at: invoice.created_at,
      }));

      // Combine transactions and invoice transactions
      const allTransactions = [...(transactionsData || []), ...invoiceTransactions];
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fetch customers for this company
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name');

      if (customersError) throw customersError;

      // Fetch projects for this company
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name');

      if (projectsError) throw projectsError;

      setTransactions(allTransactions);
      setCustomers(customersData || []);
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Filter by period
    if (filterPeriod !== 'all') {
      const daysAgo = parseInt(filterPeriod);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      filtered = filtered.filter((t) => new Date(t.date) >= cutoffDate);
    }

    setFilteredTransactions(filtered);
  };

  const handleSubmit = async (data: Partial<Transaction>) => {
    if (!selectedCompany) return;

    try {
      if (editingTransaction) {
        // Update
        const { error } = await supabase
          .from('transactions')
          .update(data)
          .eq('id', editingTransaction.id);

        if (error) throw error;
      } else {
        // Insert with company_id
        const { error } = await supabase
          .from('transactions')
          .insert([{ ...data, company_id: selectedCompany.id }]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingTransaction(undefined);
      await fetchData();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Fehler beim Speichern der Buchung');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    // Don't allow editing invoice-based transactions
    if (transaction.id.startsWith('invoice-')) {
      setError('Rechnungen können nicht als Buchung bearbeitet werden. Bitte bearbeiten Sie die Rechnung im Rechnungs-Modul.');
      return;
    }
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Don't allow deleting invoice-based transactions
      if (id.startsWith('invoice-')) {
        setError('Rechnungen können nicht hier gelöscht werden. Bitte löschen Sie die Rechnung im Rechnungs-Modul.');
        return;
      }

      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) throw error;

      await fetchData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Fehler beim Löschen der Buchung');
    }
  };

  const handleNewTransaction = () => {
    setEditingTransaction(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(undefined);
  };

  if (!selectedCompany || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buchungen</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Einnahmen und Ausgaben</p>
        </div>
        <button
          onClick={handleNewTransaction}
          className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
        >
          <Plus size={20} />
          Neue Buchung
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-4 items-center">
          {/* Account Filter (Tabs) */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-freiluft text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle Konten
            </button>
            <button
              onClick={() => setFilterType('einnahme')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'einnahme'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Einnahmen
            </button>
            <button
              onClick={() => setFilterType('ausgabe')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'ausgabe'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ausgaben
            </button>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
            >
              <option value="30">Letzte 30 Tage</option>
              <option value="90">Letzte 90 Tage</option>
              <option value="365">Letztes Jahr</option>
              <option value="all">Alle Zeiträume</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <TransactionTable
        transactions={filteredTransactions}
        customers={customers}
        projects={projects}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTransaction ? 'Buchung bearbeiten' : 'Neue Buchung'}
        size="lg"
      >
        <TransactionForm
          transaction={editingTransaction}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          customers={customers}
          projects={projects}
        />
      </Modal>
    </div>
  );
}
