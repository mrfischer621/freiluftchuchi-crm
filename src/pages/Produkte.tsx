import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/supabase';
import ProductForm from '../components/ProductForm';
import ProductTable from '../components/ProductTable';
import Modal from '../components/Modal';
import { useCompany } from '../context/CompanyContext';
import { Plus } from 'lucide-react';

export default function Produkte() {
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts();
    }
  }, [selectedCompany]);

  const fetchProducts = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      setError(null);

      // Clear existing data to force React re-render
      setProducts([]);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name', { ascending: true });

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

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie dieses Produkt wirklich löschen?')) return;

    try {
      // Soft delete - set is_active to false
      const { error: deleteError } = await supabase
        .from('products')
        .update({ is_active: false } as any)
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Fehler beim Löschen des Produkts');
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
          onDelete={handleDelete}
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
