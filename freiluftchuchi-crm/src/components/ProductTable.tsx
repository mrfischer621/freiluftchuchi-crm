import { Pencil, Trash2 } from 'lucide-react';
import type { Product } from '../lib/supabase';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(`Möchten Sie das Produkt "${product.name}" wirklich löschen?`)) {
      onDelete(product.id);
    }
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Keine Produkte vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Preis</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Einheit</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Beschreibung</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className={`border-b border-gray-100 hover:bg-gray-50 ${
                  !product.is_active ? 'opacity-50' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <span className="font-medium text-gray-900">{product.name}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-600">{product.unit}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-600 text-sm">
                    {product.description || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
