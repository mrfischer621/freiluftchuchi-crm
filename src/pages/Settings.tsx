import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PipelineStage } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthProvider';
import { Building2, Save, AlertCircle, CheckCircle, TrendingUp, Edit2, Check, X, Trash2, Plus, User, FileText } from 'lucide-react';

interface CompanyFormData {
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

type TabType = 'company' | 'profile' | 'templates' | 'pipeline';

export default function Settings() {
  const { selectedCompany } = useCompany();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('company');

  // Company settings state
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>({
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

  // User profile state
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Text templates state (placeholder for Phase 3.6)
  const [invoiceIntro, setInvoiceIntro] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [quoteIntro, setQuoteIntro] = useState('');
  const [quoteFooter, setQuoteFooter] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pipeline settings state
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('');
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  // Load company data
  useEffect(() => {
    if (selectedCompany) {
      setCompanyFormData({
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

  // Load user profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
  }, [profile]);

  // Load pipeline stages when pipeline tab is active
  useEffect(() => {
    if (activeTab === 'pipeline' && selectedCompany) {
      fetchStages();
    }
  }, [activeTab, selectedCompany]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!selectedCompany || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Lädt...</p>
      </div>
    );
  }

  const fetchStages = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoadingStages(true);
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (err) {
      console.error('Error fetching stages:', err);
      showToast('error', 'Fehler beim Laden der Pipeline-Phasen.');
    } finally {
      setIsLoadingStages(false);
    }
  };

  const validateCompanyForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyFormData.name.trim()) {
      newErrors.name = 'Firmenname ist erforderlich';
    }
    if (!companyFormData.street.trim()) {
      newErrors.street = 'Strasse ist erforderlich';
    }
    if (!companyFormData.house_number.trim()) {
      newErrors.house_number = 'Hausnummer ist erforderlich';
    }
    if (!companyFormData.zip_code.trim()) {
      newErrors.zip_code = 'PLZ ist erforderlich';
    }
    if (!companyFormData.city.trim()) {
      newErrors.city = 'Ort ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCompanyForm()) {
      showToast('error', 'Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update(companyFormData)
        .eq('id', selectedCompany.id);

      if (error) throw error;

      showToast('success', 'Firmeneinstellungen erfolgreich gespeichert!');
    } catch (err) {
      console.error('Error saving company settings:', err);
      showToast('error', 'Fehler beim Speichern der Firmeneinstellungen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompanyFieldChange = (field: keyof CompanyFormData, value: string | boolean) => {
    setCompanyFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Update full_name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user!.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          showToast('error', 'Passwörter stimmen nicht überein.');
          return;
        }

        if (newPassword.length < 6) {
          showToast('error', 'Passwort muss mindestens 6 Zeichen lang sein.');
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;

        setNewPassword('');
        setConfirmPassword('');
        showToast('success', 'Benutzerprofil und Passwort erfolgreich aktualisiert!');
      } else {
        showToast('success', 'Benutzerprofil erfolgreich aktualisiert!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('error', 'Fehler beim Aktualisieren des Profils.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplatesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement text templates saving (Phase 3.6)
    // For now, just show a placeholder message
    showToast('success', 'Textvorlagen-Funktion kommt in Phase 3.6');
  };

  // Pipeline stage handlers
  const handleEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
  };

  const handleSaveStage = async (stageId: string) => {
    if (!editStageName.trim()) {
      showToast('error', 'Phasenname darf nicht leer sein.');
      return;
    }

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({
          name: editStageName.trim(),
          color: editStageColor
        })
        .eq('id', stageId);

      if (error) throw error;

      setStages(stages.map(s =>
        s.id === stageId
          ? { ...s, name: editStageName.trim(), color: editStageColor }
          : s
      ));
      setEditingStageId(null);
      showToast('success', 'Phase erfolgreich aktualisiert.');
    } catch (err) {
      console.error('Error updating stage:', err);
      showToast('error', 'Fehler beim Aktualisieren der Phase.');
    }
  };

  const handleCancelEdit = () => {
    setEditingStageId(null);
    setEditStageName('');
    setEditStageColor('');
  };

  const handleDeleteStage = async (stage: PipelineStage) => {
    const { data: opportunities, error: checkError } = await supabase
      .from('opportunities')
      .select('id')
      .eq('stage_id', stage.id)
      .limit(1);

    if (checkError) {
      showToast('error', 'Fehler beim Prüfen der Phase.');
      return;
    }

    if (opportunities && opportunities.length > 0) {
      showToast('error', 'Diese Phase enthält noch Deals. Bitte verschieben Sie diese zuerst.');
      return;
    }

    if (!confirm(`Möchten Sie die Phase "${stage.name}" wirklich löschen?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stage.id);

      if (error) throw error;

      await fetchStages();
      showToast('success', 'Phase erfolgreich gelöscht.');
    } catch (err) {
      console.error('Error deleting stage:', err);
      showToast('error', 'Fehler beim Löschen der Phase.');
    }
  };

  const handleAddStage = async () => {
    const stageName = prompt('Name der neuen Phase:');
    if (!stageName || !stageName.trim()) return;

    try {
      const maxPosition = stages.length > 0 ? Math.max(...stages.map(s => s.position)) : -1;

      const { error } = await supabase
        .from('pipeline_stages')
        .insert([{
          company_id: selectedCompany.id,
          name: stageName.trim(),
          position: maxPosition + 1,
          color: '#6B7280',
        }] as any);

      if (error) throw error;

      await fetchStages();
      showToast('success', 'Phase erfolgreich hinzugefügt.');
    } catch (err) {
      console.error('Error adding stage:', err);
      showToast('error', 'Fehler beim Hinzufügen der Phase.');
    }
  };

  const tabs = [
    { id: 'company' as TabType, label: 'Firmenprofil', icon: Building2 },
    { id: 'profile' as TabType, label: 'Benutzerprofil', icon: User },
    { id: 'templates' as TabType, label: 'Textvorlagen', icon: FileText },
    { id: 'pipeline' as TabType, label: 'Sales Pipeline', icon: TrendingUp },
  ];

  const colorOptions = [
    { value: '#6B7280', label: 'Grau' },
    { value: '#3B82F6', label: 'Blau' },
    { value: '#8B5CF6', label: 'Lila' },
    { value: '#F59E0B', label: 'Gelb' },
    { value: '#EF4444', label: 'Rot' },
    { value: '#10B981', label: 'Grün' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#14B8A6', label: 'Türkis' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie Ihre Firmen- und Benutzereinstellungen</p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          )}
          <p className={toast.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {toast.message}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-freiluft text-freiluft'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content: Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleCompanySubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Firmenname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={companyFormData.name}
                onChange={(e) => handleCompanyFieldChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition ${
                  errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder="z.B. Muster AG"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                  Strasse <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="street"
                  value={companyFormData.street}
                  onChange={(e) => handleCompanyFieldChange('street', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition ${
                    errors.street ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Musterstrasse"
                />
                {errors.street && <p className="text-sm text-red-600 mt-1">{errors.street}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="house_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Hausnummer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="house_number"
                  value={companyFormData.house_number}
                  onChange={(e) => handleCompanyFieldChange('house_number', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition ${
                    errors.house_number ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="123"
                />
                {errors.house_number && (
                  <p className="text-sm text-red-600 mt-1">{errors.house_number}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                  PLZ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="zip_code"
                  value={companyFormData.zip_code}
                  onChange={(e) => handleCompanyFieldChange('zip_code', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition ${
                    errors.zip_code ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="8000"
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
                  value={companyFormData.city}
                  onChange={(e) => handleCompanyFieldChange('city', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition ${
                    errors.city ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Zürich"
                />
                {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
              </div>
            </div>

            {/* Banking */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  id="iban"
                  value={companyFormData.iban}
                  onChange={(e) => handleCompanyFieldChange('iban', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                  placeholder="CH93 0000 0000 0000 0000 0"
                />
              </div>

              <div>
                <label htmlFor="qr_iban" className="block text-sm font-medium text-gray-700 mb-1">
                  QR-IBAN
                </label>
                <input
                  type="text"
                  id="qr_iban"
                  value={companyFormData.qr_iban}
                  onChange={(e) => handleCompanyFieldChange('qr_iban', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                  placeholder="CH44 3000 0000 0000 0000 0"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                Bankname
              </label>
              <input
                type="text"
                id="bank_name"
                value={companyFormData.bank_name}
                onChange={(e) => handleCompanyFieldChange('bank_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                placeholder="z.B. UBS AG"
              />
            </div>

            {/* Tax */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="uid_number" className="block text-sm font-medium text-gray-700 mb-1">
                  UID-Nummer
                </label>
                <input
                  type="text"
                  id="uid_number"
                  value={companyFormData.uid_number}
                  onChange={(e) => handleCompanyFieldChange('uid_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                  placeholder="CHE-123.456.789"
                />
              </div>

              <div>
                <label htmlFor="vat_number" className="block text-sm font-medium text-gray-700 mb-1">
                  MWST-Nummer
                </label>
                <input
                  type="text"
                  id="vat_number"
                  value={companyFormData.vat_number}
                  onChange={(e) => handleCompanyFieldChange('vat_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                  placeholder="CHE-123.456.789 MWST"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="vat_registered"
                checked={companyFormData.vat_registered}
                onChange={(e) => handleCompanyFieldChange('vat_registered', e.target.checked)}
                className="w-4 h-4 text-freiluft border-gray-300 rounded focus:ring-freiluft"
              />
              <label htmlFor="vat_registered" className="ml-2 text-sm text-gray-700">
                MWST-pflichtig
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: User Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Benutzerprofil</h2>
            <p className="text-sm text-gray-600">
              Diese Einstellungen gelten global für alle Firmen
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                placeholder="Ihr vollständiger Name"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                E-Mail-Adresse kann nicht geändert werden
              </p>
            </div>

            {/* Password Change */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Passwort ändern</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Neues Passwort
                  </label>
                  <input
                    type="password"
                    id="new_password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                    placeholder="Mindestens 6 Zeichen"
                  />
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Passwort wiederholen
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                    placeholder="Passwort bestätigen"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: Text Templates */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Textvorlagen</h2>
            <p className="text-sm text-gray-600">
              Standard-Texte für Offerten und Rechnungen (Markdown wird unterstützt)
            </p>
          </div>

          <form onSubmit={handleTemplatesSubmit} className="space-y-6">
            {/* Invoice Templates */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Rechnungen</h3>

              <div>
                <label htmlFor="invoice_intro" className="block text-sm font-medium text-gray-700 mb-1">
                  Einleitungstext
                </label>
                <textarea
                  id="invoice_intro"
                  value={invoiceIntro}
                  onChange={(e) => setInvoiceIntro(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition font-mono text-sm"
                  placeholder="Besten Dank für Ihren Auftrag. **Fett**, *kursiv*, - Listen..."
                />
                <p className="text-xs text-gray-500 mt-1">Erscheint oberhalb der Rechnungspo sitionen</p>
              </div>

              <div>
                <label htmlFor="invoice_footer" className="block text-sm font-medium text-gray-700 mb-1">
                  Fusstext / Bemerkungen
                </label>
                <textarea
                  id="invoice_footer"
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition font-mono text-sm"
                  placeholder="Zahlbar innert 30 Tagen..."
                />
                <p className="text-xs text-gray-500 mt-1">Erscheint unterhalb der Rechnungspositionen</p>
              </div>
            </div>

            {/* Quote Templates */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-900">Offerten</h3>

              <div>
                <label htmlFor="quote_intro" className="block text-sm font-medium text-gray-700 mb-1">
                  Einleitungstext
                </label>
                <textarea
                  id="quote_intro"
                  value={quoteIntro}
                  onChange={(e) => setQuoteIntro(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition font-mono text-sm"
                  placeholder="Vielen Dank für Ihre Anfrage..."
                />
                <p className="text-xs text-gray-500 mt-1">Erscheint oberhalb der Offertenpositionen</p>
              </div>

              <div>
                <label htmlFor="quote_footer" className="block text-sm font-medium text-gray-700 mb-1">
                  Fusstext / Bemerkungen
                </label>
                <textarea
                  id="quote_footer"
                  value={quoteFooter}
                  onChange={(e) => setQuoteFooter(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition font-mono text-sm"
                  placeholder="Wir freuen uns auf Ihre Antwort..."
                />
                <p className="text-xs text-gray-500 mt-1">Erscheint unterhalb der Offertenpositionen</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-freiluft text-white rounded-lg hover:bg-[#4a6d73] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isSaving ? 'Speichert...' : 'Alle speichern'}
              </button>
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle size={16} />
                Funktion kommt in Phase 3.6
              </p>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: Pipeline Settings */}
      {activeTab === 'pipeline' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Pipeline-Phasen verwalten</h2>
            <p className="text-sm text-gray-600">
              Definieren Sie die Phasen Ihrer Sales Pipeline. Diese werden im Kanban-Board angezeigt.
            </p>
          </div>

          {isLoadingStages ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Lädt...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                >
                  {/* Position */}
                  <div className="w-8 text-center text-sm font-medium text-gray-500">
                    {index + 1}
                  </div>

                  {/* Color */}
                  {editingStageId === stage.id ? (
                    <select
                      value={editStageColor}
                      onChange={(e) => setEditStageColor(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:border-freiluft focus:ring-1 focus:ring-freiluft outline-none"
                    >
                      {colorOptions.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                      title={stage.color}
                    />
                  )}

                  {/* Name */}
                  {editingStageId === stage.id ? (
                    <input
                      type="text"
                      value={editStageName}
                      onChange={(e) => setEditStageName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveStage(stage.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-freiluft focus:ring-1 focus:ring-freiluft outline-none"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 font-medium text-gray-900">{stage.name}</div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {editingStageId === stage.id ? (
                      <>
                        <button
                          onClick={() => handleSaveStage(stage.id)}
                          className="p-2 hover:bg-green-100 rounded transition"
                          title="Speichern"
                        >
                          <Check size={18} className="text-green-600" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 hover:bg-red-100 rounded transition"
                          title="Abbrechen"
                        >
                          <X size={18} className="text-red-600" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStage(stage)}
                          className="p-2 hover:bg-gray-100 rounded transition"
                          title="Bearbeiten"
                        >
                          <Edit2 size={18} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage)}
                          className="p-2 hover:bg-red-100 rounded transition"
                          title="Löschen"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Add New Stage Button */}
              <button
                onClick={handleAddStage}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Plus size={20} />
                <span className="font-medium">Neue Phase hinzufügen</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
