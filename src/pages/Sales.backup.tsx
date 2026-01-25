import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Opportunity, PipelineStage, Customer } from '../lib/supabase';
import { useCompany } from '../context/CompanyContext';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, AlertCircle, Calendar, GripVertical, Check, X } from 'lucide-react';
import OpportunityForm from '../components/OpportunityForm';

// ============================================================================
// SPATIAL UI 2026 - OPPORTUNITY CARD COMPONENT
// ============================================================================

interface OpportunityCardProps {
  opportunity: Opportunity;
  customer?: Customer;
  onEdit: (opp: Opportunity) => void;
  onConvert: (opp: Opportunity) => void;
  isDragging?: boolean;
}

function OpportunityCard({
  opportunity,
  customer,
  onEdit,
  onConvert,
  isDragging = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: opportunity.id });

  // Calculate rotation based on drag direction for tilt effect
  const rotation = transform ? Math.atan2(transform.y, transform.x) * (180 / Math.PI) * 0.05 : 0;

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isSortableDragging ? 1.02 : 1}) rotate(${rotation}deg)`
      : undefined,
    transition: isSortableDragging ? 'none' : transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  // Check if last contact was more than 14 days ago
  const lastContactDate = new Date(opportunity.last_contact_at);
  const daysSinceContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceContact > 14;

  // Get display name
  const displayName = customer
    ? customer.name
    : opportunity.prospect_info?.company || opportunity.prospect_info?.name || 'Unbekannt';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white rounded-2xl p-4 mb-3
        border border-gray-100
        transition-all duration-200 ease-out
        ${isSortableDragging
          ? 'shadow-2xl ring-2 ring-indigo-500 ring-offset-2'
          : 'shadow-sm hover:shadow-xl'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <div className="bg-gray-200 rounded-lg p-1.5 shadow-sm hover:bg-gray-300 transition-colors">
          <GripVertical size={16} className="text-gray-600" />
        </div>
      </div>

      {/* Stale Indicator - Electric Red Accent */}
      {isStale && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 mb-3 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle size={14} />
          <span>Letzter Kontakt vor {daysSinceContact} Tagen</span>
        </div>
      )}

      {/* Title - Neo-Grotesk Typography */}
      <h3 className="font-bold text-gray-900 mb-2 tracking-tight leading-tight text-base">
        {opportunity.title}
      </h3>

      {/* Customer/Prospect Name */}
      <p className="text-sm text-gray-600 mb-3 font-medium">
        {displayName}
      </p>

      {/* Expected Value - Bold & Clean */}
      {opportunity.expected_value && (
        <div className="inline-block px-3 py-1.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-3 border border-gray-200">
          <p className="text-sm font-bold text-gray-900 tracking-tight">
            CHF {opportunity.expected_value.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Next Action Date */}
      {opportunity.next_action_date && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 font-medium">
          <Calendar size={12} />
          <span>{new Date(opportunity.next_action_date).toLocaleDateString('de-CH')}</span>
        </div>
      )}

      {/* Actions - Spatial Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(opportunity);
          }}
          className="
            flex-1 text-xs font-semibold px-3 py-2
            bg-gray-100 text-gray-700 rounded-xl
            hover:bg-gray-200 active:translate-y-[1px]
            transition-all duration-150 tracking-tight
          "
        >
          Bearbeiten
        </button>
        {opportunity.prospect_info && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConvert(opportunity);
            }}
            className="
              flex-1 text-xs font-semibold px-3 py-2
              bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl
              hover:from-indigo-600 hover:to-indigo-700
              active:translate-y-[1px]
              transition-all duration-150 tracking-tight
              shadow-sm hover:shadow-md
            "
          >
            Als Kunde anlegen
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SPATIAL UI 2026 - KANBAN COLUMN WITH INLINE EDITING
// ============================================================================

interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  customers: Customer[];
  onEdit: (opp: Opportunity) => void;
  onConvert: (opp: Opportunity) => void;
  onAddNew: (stageId: string) => void;
  onStageRename: (stageId: string, newName: string) => void;
}

function KanbanColumn({
  stage,
  opportunities,
  customers,
  onEdit,
  onConvert,
  onAddNew,
  onStageRename,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const opportunityIds = opportunities.map((opp) => opp.id);
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
  });

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = () => {
    setEditedTitle(stage.name);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== stage.name) {
      onStageRename(stage.id, trimmedTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(stage.name);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-[340px] bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-sm"
    >
      {/* Column Header with Inline Editing */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Color Indicator */}
          <div
            className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                ref={inputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyDown}
                className="
                  flex-1 px-2 py-1 text-sm font-bold text-gray-900
                  bg-white border-2 border-indigo-500 rounded-lg
                  outline-none tracking-tight
                "
                maxLength={50}
              />
              <button
                onClick={handleTitleSave}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                title="Speichern (Enter)"
              >
                <Check size={14} className="text-green-600" />
              </button>
              <button
                onClick={handleTitleCancel}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                title="Abbrechen (Esc)"
              >
                <X size={14} className="text-red-600" />
              </button>
            </div>
          ) : (
            <h2
              onClick={handleTitleClick}
              className="
                font-bold text-gray-900 tracking-tight text-sm
                cursor-pointer hover:text-indigo-600
                transition-colors truncate
              "
              title="Klicken zum Bearbeiten"
            >
              {stage.name}
            </h2>
          )}

          {/* Count Badge */}
          <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-lg border border-gray-200 flex-shrink-0">
            {opportunities.length}
          </span>
        </div>

        {/* Add Button */}
        <button
          onClick={() => onAddNew(stage.id)}
          className="
            p-1.5 hover:bg-white rounded-xl
            transition-all duration-150
            active:translate-y-[1px] group/add
          "
          title="Neuer Deal"
        >
          <Plus size={18} className="text-gray-600 group-hover/add:text-indigo-600 transition-colors" />
        </button>
      </div>

      {/* Cards Container */}
      <SortableContext items={opportunityIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px] space-y-3">
          {opportunities.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-sm text-gray-400 font-medium">Keine Deals</p>
            </div>
          ) : (
            opportunities.map((opp) => {
              const customer = customers.find((c) => c.id === opp.existing_customer_id);
              return (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  customer={customer}
                  onEdit={onEdit}
                  onConvert={onConvert}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ============================================================================
// MAIN SALES PAGE COMPONENT
// ============================================================================

export default function Sales() {
  const { selectedCompany } = useCompany();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

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

      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('position', { ascending: true });

      if (stagesError) throw stagesError;

      // Fetch opportunities
      const { data: oppsData, error: oppsError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (oppsError) throw oppsError;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name', { ascending: true });

      if (customersError) throw customersError;

      setStages(stagesData || []);
      setOpportunities(oppsData || []);
      setCustomers(customersData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Fehler beim Laden der Pipeline-Daten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (opportunityData: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return;

    try {
      if (editingOpportunity) {
        const { error } = await supabase
          .from('opportunities')
          .update(opportunityData)
          .eq('id', editingOpportunity.id);

        if (error) throw error;
        setEditingOpportunity(null);
      } else {
        const { error } = await supabase
          .from('opportunities')
          .insert([{ ...opportunityData, company_id: selectedCompany.id }] as any);

        if (error) throw error;
      }

      setShowForm(false);
      await fetchData();
    } catch (err) {
      console.error('Error saving opportunity:', err);
      throw err;
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvert = async (opportunity: Opportunity) => {
    if (!confirm('Möchten Sie diesen Interessenten als Kunde anlegen?')) return;

    try {
      const { error } = await supabase.rpc('convert_prospect_to_customer', {
        opportunity_id_param: opportunity.id,
      });

      if (error) throw error;

      alert('Interessent wurde erfolgreich als Kunde angelegt!');
      await fetchData();
    } catch (err) {
      console.error('Error converting prospect:', err);
      alert('Fehler beim Anlegen des Kunden. Bitte versuchen Sie es erneut.');
    }
  };

  const handleAddNew = (stageId: string) => {
    setSelectedStageId(stageId);
    setEditingOpportunity(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingOpportunity(null);
    setShowForm(false);
  };

  // NEW: Stage rename handler
  const handleStageRename = async (stageId: string, newName: string) => {
    if (!selectedCompany) return;

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', stageId)
        .eq('company_id', selectedCompany.id);

      if (error) throw error;

      // Update local state immediately for responsiveness
      setStages((prevStages) =>
        prevStages.map((stage) =>
          stage.id === stageId ? { ...stage, name: newName } : stage
        )
      );
    } catch (err) {
      console.error('Error renaming stage:', err);
      alert('Fehler beim Umbenennen der Spalte.');
      // Revert on error
      await fetchData();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // IMPROVED: Optimistic drag-and-drop with proper immutability
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !selectedCompany) return;

    const opportunityId = active.id as string;
    const opportunity = opportunities.find((opp) => opp.id === opportunityId);
    if (!opportunity) return;

    // Determine target stage
    let targetStageId: string | null = null;

    // Check if dropped over a stage droppable
    const overIdString = over.id.toString();
    if (overIdString.startsWith('stage-')) {
      targetStageId = overIdString.replace('stage-', '');
    } else {
      // Dropped over another opportunity - use that opportunity's stage
      const overOpportunity = opportunities.find((opp) => opp.id === over.id);
      if (overOpportunity) {
        targetStageId = overOpportunity.stage_id;
      }
    }

    // If no stage determined or same stage, do nothing
    if (!targetStageId || targetStageId === opportunity.stage_id) return;

    // Optimistic update: Update local state immediately
    const updatedOpportunity = {
      ...opportunity,
      stage_id: targetStageId,
      last_contact_at: new Date().toISOString(),
    };

    setOpportunities((prevOpportunities) =>
      prevOpportunities.map((opp) =>
        opp.id === opportunityId ? updatedOpportunity : opp
      )
    );

    // Update database
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          stage_id: targetStageId,
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', opportunityId);

      if (error) throw error;
    } catch (err) {
      console.error('Error moving opportunity:', err);
      alert('Fehler beim Verschieben des Deals.');
      // Revert optimistic update on error
      await fetchData();
    }
  }, [opportunities, selectedCompany]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 font-medium">Lädt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  const activeOpportunity = activeId ? opportunities.find((opp) => opp.id === activeId) : null;
  const activeCustomer = activeOpportunity?.existing_customer_id
    ? customers.find((c) => c.id === activeOpportunity.existing_customer_id)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Page Header - Spatial Design */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
            Sales Pipeline
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            Verwalten Sie Ihre Akquise-Prozesse im Kanban-Board
          </p>
        </div>
        <button
          onClick={() => handleAddNew(stages[0]?.id || '')}
          className="
            flex items-center gap-2 px-5 py-2.5
            bg-gradient-to-br from-indigo-500 to-indigo-600
            text-white rounded-xl font-semibold tracking-tight
            hover:from-indigo-600 hover:to-indigo-700
            active:translate-y-[1px]
            transition-all duration-150
            shadow-md hover:shadow-lg
          "
        >
          <Plus size={20} />
          Neuer Deal
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <OpportunityForm
            onSubmit={handleSubmit}
            editingOpportunity={editingOpportunity}
            onCancelEdit={handleCancelEdit}
            customers={customers}
            stageId={selectedStageId}
          />
        </div>
      )}

      {/* Kanban Board - Bento Grid Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const stageOpportunities = opportunities.filter((opp) => opp.stage_id === stage.id);
              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opportunities={stageOpportunities}
                  customers={customers}
                  onEdit={handleEdit}
                  onConvert={handleConvert}
                  onAddNew={handleAddNew}
                  onStageRename={handleStageRename}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay - Enhanced Physics */}
        <DragOverlay>
          {activeOpportunity ? (
            <div className="rotate-2 scale-105">
              <OpportunityCard
                opportunity={activeOpportunity}
                customer={activeCustomer}
                onEdit={() => {}}
                onConvert={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
