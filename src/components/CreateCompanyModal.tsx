import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { X, Building2, AlertCircle, CheckCircle } from 'lucide-react';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (companyId: string) => void;
}

interface CompanyFormData {
  name: string;
  street: string;
  house_number: string;
  zip_code: string;
  city: string;
}

interface FormErrors {
  [key: string]: string;
}

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    street: '',
    house_number: '',
    zip_code: '',
    city: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setSubmitError('Benutzer nicht angemeldet');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Call RPC function to create company atomically
      // This handles: company creation, user_companies assignment, and default pipeline stages
      const { data, error: rpcError } = await supabase.rpc('create_company_with_admin', {
        p_name: formData.name || '',
        p_street: formData.street || '',
        p_house_number: formData.house_number || '',
        p_zip_code: formData.zip_code || '',
        p_city: formData.city || '',
      });

      if (rpcError) {
        console.error('Error creating company:', rpcError);
        console.error('Error details:', {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
        });

        // Provide user-friendly error messages
        if (rpcError.message?.includes('not authenticated')) {
          throw new Error('Sie sind nicht angemeldet. Bitte melden Sie sich erneut an.');
        } else if (rpcError.message?.includes('required')) {
          throw new Error('Alle Pflichtfelder müssen ausgefüllt sein.');
        } else if (rpcError.code === '42883') {
          // Function does not exist
          throw new Error(
            'Die Funktion existiert nicht in der Datenbank. Bitte führen Sie die Migration aus: DIAGNOSE_CREATE_COMPANY_ERROR.sql'
          );
        } else if (rpcError.code === '42501') {
          // Insufficient privilege
          throw new Error('Keine Berechtigung. Sie sind möglicherweise nicht angemeldet.');
        } else {
          // Show detailed error in development
          const detailedError = `Fehler beim Erstellen der Firma: ${rpcError.message || 'Unbekannter Fehler'}`;
          throw new Error(detailedError);
        }
      }

      // RPC function returns an array (RETURNS TABLE), so we take the first element
      const company = Array.isArray(data) ? data[0] : data;

      if (!company || !company.id) {
        console.error('Invalid response from RPC:', data);
        throw new Error('Ungültige Antwort vom Server - Firma wurde möglicherweise nicht erstellt');
      }

      // Success: Call onSuccess callback with new company ID
      onSuccess(company.id);
    } catch (err) {
      console.error('Error creating company:', err);
      setSubmitError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    setFormData({
      name: '',
      street: '',
      house_number: '',
      zip_code: '',
      city: '',
    });
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-floating w-full max-w-lg animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Neue Firma erstellen</h2>
                <p className="text-sm text-gray-600">Firma zu Ihrem Account hinzufügen</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {/* Error Alert */}
            {submitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company_name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                    errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="z.B. Muster AG"
                  autoFocus
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Address */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                    Strasse <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleFieldChange('street', e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      errors.street ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Musterstrasse"
                  />
                  {errors.street && <p className="text-sm text-red-600 mt-1">{errors.street}</p>}
                </div>

                <div>
                  <label htmlFor="house_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Nr. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="house_number"
                    value={formData.house_number}
                    onChange={(e) => handleFieldChange('house_number', e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      errors.house_number ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="123"
                  />
                  {errors.house_number && (
                    <p className="text-sm text-red-600 mt-1">{errors.house_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                    PLZ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      errors.zip_code ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="8000"
                    maxLength={4}
                  />
                  {errors.zip_code && <p className="text-sm text-red-600 mt-1">{errors.zip_code}</p>}
                </div>

                <div className="col-span-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Ort <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      errors.city ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Zürich"
                  />
                  {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-blue-800">
                  Weitere Details (IBAN, MwSt, etc.) können Sie nach der Erstellung in den
                  Einstellungen ergänzen.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Erstellt...' : 'Firma erstellen'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
