import { Link } from 'react-router-dom';
import { Pencil, Archive, RotateCcw, Users, Trash2 } from 'lucide-react';
import type { Customer } from '../lib/supabase';
import type { CustomerWithStats } from '../pages/Kunden';
import { getCustomerDisplayName } from '../utils/customerUtils';

type CustomerTableProps = {
  customers: CustomerWithStats[];
  onEdit: (customer: Customer) => void;
  onRowClick: (customer: Customer) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

// Format currency for display
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function CustomerTable({ customers, onEdit, onRowClick, onArchive, onRestore, onDelete }: CustomerTableProps) {

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Keine Kunden vorhanden. Erstellen Sie den ersten Kunden.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Firma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kontaktperson
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-Mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ort
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefon
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Offene Rechnungen
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kontakte
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => {
              const location = [customer.zip_code, customer.city].filter(Boolean).join(' ') || '-';

              return (
                <tr
                  key={customer.id}
                  onClick={() => onRowClick(customer)}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {customer.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{getCustomerDisplayName(customer)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{customer.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{customer.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {customer.open_invoice_amount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {formatCurrency(customer.open_invoice_amount)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/kunden/${customer.id}/kontakte`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-brand transition"
                    >
                      <Users size={16} />
                      <span>{customer.contacts_count}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {customer.is_active ? 'Aktiv' : 'Archiviert'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(customer)}
                        className="p-2 text-brand hover:bg-sage-50 rounded-lg transition"
                        title="Bearbeiten"
                      >
                        <Pencil size={18} />
                      </button>
                      {customer.is_active ? (
                        <button
                          onClick={() => onArchive(customer.id)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Archivieren"
                        >
                          <Archive size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onRestore(customer.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Wiederherstellen"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(customer.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
