import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceItem, Customer, Project } from '../lib/supabase';
import InvoiceForm from '../components/InvoiceForm';
import InvoiceTable from '../components/InvoiceTable';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { useCompany } from '../context/CompanyContext';

type InvoiceFormData = {
  invoice: Omit<Invoice, 'id' | 'created_at' | 'subtotal' | 'vat_amount' | 'total'>;
  items: Array<Omit<InvoiceItem, 'id' | 'invoice_id' | 'total'>>;
};

export default function Rechnungen() {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('RE-2025-001');

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  // Early return if no company selected
  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
      </div>
    );
  }

  const fetchData = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoading(true);
      setError(null);

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

      // Generate next invoice number (COMPANY-SPECIFIC)
      if (invoicesResult.data && invoicesResult.data.length > 0) {
        const lastNumber = (invoicesResult.data[0] as any).invoice_number;
        const match = lastNumber.match(/RE-(\d{4})-(\d{3})/);
        if (match) {
          const year = new Date().getFullYear();
          const currentYear = parseInt(match[1]);
          const num = parseInt(match[2]);

          if (currentYear === year) {
            setNextInvoiceNumber(`RE-${year}-${String(num + 1).padStart(3, '0')}`);
          } else {
            setNextInvoiceNumber(`RE-${year}-001`);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Fehler beim Laden der Daten. Bitte überprüfen Sie Ihre Supabase-Konfiguration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (
    data: InvoiceFormData,
    calculatedTotals: { subtotal: number; vat_amount: number; total: number }
  ) => {
    if (!selectedCompany) return;

    try {
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

      await fetchData();
    } catch (err) {
      console.error('Error saving invoice:', err);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
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

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Validate company data
      if (!selectedCompany) {
        alert('Keine Firma ausgewählt');
        return;
      }

      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      // Get customer
      const customer = customers.find((c) => c.id === invoice.customer_id);
      if (!customer) {
        alert('Kunde nicht gefunden');
        return;
      }

      // Generate and download PDF
      await downloadInvoicePDF({
        invoice,
        items: items || [],
        customer,
        company: selectedCompany,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(`Fehler beim Erstellen des PDFs: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Rechnungen</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {customers.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Bitte erstellen Sie zuerst Kunden, bevor Sie Rechnungen erstellen.
        </div>
      )}

      <InvoiceForm
        onSubmit={handleSubmit}
        customers={customers}
        projects={projects}
        nextInvoiceNumber={nextInvoiceNumber}
      />

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
    </div>
  );
}
