import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/supabase';
import ProductForm from '../components/ProductForm';
import ProductTable from '../components/ProductTable';
import { useCompany } from '../context/CompanyContext';

export default function Produkte() {
  const { selectedCompany } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

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
      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(data as any)
          .eq('id', editingProduct.id);

        if (updateError) throw updateError;
        setEditingProduct(undefined);
      } else {
        // Insert new product with company_id
        const { error: insertError } = await supabase
          .from('products')
          .insert([{ ...data, company_id: selectedCompany.id } as any]);

        if (insertError) throw insertError;
      }

      await fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Fehler beim Speichern des Produkts');
      throw err;
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
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

  const handleCancel = () => {
    setEditingProduct(undefined);
  };

  if (!selectedCompany || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-600">Lädt Produkte...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Produkte</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <ProductForm
        onSubmit={handleSubmit}
        editingProduct={editingProduct}
        onCancel={handleCancel}
      />

      <ProductTable
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
