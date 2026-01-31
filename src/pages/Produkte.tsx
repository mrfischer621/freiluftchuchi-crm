import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/supabase';
import ProductForm from '../components/ProductForm';
import ProductTable from '../components/ProductTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

type FilterType = 'alle' | 'aktiv' | 'archiviert';

export default function Produkte() {
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('aktiv');

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts();
    }
  }, [selectedCompany, filter]);

  const fetchProducts = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      setError(null);

      // Clear existing data to force React re-render
      setProducts([]);

      let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', selectedCompany.id);

      // Apply filter
      if (filter === 'aktiv') {
        query = query.eq('is_active', true);
      } else if (filter === 'archiviert') {
        query = query.eq('is_active', false);
      }

      const { data, error: fetchError } = await query.order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return;

    try {
      // Set active company session before INSERT/UPDATE
      await supabase.rpc('set_active_company', { company_id: selectedCompany.id });

      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(data as any)
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;
      } else {
        // Insert new product with company_id
        const { error: insertError } = await supabase
          .from('products')
          .insert([{ ...data, company_id: selectedCompany.id } as any]);

        if (insertError) throw insertError;
      }

      setIsModalOpen(false);
      setEditingProduct(undefined);
      await fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Fehler beim Speichern des Produkts');
      throw err;
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Möchten Sie dieses Produkt wirklich archivieren?')) return;

    try {
      const { error: archiveError } = await supabase
        .from('products')
        .update({ is_active: false } as any)
        .eq('id', id);

      if (archiveError) throw archiveError;

      toast.success('Produkt archiviert');
      await fetchProducts();
    } catch (err) {
      console.error('Error archiving product:', err);
      toast.error('Fehler beim Archivieren des Produkts');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error: restoreError } = await supabase
        .from('products')
        .update({ is_active: true } as any)
        .eq('id', id);

      if (restoreError) throw restoreError;

      toast.success('Produkt wiederhergestellt');
      await fetchProducts();
    } catch (err) {
      console.error('Error restoring product:', err);
      toast.error('Fehler beim Wiederherstellen des Produkts');
    }
  };

  const handleAddNew = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(undefined);
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produkte</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Produkte und Dienstleistungen</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
        >
          <Plus size={20} />
          Neues Produkt
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

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-500 text-center">Lädt Produkte...</p>
        </div>
      ) : (
        <ProductTable
          products={products}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
        size="lg"
      >
        <ProductForm
          onSubmit={handleSubmit}
          editingProduct={editingProduct}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
