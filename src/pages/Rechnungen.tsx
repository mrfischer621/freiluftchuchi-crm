import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceItem, Customer, Project } from '../lib/supabase';
import InvoiceForm from '../components/InvoiceForm';
import InvoiceTable from '../components/InvoiceTable';
import Modal from '../components/Modal';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { validateInvoiceData } from '../utils/invoiceValidation';
import { useCompany } from '../context/CompanyContext';
import { Plus, AlertCircle } from 'lucide-react';

type InvoiceFormData = {
  invoice: Omit<Invoice, 'id' | 'created_at' | 'subtotal' | 'vat_amount' | 'total'>;
  items: Array<Omit<InvoiceItem, 'id' | 'invoice_id' | 'total'>>;
};

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function Rechnungen() {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(`RE-${new Date().getFullYear()}-001`);
  const [toast, setToast] = useState<Toast | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    console.log('[Rechnungen] useEffect triggered, selectedCompany:', selectedCompany?.name);
    if (selectedCompany) {
      console.log('[Rechnungen] Calling fetchData...');
      fetchData();
    }
  }, [selectedCompany]);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Early return if no company selected
  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
      </div>
    );
  }

  const fetchData = async () => {
    console.log('[Rechnungen] fetchData called for company:', selectedCompany?.name);
    if (!selectedCompany) return;

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('[Rechnungen] Already fetching, skipping duplicate call');
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[Rechnungen] Fetching data...');

      const [invoicesResult, customersResult, projectsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('name', { ascending: true }),
        supabase
          .from('projects')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('name', { ascending: true }),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (customersResult.error) throw customersResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setInvoices(invoicesResult.data || []);
      setCustomers(customersResult.data || []);
      setProjects(projectsResult.data || []);

      console.log('[Rechnungen] Data fetched successfully:', {
        invoices: invoicesResult.data?.length || 0,
        customers: customersResult.data?.length || 0,
        projects: projectsResult.data?.length || 0
      });

      // Generate next invoice number (COMPANY-SPECIFIC)
      // Find the highest invoice number for the current year
      const currentYear = new Date().getFullYear();
      let highestNumber = 0;

      if (invoicesResult.data && invoicesResult.data.length > 0) {
        for (const invoice of invoicesResult.data) {
          const invoiceNumber = (invoice as any).invoice_number;
          const match = invoiceNumber?.match(/RE-(\d{4})-(\d{3})/);
          if (match) {
            const invoiceYear = parseInt(match[1]);
            const num = parseInt(match[2]);
            // Only consider invoices from current year
            if (invoiceYear === currentYear && num > highestNumber) {
              highestNumber = num;
            }
          }
        }
      }

      // Set next invoice number
      setNextInvoiceNumber(`RE-${currentYear}-${String(highestNumber + 1).padStart(3, '0')}`);
    } catch (err) {
      console.error('[Rechnungen] Error fetching data:', err);
      setError('Fehler beim Laden der Daten. Bitte überprüfen Sie Ihre Supabase-Konfiguration.');
    } finally {
      console.log('[Rechnungen] fetchData completed, setting isLoading to false');
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleSubmit = async (
    data: InvoiceFormData,
    calculatedTotals: { subtotal: number; vat_amount: number; total: number }
  ) => {
    if (!selectedCompany) return;

    try {
      // Ensure session variable is set before INSERT (fixes RLS policy enforcement)
      const { error: sessionError } = await supabase.rpc('set_active_company', {
        company_id: selectedCompany.id
      });

      if (sessionError) {
        console.error('Failed to set active company:', sessionError);
        throw sessionError;
      }

      // Insert invoice with company_id
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          ...data.invoice,
          company_id: selectedCompany.id,
          subtotal: calculatedTotals.subtotal,
          vat_amount: calculatedTotals.vat_amount,
          total: calculatedTotals.total,
        }] as any)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      const itemsWithInvoiceId = data.items.map(item => ({
        invoice_id: (invoiceData as any).id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithInvoiceId as any);

      if (itemsError) throw itemsError;

      setIsModalOpen(false);
      setToast({ type: 'success', message: 'Rechnung erfolgreich erstellt!' });
      await fetchData();
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      // Show user-friendly error message
      if (err?.code === '23505') {
        setToast({
          type: 'error',
          message: `Rechnungsnummer "${data.invoice.invoice_number}" existiert bereits. Bitte wählen Sie eine andere Nummer.`
        });
      } else {
        setToast({
          type: 'error',
          message: 'Fehler beim Speichern der Rechnung: ' + (err?.message || 'Unbekannter Fehler')
        });
      }
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Rechnung wirklich löschen?')) return;

    try {
      // Delete invoice items first (cascade should handle this, but being explicit)
      await supabase.from('invoice_items').delete().eq('invoice_id', id);

      // Delete invoice
      const { error } = await supabase.from('invoices').delete().eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Fehler beim Löschen der Rechnung.');
    }
  };

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Validate company data
      if (!selectedCompany) {
        setToast({ type: 'error', message: 'Keine Firma ausgewählt' });
        return;
      }

      // Fetch invoice items and fresh company data (including text templates) in parallel
      const [itemsResult, companyResult] = await Promise.all([
        supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id),
        supabase
          .from('companies')
          .select('*')
          .eq('id', selectedCompany.id)
          .single()
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (companyResult.error) throw companyResult.error;

      const items = itemsResult.data;
      const freshCompanyData = companyResult.data;

      // Get customer
      const customer = customers.find((c) => c.id === invoice.customer_id);
      if (!customer) {
        setToast({ type: 'error', message: 'Kunde nicht gefunden' });
        return;
      }

      // VALIDATE DATA BEFORE PDF GENERATION
      const validation = validateInvoiceData(
        { ...invoice, items: items || [] },
        freshCompanyData,
        customer
      );

      if (!validation.valid) {
        // Show all validation errors
        const errorMessage = validation.errors.join(' • ');
        setToast({ type: 'error', message: errorMessage });
        return;
      }

      // Generate and download PDF with fresh company data (includes text templates)
      await downloadInvoicePDF({
        invoice,
        items: items || [],
        customer,
        company: freshCompanyData,
      });

      setToast({ type: 'success', message: 'PDF erfolgreich erstellt' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      setToast({
        type: 'error',
        message: `Fehler beim Erstellen des PDFs: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <p className="text-gray-600 mt-1">Erstellen und verwalten Sie Ihre Rechnungen</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition"
        >
          <Plus size={20} />
          Neue Rechnung
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Warning if no customers */}
      {customers.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Bitte erstellen Sie zuerst Kunden, bevor Sie Rechnungen erstellen.
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-500 text-center">Lädt Rechnungen...</p>
        </div>
      ) : (
        <InvoiceTable
          invoices={invoices}
          customers={customers}
          onDelete={handleDelete}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Neue Rechnung"
        size="xl"
      >
        <InvoiceForm
          onSubmit={handleSubmit}
          customers={customers}
          projects={projects}
          nextInvoiceNumber={nextInvoiceNumber}
        />
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-in">
          <div
            className={`flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <div className="flex-shrink-0 w-5 h-5 text-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ) : (
              <AlertCircle
                className={`flex-shrink-0 ${toast.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
                size={20}
              />
            )}
            <div className="flex-1">
              <p className={toast.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className={`flex-shrink-0 ${
                toast.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
