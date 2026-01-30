# CRM Development Roadmap - Next Session Prompt

**Projekt:** Freiluftchuchi CRM - Multi-Tenant Swiss Business CRM
**Status:** Phase 3.5 Complete ✅ | Ready for Phase 3.6+
**Letzte Session:** 2026-01-30 - Multi-Company Architecture Implementation

---

## Projekt-Kontext für neue Claude Session

Du arbeitest an einem **professionellen Multi-Tenant CRM** für Schweizer Einzelfirmen mit folgenden Features:

### ✅ Vollständig implementiert

**Phase 3.0 - 3.5: Core CRM Features**
- ✅ Multi-Company Support (mehrere Firmen pro User)
- ✅ Company Switcher im Header
- ✅ Table-based RLS (Session-Variable-Free)
- ✅ Kunden, Projekte, Produkte Management
- ✅ Zeiterfassung (Time Tracking)
- ✅ Rechnungsstellung mit Swiss QR-Bill (SPS 2025 v2.3)
- ✅ PDF-Generierung mit QR-Code
- ✅ Financial Dashboards & KPIs
- ✅ Sales Pipeline (Kanban Board mit Drag & Drop)
- ✅ Buchungen & Transaktionen
- ✅ Jahresabschluss (Year-End Closing)
- ✅ Bento UI Design System (Swiss Modern 2026)

### Tech Stack

**Frontend:**
- React 19.2.0 + TypeScript 5.9.3
- Vite 5.4.11 (Build Tool)
- Tailwind CSS 3.4.17 (Styling)
- React Router (Navigation)
- @dnd-kit (Drag & Drop für Kanban)

**Backend:**
- Supabase (PostgreSQL + Row-Level Security)
- Supabase Auth (User Management)
- Supabase Storage (File Uploads)

**Deployment:**
- Vercel (Auto-Deploy von GitHub main branch)

### Wichtige Architektur-Entscheidungen

**Multi-Company:**
- `user_companies` Junction Table (n:m Relationship)
- RLS auf `user_companies` ist **DEAKTIVIERT** (verhindert infinite recursion)
- Table-based RLS: Policies prüfen `user_companies` direkt
- Keine Session Variables (waren problematisch)

**CompanyContext:**
- `selectedCompany` State für aktuelle Firma
- `switchCompany()` für Firmenwechsel
- Alle Pages filtern explizit nach `company_id` (Defense in Depth)

**Sicherheit:**
- RLS auf allen Tabellen (außer user_companies)
- Defense in Depth: RLS + Frontend-Filtering
- Alle RPC-Funktionen validieren `auth.uid()`

### Dokumentation

**Wichtige Dateien:**
- `CLAUDE.md` - Projekt-Kontext & Best Practices
- `MULTI_COMPANY_IMPLEMENTATION.md` - Multi-Company Architektur
- `PDF_GENERATOR_DOCUMENTATION.md` - PDF & QR-Bill Logik
- `SWISSQR_IMPLEMENTATION_V2.md` - Swiss QR-Code Standard

---

## Aktuelle Roadmap & Nächste Schritte

### Phase 3.6: Textvorlagen & Templates (NEXT)

**Ziel:** Wiederverwendbare Texte für Rechnungen und Offerten

**Features:**
1. **Textvorlagen-Verwaltung**
   - Einleitungstext für Rechnungen
   - Fußtext/Bemerkungen für Rechnungen
   - Einleitungstext für Offerten
   - Fußtext für Offerten
   - Markdown-Support

2. **Template-Editor**
   - Rich Text Editor (oder einfacher Markdown Editor)
   - Platzhalter-System: `{customer.name}`, `{invoice.number}`, `{company.name}`
   - Live-Vorschau

3. **Integration in PDF-Generierung**
   - Templates werden in PDF eingefügt
   - Platzhalter werden ersetzt
   - Markdown → PDF-Formatierung

**UI Location:**
- Settings → Textvorlagen Tab (bereits UI vorhanden!)
- `src/pages/Settings.tsx` (Lines 730-827)

**Implementation Hints:**
- Neue Tabelle: `text_templates` mit `company_id` (pro Firma eigene Templates)
- Oder: Spalten in `companies` Tabelle (einfacher für Start)
- PDF-Generator erweitern: `src/utils/pdfGenerator.ts`

---

### Phase 3.7: Offerten-Modul

**Ziel:** Offerten/Angebote erstellen (ähnlich wie Rechnungen)

**Features:**
1. Offerten-Verwaltung (CRUD)
2. Konvertierung: Offerte → Rechnung
3. Status-Tracking: Entwurf / Versendet / Angenommen / Abgelehnt
4. PDF-Export mit QR-Code (optional)
5. Verknüpfung mit Sales Pipeline (Opportunity → Offerte)

**Tables:**
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  quote_number TEXT UNIQUE,
  issue_date DATE,
  valid_until DATE,
  status TEXT, -- entwurf, versendet, angenommen, abgelehnt
  subtotal DECIMAL,
  vat_amount DECIMAL,
  total DECIMAL,
  ...
);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id),
  description TEXT,
  quantity DECIMAL,
  unit_price DECIMAL,
  total DECIMAL
);
```

---

### Phase 3.8: Erweiterte Berechtigungen

**Ziel:** Rollen-System für Team-Firmen

**Features:**
1. Rollen: Admin, Member, Viewer
2. Permissions pro Rolle
3. UI zeigt/versteckt Features basierend auf Rolle
4. Audit-Log für kritische Aktionen

**Implementation:**
- `user_companies.role` bereits vorhanden!
- Frontend: `const { role } = useCompany();`
- Conditional Rendering basierend auf Rolle

---

### Phase 3.9: Erweiterte Analytics

**Ziel:** Bessere Finanz-Auswertungen

**Features:**
1. Kundenanalyse (Top-Kunden nach Umsatz)
2. Produktanalyse (Bestseller)
3. Projekt-Profitabilität
4. Cashflow-Prognose
5. Export als Excel/CSV

---

### Phase 4.0: Mobile Optimierung

**Ziel:** Responsive Design für Tablets & Smartphones

**Features:**
1. Mobile Navigation (Burger Menu)
2. Touch-optimierte UI
3. Offline-Support (PWA)
4. Mobile Zeiterfassung (wichtig!)

---

## Bekannte Probleme & Limitierungen

### ✅ Gelöst
- ~~Infinite recursion bei RLS~~ → RLS auf user_companies deaktiviert
- ~~Session variables funktionieren nicht~~ → Table-based Approach
- ~~Company Switch langsam~~ → Refs in CompanyContext
- ~~Vercel Build Fehler (Vite 6)~~ → Downgrade auf Vite 5.4.11

### ⚠️ Offen (nicht kritisch)
- Keine automatischen Tests (nur manuell)
- Keine Datenmigration Tools
- Keine Backup-Strategie dokumentiert
- Storage Quotas nicht konfiguriert

---

## Development Guidelines

### Code-Style
```typescript
// ✅ GOOD: Explizit nach company_id filtern
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('company_id', selectedCompany.id);

// ❌ BAD: set_active_company vor jedem INSERT (unnötig!)
await supabase.rpc('set_active_company', { company_id });
await supabase.from('customers').insert([...]);
```

### Page Component Pattern
```typescript
export default function EntityPage() {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    const { data } = await supabase
      .from('entity')
      .select('*')
      .eq('company_id', selectedCompany.id);
    setData(data);
  };
}
```

### UI Components
- Nutze Bento UI System: `Card`, `PageHeader`, `KPICard`, `Button`
- Design Tokens in `tailwind.config.js`
- CSS Utilities in `src/index.css`

### Database Migrations
- Format: `YYYYMMDD_description.sql`
- Immer RLS Policies mit erstellen
- Pattern: `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`

---

## Wie du starten solltest

### 1. Lies die Dokumentation
```bash
# Wichtigste Dateien:
cat CLAUDE.md                              # Projekt-Kontext
cat MULTI_COMPANY_IMPLEMENTATION.md        # Multi-Company Architektur
cat PDF_GENERATOR_DOCUMENTATION.md         # PDF-Logik (falls relevant)
```

### 2. Verstehe die Codebase
```bash
# Hauptkomponenten:
src/context/CompanyContext.tsx             # Company State Management
src/pages/Dashboard.tsx                    # KPI Dashboard (Referenz)
src/pages/Rechnungen.tsx                   # Invoicing Logic (Referenz)
src/components/ui/                         # UI Building Blocks
src/utils/pdfGenerator.ts                  # PDF Generation
```

### 3. Wähle nächstes Feature
- Phase 3.6 (Textvorlagen) - UI bereits vorhanden, Backend fehlt
- Phase 3.7 (Offerten) - Ähnlich wie Rechnungen
- Phase 3.8 (Berechtigungen) - `role` bereits in DB

### 4. Implementiere Feature
1. Migration erstellen (falls nötig)
2. TypeScript Types in `src/lib/supabase.ts`
3. Form + Table Components
4. Page Component
5. Route in `App.tsx` + Navigation in `BentoSidebar.tsx`

---

## Kontakt-Information

**Entwickler:** Nicolas Fischer
**GitHub:** mrfischer621/freiluftchuchi-crm
**Branch:** main (Auto-Deploy zu Vercel)

---

## Prompt für neue Session

```
Ich entwickle ein Multi-Tenant CRM für Schweizer Einzelfirmen (Freiluftchuchi CRM).

Tech Stack: React + TypeScript + Supabase + Vercel

Aktueller Status:
- Phase 3.0-3.5 komplett (Multi-Company, Invoicing, Sales Pipeline, etc.)
- Bento UI Design System implementiert
- Table-based RLS (Session-Variable-Free)

Nächste Phase: [Phase auswählen: 3.6, 3.7, 3.8, ...]

Lies bitte:
1. CLAUDE.md - Projekt-Kontext & Guidelines
2. MULTI_COMPANY_IMPLEMENTATION.md - Multi-Company Architektur
3. ROADMAP_PROMPT.md - Diese Datei

Dann lass uns [Feature-Name] implementieren!
```

---

**Letzte Aktualisierung:** 2026-01-30
**Bereit für Phase 3.6+** ✅
