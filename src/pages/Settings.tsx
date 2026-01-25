import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PipelineStage } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import { Building2, Save, AlertCircle, CheckCircle, TrendingUp, Edit2, Check, X, Trash2, Plus } from 'lucide-react';

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

type TabType = 'company' | 'pipeline';

export default function Settings() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<TabType>('company');

  // Company settings state
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

  // Pipeline settings state
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('');
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  // Load company data
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

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Firma wird geladen...</p>
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', selectedCompany.id);

      if (error) throw error;

      showToast('success', 'Einstellungen erfolgreich gespeichert!');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('error', 'Fehler beim Speichern der Einstellungen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
    // Check if stage has opportunities
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
    { id: 'company' as TabType, label: 'Unternehmenseinstellungen', icon: Building2 },
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
        <p className="text-gray-600 mt-1">Verwalten Sie Ihre Firmen- und System-Einstellungen</p>
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

      {/* Tab Content: Company Settings */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Firmenname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
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
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
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
                  value={formData.house_number}
                  onChange={(e) => handleChange('house_number', e.target.value)}
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
                  value={formData.zip_code}
                  onChange={(e) => handleChange('zip_code', e.target.value)}
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
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
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
                  value={formData.iban}
                  onChange={(e) => handleChange('iban', e.target.value)}
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
                  value={formData.qr_iban}
                  onChange={(e) => handleChange('qr_iban', e.target.value)}
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
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
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
                  value={formData.uid_number}
                  onChange={(e) => handleChange('uid_number', e.target.value)}
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
                  value={formData.vat_number}
                  onChange={(e) => handleChange('vat_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-freiluft focus:ring-2 focus:ring-freiluft/20 outline-none transition"
                  placeholder="CHE-123.456.789 MWST"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="vat_registered"
                checked={formData.vat_registered}
                onChange={(e) => handleChange('vat_registered', e.target.checked)}
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
