import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { Building2, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface FormData {
  name: string;
  street: string;
  house_number: string;
  zip_code: string;
  city: string;
  iban: string;
  qr_iban: string;
  uid_number: string;
  bank_name: string;
  vat_number: string;
  vat_registered: boolean;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function Settings() {
  const { selectedCompany } = useCompany();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    street: '',
    house_number: '',
    zip_code: '',
    city: '',
    iban: '',
    qr_iban: '',
    uid_number: '',
    bank_name: '',
    vat_number: '',
    vat_registered: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load company data when selectedCompany changes
  useEffect(() => {
    if (selectedCompany) {
      setFormData({
        name: selectedCompany.name || '',
        street: selectedCompany.street || '',
        house_number: selectedCompany.house_number || '',
        zip_code: selectedCompany.zip_code || '',
        city: selectedCompany.city || '',
        iban: selectedCompany.iban || '',
        qr_iban: selectedCompany.qr_iban || '',
        uid_number: selectedCompany.uid_number || '',
        bank_name: selectedCompany.bank_name || '',
        vat_number: selectedCompany.vat_number || '',
        vat_registered: selectedCompany.vat_registered || false,
      });
    }
  }, [selectedCompany]);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Firmenname ist erforderlich';
    }
    if (!formData.street.trim()) {
      newErrors.street = 'Strasse ist erforderlich';
    }
    if (!formData.house_number.trim()) {
      newErrors.house_number = 'Hausnummer ist erforderlich';
    }
    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'PLZ ist erforderlich';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Ort ist erforderlich';
    }

    // IBAN validation
    if (formData.iban && !formData.iban.toUpperCase().startsWith('CH')) {
      newErrors.iban = 'IBAN muss mit "CH" beginnen (Schweizer IBAN)';
    }

    // QR-IBAN validation
    if (formData.qr_iban && !formData.qr_iban.toUpperCase().startsWith('CH')) {
      newErrors.qr_iban = 'QR-IBAN muss mit "CH" beginnen (Schweizer IBAN)';
    }

    // UID number format validation (optional but helpful)
    if (formData.uid_number && !formData.uid_number.match(/^CHE-?\d{3}\.?\d{3}\.?\d{3}$/i)) {
      newErrors.uid_number = 'UID-Format: CHE-XXX.XXX.XXX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({
        type: 'error',
        message: 'Bitte korrigieren Sie die markierten Fehler',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name.trim(),
          street: formData.street.trim(),
          house_number: formData.house_number.trim(),
          zip_code: formData.zip_code.trim(),
          city: formData.city.trim(),
          iban: formData.iban.trim() || null,
          qr_iban: formData.qr_iban.trim() || null,
          uid_number: formData.uid_number.trim() || null,
          bank_name: formData.bank_name.trim() || null,
          vat_number: formData.vat_number.trim() || null,
          vat_registered: formData.vat_registered,
        })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      setToast({
        type: 'success',
        message: 'Einstellungen erfolgreich gespeichert',
      });

      // Optionally reload the page to refresh company context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error updating company settings:', err);
      setToast({
        type: 'error',
        message: 'Fehler beim Speichern der Einstellungen',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={32} className="text-freiluft" />
          <h1 className="text-3xl font-bold text-gray-900">Firmeneinstellungen</h1>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grundinformationen</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="z.B. Freiluft Chuchi GmbH"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="uid_number" className="block text-sm font-medium text-gray-700 mb-1">
                  UID-Nummer
                </label>
                <input
                  type="text"
                  id="uid_number"
                  name="uid_number"
                  value={formData.uid_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.uid_number ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="CHE-123.456.789"
                />
                {errors.uid_number && <p className="text-red-500 text-sm mt-1">{errors.uid_number}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Adresse</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strasse & Hausnummer <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="flex-grow">
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.street ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Musterstrasse"
                    />
                    {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
                  </div>
                  <div className="w-28">
                    <input
                      type="text"
                      id="house_number"
                      name="house_number"
                      value={formData.house_number}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.house_number ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="123"
                    />
                    {errors.house_number && <p className="text-red-500 text-sm mt-1">{errors.house_number}</p>}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Postleitzahl <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.zip_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="8001"
                />
                {errors.zip_code && <p className="text-red-500 text-sm mt-1">{errors.zip_code}</p>}
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  Ort <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Zürich"
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bankverbindung</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Bankname
                </label>
                <input
                  type="text"
                  id="bank_name"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="z.B. UBS, Credit Suisse, PostFinance"
                />
              </div>

              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  id="iban"
                  name="iban"
                  value={formData.iban}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.iban ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="CH93 0076 2011 6238 5295 7"
                />
                {errors.iban && <p className="text-red-500 text-sm mt-1">{errors.iban}</p>}
              </div>

              <div>
                <label htmlFor="qr_iban" className="block text-sm font-medium text-gray-700 mb-1">
                  QR-IBAN (für Swiss QR-Bill)
                </label>
                <input
                  type="text"
                  id="qr_iban"
                  name="qr_iban"
                  value={formData.qr_iban}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.qr_iban ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="CH44 3199 9123 0008 8901 2"
                />
                {errors.qr_iban && <p className="text-red-500 text-sm mt-1">{errors.qr_iban}</p>}
                <p className="text-gray-500 text-sm mt-1">
                  QR-IBAN wird für die Generierung von Swiss QR-Rechnungen benötigt
                </p>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Steuerinformationen</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vat_registered"
                  name="vat_registered"
                  checked={formData.vat_registered}
                  onChange={handleChange}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="vat_registered" className="ml-2 text-sm font-medium text-gray-700">
                  MWST-pflichtig
                </label>
              </div>

              {formData.vat_registered && (
                <div>
                  <label htmlFor="vat_number" className="block text-sm font-medium text-gray-700 mb-1">
                    MWST-Nummer
                  </label>
                  <input
                    type="text"
                    id="vat_number"
                    name="vat_number"
                    value={formData.vat_number}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="CHE-123.456.789 MWST"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-freiluft text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Save size={20} />
            {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
