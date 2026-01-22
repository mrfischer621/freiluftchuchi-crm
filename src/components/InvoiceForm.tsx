import { useState, useEffect } from 'react';
import { Trash2, Plus, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceItem, Customer, Project, Product } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';

type InvoiceFormData = {
  invoice: Omit<Invoice, 'id' | 'created_at' | 'subtotal' | 'vat_amount' | 'total'>;
  items: Array<Omit<InvoiceItem, 'id' | 'invoice_id' | 'total'>>;
};

type InvoiceFormProps = {
  onSubmit: (data: InvoiceFormData, calculatedTotals: { subtotal: number; vat_amount: number; total: number }) => Promise<void>;
  customers: Customer[];
  projects: Project[];
  nextInvoiceNumber: string;
};

export default function InvoiceForm({ onSubmit, customers, projects, nextInvoiceNumber }: InvoiceFormProps) {
  const { selectedCompany } = useCompany();
  const [customerId, setCustomerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('entwurf');
  const [vatRate, setVatRate] = useState('7.7');
  const [items, setItems] = useState<Array<{ description: string; quantity: string; unit_price: string; product_id?: string }>>([
    { description: '', quantity: '1', unit_price: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    setInvoiceNumber(nextInvoiceNumber);
  }, [nextInvoiceNumber]);

  useEffect(() => {
    const issue = new Date(issueDate);
    const due = new Date(issue);
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().split('T')[0]);
  }, [issueDate]);

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts();
    }
  }, [selectedCompany]);

  const fetchProducts = async () => {
    if (!selectedCompany) return;

    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const customerProjects = customerId
    ? projects.filter((p) => p.customer_id === customerId)
    : [];

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);

    const vat_amount = subtotal * (parseFloat(vatRate) / 100);
    const total = subtotal + vat_amount;

    return { subtotal, vat_amount, total };
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: '1', unit_price: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      // Clear selection - set to free entry mode
      handleItemChange(index, 'product_id', '');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        description: `${product.name} (${product.unit})`,
        unit_price: product.price.toString(),
      };
      setItems(newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { subtotal, vat_amount, total } = calculateTotals();

      const invoiceData: InvoiceFormData = {
        invoice: {
          invoice_number: invoiceNumber,
          customer_id: customerId,
          project_id: projectId || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          vat_rate: parseFloat(vatRate),
          status,
        },
        items: items
          .filter(item => item.description && item.unit_price)
          .map(item => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price),
          })),
      };

      await onSubmit(invoiceData, { subtotal, vat_amount, total });
    } catch (error) {
      console.error('Error submitting invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Neue Rechnung</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
              Projekt (optional)
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!customerId}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition disabled:bg-gray-50"
            >
              <option value="">Kein Projekt</option>
              {customerProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Rechnungsnummer
            </label>
            <input
              type="text"
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 font-medium text-gray-900"
              readOnly
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Rechnungsdatum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="issueDate"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Fällig am
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Invoice['status'])}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
            >
              <option value="entwurf">Entwurf</option>
              <option value="versendet">Versendet</option>
              <option value="bezahlt">Bezahlt</option>
              <option value="überfällig">Überfällig</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Positionen</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="rounded-lg px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center gap-2"
            >
              <Plus size={16} />
              Position hinzufügen
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  {/* Product Selector */}
                  <div className="col-span-3">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Produkt (optional)
                      </label>
                    )}
                    <select
                      value={item.product_id || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition text-sm"
                    >
                      <option value="">Freie Eingabe</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - CHF {product.price.toFixed(2)}/{product.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="col-span-4">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Beschreibung
                      </label>
                    )}
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Beschreibung"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition text-sm"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Menge
                      </label>
                    )}
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="Menge"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition text-sm"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    {index === 0 && (
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Einzelpreis
                      </label>
                    )}
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      placeholder="Preis"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition text-sm"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-1 flex justify-end">
                    {index === 0 && (
                      <div className="h-5 mb-1"></div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Total for this line */}
                <div className="flex justify-end pr-11">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">
                      CHF {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="max-w-sm ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Zwischentotal:</span>
              <span className="font-medium">CHF {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-4">
              <span className="text-gray-600">MwSt ({vatRate}%):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-right"
                />
                <span className="font-medium">CHF {totals.vat_amount.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold text-freiluft border-t pt-2">
              <span>Gesamttotal:</span>
              <span>CHF {totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="rounded-lg px-4 py-2 font-medium bg-freiluft text-white hover:bg-[#4a6d73] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Speichert...' : 'Rechnung speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
