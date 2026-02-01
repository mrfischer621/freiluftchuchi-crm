import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import type { Transaction, Customer, Project, Category } from '../lib/supabase';

interface TransactionFormProps {
  transaction?: Transaction;
  onSubmit: (data: Partial<Transaction>) => Promise<void>;
  onCancel: () => void;
  customers: Customer[];
  projects: Project[];
}

export default function TransactionForm({ transaction, onSubmit, onCancel, customers, projects }: TransactionFormProps) {
  const { selectedCompany } = useCompany();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [activeTab, setActiveTab] = useState<'einnahme' | 'ausgabe'>(transaction?.type || 'ausgabe');
  const [transactionNumber, setTransactionNumber] = useState(transaction?.transaction_number || '');
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(transaction?.category || '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [customerId, setCustomerId] = useState(transaction?.customer_id || '');
  const [projectId, setProjectId] = useState(transaction?.project_id || '');
  const [tags, setTags] = useState<string[]>(transaction?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [billable, setBillable] = useState(transaction?.billable || false);
  const [loading, setLoading] = useState(false);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedCompany) return;

      try {
        setIsLoadingCategories(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);

        // Set default category if none selected
        if (!categoryId && data && data.length > 0) {
          const typeForTab = activeTab === 'einnahme' ? 'income' : 'expense';
          const defaultCat = data.find(c => c.type === typeForTab);
          if (defaultCat) {
            setCategoryId(defaultCat.id);
          }
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [selectedCompany]);

  // Filter categories by transaction type
  const filteredCategories = categories.filter(c =>
    activeTab === 'einnahme' ? c.type === 'income' : c.type === 'expense'
  );

  // Update default category when tab changes
  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [activeTab, filteredCategories, categoryId]);

  useEffect(() => {
    if (!transaction && !transactionNumber) {
      // Auto-generate transaction number
      const prefix = activeTab === 'einnahme' ? 'E' : 'A';
      const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setTransactionNumber(`${prefix}${number}`);
    }
  }, [activeTab, transaction, transactionNumber]);

  const handleSubmit = async (e: React.FormEvent, saveAndNew = false) => {
    e.preventDefault();
    setLoading(true);

    // Get category name for storage (backward compatible with string category field)
    const selectedCategory = categories.find(c => c.id === categoryId);
    const categoryName = selectedCategory?.name || null;

    try {
      await onSubmit({
        type: activeTab,
        transaction_number: transactionNumber,
        date,
        amount: parseFloat(amount),
        category: categoryName,
        description: description || null,
        customer_id: customerId || null,
        project_id: projectId || null,
        tags: tags.length > 0 ? tags : null,
        billable,
      });

      if (saveAndNew) {
        // Reset form
        setTransactionNumber('');
        setAmount('');
        setDescription('');
        setCategoryId(filteredCategories[0]?.id || '');
        setCustomerId('');
        setProjectId('');
        setTags([]);
        setBillable(false);
      } else {
        onCancel();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Buchung hinzufügen</h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('einnahme')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'einnahme'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Einnahme
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ausgabe')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'ausgabe'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ausgabe
            </button>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            {/* Transaction Number and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beleg-Nr
                </label>
                <input
                  type="text"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Amount and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betrag (CHF)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                  disabled={isLoadingCategories}
                >
                  {isLoadingCategories ? (
                    <option value="">Lädt...</option>
                  ) : filteredCategories.length === 0 ? (
                    <option value="">Keine Kategorien verfügbar</option>
                  ) : (
                    filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                placeholder="Details zur Buchung..."
              />
            </div>

            {/* Customer and Project */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kund:in wählen (optional)
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                >
                  <option value="">-- Keine Auswahl --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projekt (optional)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                >
                  <option value="">-- Keine Auswahl --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-freiluft focus:border-transparent"
                  placeholder="Tag hinzufügen..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Hinzufügen
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-freiluft text-white rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Billable Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="billable"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="w-4 h-4 text-freiluft border-gray-300 rounded focus:ring-freiluft"
              />
              <label htmlFor="billable" className="ml-2 text-sm text-gray-700">
                Verrechenbar
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                disabled={loading}
              >
                Speichern & neu
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-opacity-90"
                disabled={loading}
              >
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
