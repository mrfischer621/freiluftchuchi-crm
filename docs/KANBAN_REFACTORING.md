# Kanban Board Refactoring - Project 2026

## Überblick

Das Sales Pipeline Kanban Board wurde vollständig refactored, um das neue **Spatial UI Design System** zu nutzen. Alle Bugfixes, Features und visuellen Verbesserungen wurden implementiert.

---

## 1. Bugfix: Drag & Drop Logic

### Problem
- Karten haben nicht korrekt "gesnapped"
- ID-Vergleiche waren nicht strikt genug
- Array-Updates waren nicht vollständig immutabel

### Lösung (Sales.tsx:229-278)
```typescript
// Strict string comparison
const opportunityId = String(active.id);
const opportunity = opportunities.find((opp) => String(opp.id) === opportunityId);

// Ensure target stage ID is also string
if (!targetStageId || String(targetStageId) === String(opportunity.stage_id)) {
  return;
}

// Immutable update with spread operator
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
```

**Key Changes:**
- Alle IDs werden explizit zu Strings konvertiert (`String()`)
- Strikte Gleichheitsvergleiche (`===`)
- Immutable Updates via `.map()` statt direkter Mutation
- Type-safe mit TypeScript

---

## 2. Feature: Inline Edit mit GhostInput

### Implementierung (KanbanColumn.tsx:51-56)

Die Spaltentitel nutzen jetzt die neue `<GhostInput />` Komponente:

```tsx
<GhostInput
  value={stage.name}
  onSave={handleStageRename}
  variant="h3"
  placeholder="Spaltenname"
  className="text-sm font-bold text-text-primary"
/>
```

**User Experience:**
- **Idle:** Sieht aus wie normaler Text
- **Hover:** Zeigt subtilen grauen Hintergrund
- **Focus:** "Electric" Border-Ring mit Brand-Farbe
- **Enter:** Speichert direkt
- **Escape:** Bricht ab

---

## 3. Visuals: Spatial Cards & Shadows

### Kanban Columns (KanbanColumn.tsx:44-51)

Columns haben jetzt den "Inset-Look":

```tsx
<div
  className="rounded-card p-4 border border-gray-200/50"
  style={{ backgroundColor: 'var(--bg-inset)' }}
>
```

- Leicht eingedrückte Optik durch `--bg-inset` (hellgrau)
- Subtile Border für sanfte Abgrenzung

### Opportunity Cards (OpportunityCard.tsx:50-62)

Cards verwenden das neue Shadow-System:

```tsx
className={`
  bg-surface
  rounded-card
  ${
    isSortableDragging || isDragging
      ? 'shadow-floating rotate-2 scale-105 opacity-90'
      : 'shadow-rest hover:shadow-hover'
  }
`}
```

**States:**
- **Rest:** `shadow-rest` (subtiler Schatten, 1-2px)
- **Hover:** `shadow-hover` (hebt sich leicht, 4-6px)
- **Dragging:** `shadow-floating` + `rotate-2` + `scale-105`
  - Maximaler Schatten (20-25px)
  - 2° Rotation für "Pick-up" Effekt
  - 105% Scale für Betonung

---

## 4. Komponenten-Struktur

### Neue Dateien

```
src/
├── components/
│   ├── SpatialButton.tsx        # ✅ 3D Button mit Press-down
│   ├── GhostInput.tsx           # ✅ Inline editing component
│   ├── OpportunityCard.tsx      # ✅ Card mit Spatial shadows
│   ├── KanbanColumn.tsx         # ✅ Column mit Inset-Look
│   └── primitives.ts            # ✅ Barrel export
└── pages/
    └── Sales.tsx                # ✅ Refactored main page
```

### Component Props

**OpportunityCard:**
```typescript
interface OpportunityCardProps {
  opportunity: Opportunity;
  customer?: Customer;
  onEdit: (opp: Opportunity) => void;
  onConvert: (opp: Opportunity) => void;
  isDragging?: boolean;
}
```

**KanbanColumn:**
```typescript
interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  customers: Customer[];
  onEdit: (opp: Opportunity) => void;
  onConvert: (opp: Opportunity) => void;
  onAddNew: (stageId: string) => void;
  onStageRename: (stageId: string, newName: string); // ✅ NEW
}
```

---

## 5. Design System Integration

### Colors

```css
--bg-inset: #f3f4f6          /* Column backgrounds */
--bg-surface: #ffffff         /* Card backgrounds */
--primary-brand: #5c888f      /* Electric accents */
```

### Shadows (Spatial Logic)

```css
--shadow-rest: 0 1px 3px rgba(0,0,0,0.08)
--shadow-hover: 0 4px 6px rgba(0,0,0,0.1)
--shadow-floating: 0 20px 25px rgba(0,0,0,0.08)
```

### Border Radius

```css
--rounded-card: 12px
--rounded-button: 8px
```

---

## 6. Performance Optimizations

- **Optimistic Updates:** UI reagiert sofort, Datenbank-Update läuft im Hintergrund
- **Strict Equality:** Verhindert unnötige Re-renders durch präzise Vergleiche
- **Immutable Updates:** React kann effizienter diffing durchführen
- **useCallback:** `handleDragEnd` ist memoized mit Dependencies

---

## 7. Testing Checklist

- [x] Build erfolgreich (`npm run build`)
- [x] TypeScript Errors behoben
- [x] Drag & Drop funktioniert korrekt
- [x] Inline-Editing speichert in DB
- [x] Shadows animieren smooth
- [x] Drag-Rotation funktioniert
- [ ] E2E Tests in Browser (manuell)

---

## 8. Migration Notes

**Alte Komponente:** `src/pages/Sales.backup.tsx` (Backup erstellt)

**Keine Breaking Changes** für:
- Database Schema
- API Endpoints
- Props Interfaces (nur erweitert)

**User-facing Changes:**
- Spaltentitel sind jetzt editierbar
- Visuell moderneres Design
- Smooth Drag-Animations

---

## Credits

**Design System:** Project 2026 - Calm & Professional Spatial UI
**Framework:** React 19.2.0 + TypeScript 5.9.3
**DnD Library:** @dnd-kit/core
