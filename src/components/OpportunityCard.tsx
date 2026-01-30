import { useSortable } from '@dnd-kit/sortable';
import { AlertCircle, Calendar, GripVertical, FileSpreadsheet } from 'lucide-react';
import type { Opportunity, Customer } from '../lib/supabase';

// ============================================================================
// OPPORTUNITY CARD - SPATIAL UI 2026
// ============================================================================

export interface OpportunityCardProps {
  opportunity: Opportunity;
  customer?: Customer;
  onEdit: (opp: Opportunity) => void;
  onConvert: (opp: Opportunity) => void;
  onCreateQuote?: (opp: Opportunity) => void;
  isDragging?: boolean;
}

export function OpportunityCard({
  opportunity,
  customer,
  onEdit,
  onConvert,
  onCreateQuote,
  isDragging = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: String(opportunity.id) });

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
  const daysSinceContact = Math.floor(
    (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStale = daysSinceContact > 14;

  // Get display name
  const displayName = customer
    ? customer.name
    : opportunity.prospect_info?.company ||
      opportunity.prospect_info?.name ||
      'Unbekannt';

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
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
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
        {/* Create Quote - only for existing customers */}
        {opportunity.existing_customer_id && onCreateQuote && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateQuote(opportunity);
            }}
            className="
              flex-1 text-xs font-semibold px-3 py-2
              bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl
              hover:from-emerald-600 hover:to-emerald-700
              active:translate-y-[1px]
              transition-all duration-150 tracking-tight
              shadow-sm hover:shadow-md
              flex items-center justify-center gap-1
            "
          >
            <FileSpreadsheet size={12} />
            Angebot
          </button>
        )}
      </div>
    </div>
  );
}
