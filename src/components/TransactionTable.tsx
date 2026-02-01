import { Eye, MoreVertical, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Transaction, Customer, Project } from '../lib/supabase';

interface TransactionTableProps {
  transactions: Transaction[];
  customers: Customer[];
  projects: Project[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionTable({ transactions, customers, projects, onEdit, onDelete }: TransactionTableProps) {
  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return '-';
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || '-';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return '-';
    const project = projects.find((p) => p.id === projectId);
    return project?.name || '-';
  };

  const getCategoryBadgeColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';

    const colors: Record<string, string> = {
      'Materialaufwand': 'bg-blue-100 text-blue-800',
      'Sonstige': 'bg-gray-100 text-gray-800',
      'Personalkosten': 'bg-purple-100 text-purple-800',
      'Miete': 'bg-yellow-100 text-yellow-800',
      'Marketing': 'bg-pink-100 text-pink-800',
    };

    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatAmount = (amount: number, type: 'einnahme' | 'ausgabe') => {
    const formatted = amount.toFixed(2);
    const prefix = type === 'einnahme' ? '+' : '-';
    const colorClass = type === 'einnahme' ? 'text-green-600' : 'text-red-600';

    return (
      <span className={`font-semibold ${colorClass}`}>
        {prefix} CHF {formatted}
      </span>
    );
  };

  const calculateTotal = () => {
    return transactions.reduce((sum, t) => {
      return t.type === 'einnahme' ? sum + t.amount : sum - t.amount;
    }, 0);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Keine Buchungen vorhanden. Erstellen Sie die erste Buchung.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum ↓
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nr
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Betrag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Text
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kunde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projekt
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beleg
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('de-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.transaction_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatAmount(transaction.amount, transaction.type)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {transaction.description || '-'}
                    </div>
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {transaction.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex px-2 py-0.5 text-xs rounded-full bg-freiluft text-white"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.category && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(
                          transaction.category
                        )}`}
                      >
                        {transaction.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCustomerName(transaction.customer_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getProjectName(transaction.project_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {transaction.receipt_url ? (
                      <button
                        onClick={async () => {
                          const { data, error } = await supabase.storage
                            .from('receipts')
                            .createSignedUrl(transaction.receipt_url!, 60);
                          if (error) {
                            console.error('Error creating signed URL:', error);
                            alert('Fehler beim Öffnen des Belegs.');
                            return;
                          }
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        }}
                        className="inline-flex items-center justify-center text-gray-400 hover:text-freiluft transition-colors"
                        title="Beleg anzeigen"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-gray-400 hover:text-freiluft transition-colors"
                        title="Details anzeigen"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <div className="relative group">
                        <button className="text-gray-400 hover:text-freiluft transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => onEdit(transaction)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Möchten Sie diese Buchung wirklich löschen?')) {
                                onDelete(transaction.id);
                              }
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-b-lg"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Total Summary */}
      {transactions.length > 0 && (
        <div className="mt-4 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Summe der angezeigten Buchungen:
            </span>
            <span className={`text-lg font-bold ${calculateTotal() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              CHF {calculateTotal().toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
