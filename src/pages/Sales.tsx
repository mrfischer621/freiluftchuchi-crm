import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus } from 'lucide-react';
import OpportunityForm from '../components/OpportunityForm';
import { OpportunityCard } from '../components/OpportunityCard';
import { KanbanColumn } from '../components/KanbanColumn';
import { PageHeader, Button } from '../components/ui';

// ============================================================================
// MAIN SALES PAGE COMPONENT - REFACTORED 2026
// ============================================================================

export default function Sales() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
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
        <p className="text-text-secondary font-medium">Firma wird geladen...</p>
      </div>
    );
  }

  const fetchData = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoading(true);
      setError(null);

      // Clear existing data to force React re-render
      setStages([]);
      setOpportunities([]);
      setCustomers([]);

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

  // Navigate to Angebote page to create a quote for this opportunity
  const handleCreateQuote = (opportunity: Opportunity) => {
    if (opportunity.existing_customer_id) {
      navigate(`/angebote?customerId=${opportunity.existing_customer_id}&opportunityId=${opportunity.id}`);
    }
  };

  // BUGFIX: Strict string comparison and immutable update with proper typing
  const handleStageRename = async (stageId: string, newName: string) => {
    if (!selectedCompany) return;

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', stageId)
        .eq('company_id', selectedCompany.id);

      if (error) throw error;

      // Immutable update using map
      setStages((prevStages) =>
        prevStages.map((stage) =>
          stage.id === stageId ? { ...stage, name: newName } : stage
        )
      );
    } catch (err) {
      console.error('Error renaming stage:', err);
      alert('Fehler beim Umbenennen der Spalte.');
      await fetchData();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // BUGFIX: Strict string comparison and immutable array updates
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !selectedCompany) return;

      // Ensure IDs are strings for strict comparison
      const opportunityId = String(active.id);
      const opportunity = opportunities.find((opp) => String(opp.id) === opportunityId);

      if (!opportunity) return;

      // Determine target stage
      let targetStageId: string | null = null;
      const overIdString = String(over.id);

      if (overIdString.startsWith('stage-')) {
        targetStageId = overIdString.replace('stage-', '');
      } else {
        // Dropped over another opportunity
        const overOpportunity = opportunities.find((opp) => String(opp.id) === overIdString);
        if (overOpportunity) {
          targetStageId = overOpportunity.stage_id;
        }
      }

      // Strict comparison - if no stage or same stage, do nothing
      if (!targetStageId || String(targetStageId) === String(opportunity.stage_id)) {
        return;
      }

      // Optimistic update with immutable pattern
      const updatedOpportunity: Opportunity = {
        ...opportunity,
        stage_id: targetStageId,
        last_contact_at: new Date().toISOString(),
      };

      setOpportunities((prevOpportunities) =>
        prevOpportunities.map((opp) =>
          String(opp.id) === opportunityId ? updatedOpportunity : opp
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
        // Revert on error
        await fetchData();
      }
    },
    [opportunities, selectedCompany]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary font-medium">Lädt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl p-6">
        <p className="text-danger font-medium">{error}</p>
      </div>
    );
  }

  const activeOpportunity = activeId ? opportunities.find((opp) => String(opp.id) === activeId) : null;
  const activeCustomer = activeOpportunity?.existing_customer_id
    ? customers.find((c) => c.id === activeOpportunity.existing_customer_id)
    : undefined;

  return (
    <div className="h-full flex flex-col">
      {/* Page Header - Swiss Modern */}
      <div className="flex-shrink-0 mb-4">
        <PageHeader
          title="Sales Pipeline"
          description="Verwalten Sie Ihre Akquise-Prozesse im Kanban-Board"
          actions={
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => handleAddNew(stages[0]?.id || '')}
            >
              Neuer Deal
            </Button>
          }
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="flex-shrink-0 mb-4">
          <OpportunityForm
            onSubmit={handleSubmit}
            editingOpportunity={editingOpportunity}
            onCancelEdit={handleCancelEdit}
            customers={customers}
            stageId={selectedStageId}
          />
        </div>
      )}

      {/* Kanban Board - Full Height, Responsive Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scrollbar-thin">
          <div className="h-full flex gap-4 pb-2">
            {stages.map((stage) => {
              const stageOpportunities = opportunities.filter(
                (opp) => String(opp.stage_id) === String(stage.id)
              );
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
                  onCreateQuote={handleCreateQuote}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay */}
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
