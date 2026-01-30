# CRM Roadmap: Production-Ready Überarbeitung

## Projektziel
Freiluftchuchi CRM zu einem vollständig betriebsbereiten Multi-Tenant-System für Schweizer KMUs ausbauen. Schwerpunkte: Multi-Company-Support, vollständiges Offerten-Modul, erweiterte Rechnungsfunktionen, optimierte Zeiterfassung mit Reporting.

## Executive Summary: Geklärte Requirements

Nach detaillierter Abklärung mit User via AskUserQuestion-Tool wurden folgende Entscheidungen getroffen:

### Architektur-Entscheidungen
- **Multi-Company Switch:** Page Reload (window.location.reload) - Einfachste Lösung
- **User Profile:** Global (nicht pro Firma) - Ein Profil für alle Firmen
- **User Management:** Nur Admins können User einladen (Phase 1: DB-Structure, kein UI)
- **Database:** Junction-Tabelle `user_companies` mit Rollen (admin/member/viewer)
- **Default Company:** Letzte aktive Firma speichern (last_active_company_id)

### Offerten-Modul
- **Überfällig:** Nur visuell (Badge), keine automatischen Benachrichtigungen
- **Quote → Invoice:** Editierbarer Import via Modal (User kann Items anpassen)
- **PDF:** Logo automatisch einfügen, Markdown-Support, KEIN QR-Code
- **Sales Integration:** Direkt aus Opportunity Offerte erstellen (Button in OpportunityCard)

### Rechnungs-Upgrade
- **Editierbar:** Alle Stati außer "bezahlt" (entwurf, versendet, überfällig)
- **Rich Text:** Markdown-Support (fett, kursiv, Listen) - kein WYSIWYG Editor
- **Zeiterfassungs-Import:** Gruppierung pro Kalenderwoche im Monat (KW 3 Jan 2026: 12.5h)
- **Rabatte:** Separate Zeile im PDF (transparent dargestellt)
- **Textvorlagen:** Nur eine Standard-Vorlage pro Typ (kein Dropdown)
- **QR-Bill:** Teilweise implementiert - braucht Fixes (Latin-1 Validierung, Fehlerhandling)

### Buchungen & Auswertungen
- **Kontenplan:** Flache Struktur (keine Hierarchie)
- **Beleg-Upload:** PDF + JPEG/PNG (keine Excel/CSV)

### Zeiterfassung
- **Inline-Input:** Form leeren nach Submit
- **Gruppierung:** Toggle Date/KW Ansicht (User kann umschalten)
- **Verrechenbar:** Pflichtfeld (Radio-Group)
- **Reporting:** KEIN Export nötig - Zeiten werden direkt aus Rechnungsmodul importiert
- **Nicht-verrechenbare Zeiten:** NICHT im Import-Modal anzeigen (nur verrechenbare)

### Listen & Filter
- **Kontakte:** Eigene Page `/kunden/:id/kontakte` (nicht Expandable Row)
- **Archivierung:** Mit Wiederherstellen-Funktion (is_active toggle)

### Dashboard
- **Jahresansicht:** Jahr-Dropdown (2024, 2025, 2026...) statt nur Toggle

### Design
- **Fokus:** Farben entsättigen + Mehr Whitespace
- **NICHT ändern:** Schriftgrösse, Schatten

### Settings
- **Navigation:** Raus aus Sidebar, rein ins User-Menu oben rechts
- **Tabs:** Firmenprofil, Benutzerprofil (neu), Textvorlagen (neu), Sales Pipeline
- **Kein Notifications-Tab:** Später bei Bedarf

## Tech Stack (Analysiert)

### Frontend
- **Framework:** React 19.2.0 + TypeScript 5.9.3
- **Routing:** React Router 7.1.3
- **Styling:** Tailwind CSS 3.4.17 mit Swiss Modern 2026 Design System
- **State Management:** React Context (AuthProvider + CompanyProvider)
- **PDF Generation:** jsPDF 2.5.2 + html2canvas 1.4.1
- **Drag & Drop:** @dnd-kit 6.3.1 (Sales Pipeline)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth mit Row-Level Security (RLS)
- **Multi-Tenancy:** company_id-basierte Isolation via get_user_company_id()

### Deployment
- **Platform:** Vercel
- **Node:** >=20.x, npm >=10.x

## Aktuelle Architektur-Erkenntnisse

### State Management
```typescript
// CompanyContext.tsx - Aktueller Zustand (1:1)
const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

// profiles Tabelle
interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_id: string; // <- Aktuell: Einzelne Firma
}
```

### Kritische Dateien
- [src/contexts/CompanyContext.tsx](src/contexts/CompanyContext.tsx) - Company State Management
- [src/contexts/AuthProvider.tsx](src/contexts/AuthProvider.tsx) - User Session
- [src/components/BentoHeader.tsx](src/components/BentoHeader.tsx) - User Menu (UI)
- [src/components/BentoSidebar.tsx](src/components/BentoSidebar.tsx) - Navigation
- [src/pages/Settings.tsx](src/pages/Settings.tsx) - Settings Page
- [src/lib/supabase.ts](src/lib/supabase.ts) - Type Definitions

---

## PHASE 1: Core & Navigation 🚀 (Priorität: KRITISCH)

### 1.0 User Management & Rollen (Nur Admins) ✅ ERLEDIGT

**Scope:** Phase 1 implementiert nur die Datenstruktur. UI für User-Verwaltung kommt später.

**Rollen:**
- **admin:** Kann User einladen, entfernen, Firmeneinstellungen ändern
- **member:** Standard-Rolle, kann arbeiten aber keine User verwalten
- **viewer:** Nur lesend (optional, später)

**WICHTIG:** Aktueller User wird beim Migrieren automatisch als `admin` gesetzt.

**User-Verwaltung UI (Phase 1 NICHT implementiert):**
- Settings > Benutzer Tab (später)
- User einladen per E-Mail (später)
- Rollen zuweisen (später)

**Checkliste (nur DB):**
- [x] role-Spalte in user_companies (admin | member | viewer)
- [x] RLS Policy: Nur Admins können user_companies modifizieren
- [x] Bestehende User als 'admin' migrieren
- [x] UI-Vorbereitung: isAdmin() Helper-Funktion erstellen

### 1.1 Multi-Company Database Schema ✅ ERLEDIGT

**Neue Tabelle: `user_companies`**
```sql
CREATE TABLE user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- admin | member | viewer
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- RLS Policies
CREATE POLICY "Users can view their company assignments"
  ON user_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Company admins can manage user assignments"
  ON user_companies FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

**Erweitere `profiles` Tabelle:**
```sql
ALTER TABLE profiles
  DROP COLUMN company_id,
  ADD COLUMN last_active_company_id uuid REFERENCES companies(id);

-- Migration: Bestehende Zuordnungen migrieren
INSERT INTO user_companies (user_id, company_id, role)
SELECT id, company_id, 'admin' FROM profiles;
```

**Checkliste:**
- [x] Migration `20260128_multi_company_step1_junction_table.sql` erstellt
- [x] Migration `20260128_multi_company_step2_data_migration.sql` erstellt
- [x] Migration `20260128_multi_company_step3_modify_profiles.sql` erstellt
- [x] Migration `20260128_multi_company_step4_update_function.sql` erstellt
- [x] TypeScript Types in src/lib/supabase.ts ergänzt (Profile, UserCompany)
- [ ] RLS Policies testen mit mehreren Usern (nach Deployment)
- [x] get_user_company_id() Funktion angepasst (Session-basiert)

### 1.2 Company Switcher - Frontend Logic ✅ ERLEDIGT

**CompanyContext.tsx Refactor:**
```typescript
interface CompanyContextType {
  companies: Company[]; // ALLE Firmen des Users
  selectedCompany: Company | null; // Aktive Firma
  switchCompany: (companyId: string) => Promise<void>;
  loading: boolean;
}

const switchCompany = async (companyId: string) => {
  // 1. Update last_active_company_id in profiles
  await supabase.from('profiles').update({
    last_active_company_id: companyId
  }).eq('id', user.id);

  // 2. Update State
  setSelectedCompany(companies.find(c => c.id === companyId));

  // 3. Trigger Data Refresh (alle Subscriptions neu laden)
  window.location.reload(); // Einfachste Lösung für Phase 1
};
```

**Checkliste:**
- [x] [CompanyContext.tsx](src/context/CompanyContext.tsx) - State erweitert (companies array)
- [x] `fetchUserCompanies()` - Verwendet get_user_companies RPC
- [x] `switchCompany()` Funktion implementiert (mit Page Reload)
- [x] Auto-select last_active_company beim Login

### 1.3 UI: Company Switcher im User Menu ✅ ERLEDIGT

**BentoHeader.tsx Update:**
```tsx
// Dropdown-Struktur:
// ┌─────────────────────────────┐
// │ 👤 Max Mustermann           │
// ├─────────────────────────────┤
// │ 🏢 Firma: Acme GmbH ▾       │ <- Switcher
// │   → Acme GmbH (aktiv)       │
// │   → Beta AG                 │
// ├─────────────────────────────┤
// │ ⚙️ Einstellungen            │
// │ 🚪 Abmelden                 │
// └─────────────────────────────┘
```

**Checkliste:**
- [x] [BentoHeader.tsx](src/components/BentoHeader.tsx) - Dropdown mit Company Switcher
- [x] Company List mit Checkmark für aktive Firma
- [x] onClick Handler -> switchCompany()
- [x] Loading State während Switch

### 1.4 Settings Refactor ✅ ERLEDIGT (Tab-Layout implementiert)

**Navigation Update:**
```typescript
// BentoSidebar.tsx - Einstellungen ENTFERNEN
const navItems = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Sales', icon: TrendingUp, path: '/sales' },
  // ... andere Items
  // ❌ REMOVE: { name: 'Einstellungen', icon: Settings, path: '/settings' }
];
```

**Settings Page -> Tab Layout:**
```tsx
<div className="settings-container">
  <Tabs defaultValue="firmenprofil">
    <TabsList>
      <TabsTrigger value="firmenprofil">Firmenprofil</TabsTrigger>
      <TabsTrigger value="benutzerprofil">Benutzerprofil</TabsTrigger>
      <TabsTrigger value="textvorlagen">Textvorlagen</TabsTrigger>
      <TabsTrigger value="pipeline">Sales Pipeline</TabsTrigger>
    </TabsList>
    <TabsContent value="firmenprofil">
      {/* Aktueller Settings Content */}
    </TabsContent>
    {/* ... andere Tabs */}
  </Tabs>
</div>
```

**Benutzerprofil-Tab (Global):**
```tsx
<TabsContent value="benutzerprofil">
  <Card>
    <Card.Header title="Benutzerprofil" subtitle="Gilt für alle Firmen" />
    <Card.Content>
      <div className="form-group">
        <label>Name</label>
        <input value={profile.full_name} />
      </div>
      <div className="form-group">
        <label>E-Mail</label>
        <input type="email" value={profile.email} disabled />
        <small>E-Mail kann nicht geändert werden (Auth)</small>
      </div>
      <div className="form-group">
        <label>Passwort ändern</label>
        <input type="password" placeholder="Neues Passwort" />
        <input type="password" placeholder="Passwort wiederholen" />
        <Button onClick={updatePassword}>Passwort ändern</Button>
      </div>
    </Card.Content>
  </Card>
</TabsContent>
```

**Checkliste:**
- [x] [BentoSidebar.tsx](src/components/BentoSidebar.tsx) - Settings Link entfernen
- [x] [BentoHeader.tsx](src/components/BentoHeader.tsx) - Settings im User Menu
- [x] [Settings.tsx](src/pages/Settings.tsx) - Tab Layout implementiert
- [x] Content auf Tabs verteilt:
  - [x] **Firmenprofil:** Logo, Name, Adresse, IBAN, QR-IBAN, MwSt
  - [x] **Benutzerprofil:** Name, Passwort ändern (global für alle Firmen)
  - [x] **Textvorlagen:** Standard-Texte für Offerten/Rechnungen (4 Felder) - UI vorhanden
  - [x] **Pipeline:** Stage-Manager implementiert
- [x] Passwort-Änderung über Supabase Auth implementiert

### 1.5 Neue Firma hinzufügen 🆕

**Feature:** User können weitere Firmen zu ihrem Account hinzufügen und zwischen ihnen wechseln.

**UI-Ansatz:** Button im User-Menu Dropdown

**Workflow:**
1. User klickt "Neue Firma erstellen" im User-Menu
2. Modal öffnet sich mit Basis-Formular (Name, Adresse, IBAN)
3. Firma wird erstellt + User automatisch als Admin in user_companies eingetragen
4. Auto-Switch zur neuen Firma (Company Switcher Logic)

**Modal-Formular (Minimal):**
```tsx
<Modal title="Neue Firma erstellen">
  <form onSubmit={handleCreateCompany}>
    <div className="space-y-4">
      <Input
        label="Firmenname *"
        placeholder="Muster AG"
        required
      />
      <Input
        label="Strasse *"
        placeholder="Musterstrasse"
        required
      />
      <Input
        label="Hausnummer *"
        placeholder="123"
        required
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          label="PLZ *"
          placeholder="8000"
          required
        />
        <Input
          label="Ort *"
          placeholder="Zürich"
          className="col-span-2"
          required
        />
      </div>
      <small className="text-gray-500">
        Weitere Details können Sie später in den Einstellungen ergänzen.
      </small>
    </div>
    <div className="flex gap-3 mt-6">
      <Button type="submit" variant="primary">
        Firma erstellen
      </Button>
      <Button type="button" variant="ghost" onClick={closeModal}>
        Abbrechen
      </Button>
    </div>
  </form>
</Modal>
```

**Database-Logic:**
```typescript
const createNewCompany = async (data: CreateCompanyData) => {
  // 1. Create company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert([{
      name: data.name,
      street: data.street,
      house_number: data.house_number,
      zip_code: data.zip_code,
      city: data.city,
      vat_registered: false,
      // Defaults for other fields
    }])
    .select()
    .single();

  if (companyError) throw companyError;

  // 2. Add user as admin to user_companies
  const { error: userCompanyError } = await supabase
    .from('user_companies')
    .insert([{
      user_id: user.id,
      company_id: company.id,
      role: 'admin',
    }]);

  if (userCompanyError) throw userCompanyError;

  // 3. Switch to new company
  await switchCompany(company.id);

  return company;
};
```

**Checkliste:**
- [x] Button "Neue Firma" in [BentoHeader.tsx](src/components/BentoHeader.tsx) User-Menu hinzugefügt
- [x] Modal-Komponente [CreateCompanyModal.tsx](src/components/CreateCompanyModal.tsx) erstellt
- [x] RPC-Funktion `create_company_with_admin()` in Migration Step 5 erstellt
- [x] Frontend auf RPC-Call umgestellt (löst 403 Forbidden Problem)
- [x] Validation: Pflichtfelder (Name, Strasse, Hausnummer, PLZ, Ort)
- [x] Nach Erstellung: Auto-Switch zur neuen Firma via switchCompany()
- [x] Atomare Transaktion: Company + user_companies + pipeline_stages in einer RPC
- [x] Error Handling: User-friendly Fehlermeldungen
- [ ] Migration Step 5 auf Supabase deployen
- [ ] Integration Test: Modal öffnen, Firma erstellen, Wechsel testen

### 1.6 Rechnungserstellung - Validierung ✅ ERLEDIGT

**Checkliste:**
- [x] Validation Utility erstellt: `src/utils/invoiceValidation.ts`
- [x] In Rechnungen.tsx eingebunden (PDF-Download mit Validierung)
- [x] Toast Notifications für Fehler
- [x] Validierung analog für Offerten: `src/utils/quoteValidation.ts`

---

## PHASE 2: Offerten-Modul 📋 ✅ ERLEDIGT

### 2.1 Database Schema ✅
- [x] Migration `supabase/migrations/20260131_quotes_module.sql`
- [x] Tables: `quotes`, `quote_items` mit RLS Policies
- [x] Types in `src/lib/supabase.ts`: Quote, QuoteItem, QuoteStatus

### 2.2 Offerten-UI (CRUD) ✅
- [x] `src/pages/Angebote.tsx` - Hauptseite mit CRUD
- [x] `src/components/QuoteForm.tsx` - Formular (AN-YYYY-NNN Format)
- [x] `src/components/QuoteTable.tsx` - Tabelle mit 6 Status-Badges
- [x] Route `/angebote` in App.tsx
- [x] Sidebar-Item "Angebote" mit FileSpreadsheet Icon

### 2.3 Offerten-Workflow ✅
- [x] Status: offen → versendet → akzeptiert/abgelehnt → bestaetigt
- [x] "Als Rechnung" Button bei akzeptierten Offerten
- [x] `src/components/QuoteToInvoiceModal.tsx` - Editierbare Items
- [x] Quote → Invoice Konvertierung mit Status-Update

### 2.4 Offerten-PDF ✅
- [x] `generateQuotePDF()` und `downloadQuotePDF()` in pdfGenerator.ts
- [x] Titel "ANGEBOT", Gültigkeitsdatum prominent
- [x] KEIN QR-Bill (nur bei Rechnungen)
- [x] Text-Templates: quote_intro_text, quote_footer_text

### 2.5 Sales Pipeline Integration ✅
- [x] "Angebot" Button in OpportunityCard (nur bei existing_customer_id)
- [x] Navigation: `/angebote?customerId=xxx&opportunityId=yyy`
- [x] KanbanColumn.tsx + Sales.tsx Handler

---

## PHASE 3: Rechnungs-Upgrade 💰 (Priorität: HOCH)

### 3.1 Rechnungen bearbeiten ✅ ERLEDIGT

**Implementiert:**
- `src/utils/invoiceUtils.ts` - Utility mit `canEditInvoice()`, `shouldWarnOnEdit()`, `getEditWarningMessage()`
- `InvoiceTable.tsx` - Bearbeiten-Button (disabled bei 'bezahlt')
- `InvoiceForm.tsx` - Edit-Mode via `existingInvoice` + `existingItems` Props
- `Rechnungen.tsx` - Update-Logik mit sicherer Item-Synchronisation (DELETE + INSERT)
- Warnung bei 'versendet'/'überfällig' Status

**Checkliste:**
- [x] [InvoiceForm.tsx](src/components/InvoiceForm.tsx) - Edit Mode aktivieren
- [x] Bearbeiten-Button in [Rechnungen.tsx](src/pages/Rechnungen.tsx) Table
- [x] Validierung: Alle Stati außer 'bezahlt' editierbar (entwurf, versendet, überfällig)
- [x] Toast Notification bei Versuch, bezahlte Rechnung zu bearbeiten
- [x] Warnung bei Edit von 'versendet' Rechnungen (bereits beim Kunden)

### 3.1b Offerten bearbeiten ✅ ERLEDIGT

**Analog zu Rechnungen implementiert:**
- `src/utils/quoteUtils.ts` - Utility mit `canEditQuote()` (sperrt nur 'bestaetigt')
- `QuoteTable.tsx` - Bearbeiten-Button (disabled bei 'bestaetigt')
- `QuoteForm.tsx` - Edit-Mode via `existingQuote` + `existingItems` Props
- `Angebote.tsx` - Update-Logik mit sicherer Item-Synchronisation
- Warnung bei 'versendet'/'akzeptiert'/'abgelehnt' Status

### 3.2 PDF-Vorschau Modal

**UI-Konzept:**
```tsx
<Modal size="xl" title="PDF-Vorschau">
  <iframe src={pdfBlobUrl} width="100%" height="600px" />
  <div className="modal-footer">
    <Button variant="secondary" onClick={handleClose}>Schliessen</Button>
    <Button variant="primary" onClick={handleDownload}>
      <Download /> Herunterladen
    </Button>
  </div>
</Modal>
```

**Checkliste:**
- [ ] PDF-Vorschau Modal-Component erstellen
- [ ] Blob URL generieren (ohne Download-Trigger)
- [ ] Button "PDF anzeigen" in InvoiceTable
- [ ] Modal schliessen & Download-Funktion

### 3.3 Zusätzliche Felder

**Database Update:**
```sql
ALTER TABLE invoices
  ADD COLUMN title text, -- Auftragstitel
  ADD COLUMN introduction_text text, -- Einleitungstext
  ADD COLUMN footer_text text, -- Bemerkungen
  ADD COLUMN line_discount_enabled boolean DEFAULT false,
  ADD COLUMN total_discount_enabled boolean DEFAULT false;
```

**UI Update:**
```tsx
// InvoiceForm.tsx - Neue Felder mit Markdown Support
<input placeholder="Auftragstitel (optional)" />

{/* Markdown-Textareas mit Preview */}
<div className="markdown-field">
  <label>Einleitungstext (Markdown)</label>
  <textarea placeholder="**Fett**, *kursiv*, - Listen..." rows={3} />
  <small>Markdown wird im PDF formatiert dargestellt</small>
</div>

<div className="markdown-field">
  <label>Bemerkungen (Markdown)</label>
  <textarea placeholder="Zahlbar innert 30 Tagen..." rows={3} />
</div>

// Rabatt-Sektion
<Checkbox checked={lineDiscount} onChange={...}>
  Zeilenrabatte aktivieren
</Checkbox>
<Checkbox checked={totalDiscount} onChange={...}>
  Totalrabatt aktivieren
</Checkbox>
```

**Checkliste:**
- [ ] Migration `20260128_invoice_fields.sql`
- [ ] Types in [lib/supabase.ts](src/lib/supabase.ts) erweitern
- [ ] Form-Felder in [InvoiceForm.tsx](src/components/InvoiceForm.tsx)
- [ ] Markdown-Parser installieren: `npm install marked` oder `react-markdown`
- [ ] PDF-Template in [pdfGenerator.ts](src/utils/pdfGenerator.ts) anpassen
- [ ] Markdown → HTML/PDF-Rendering (fett, kursiv, Listen)
- [ ] QuoteForm analog anpassen (Offerten nutzen gleiches Pattern)

### 3.4 Zeiterfassungs-Import

**Feature:** In InvoiceForm Button "Offene Zeiten laden".

**Logic:**
```typescript
const loadOpenTimeEntries = async (customerId?: string, projectId?: string) => {
  const { data } = await supabase
    .from('time_entries')
    .select('*, projects(*)')
    .eq('billable', true) // NUR verrechenbare
    .is('invoice_id', null) // Noch nicht verrechnet
    .eq('customer_id', customerId) // Optional filtern
    .order('date', { ascending: true });

  // Gruppiere nach Tätigkeit/Projekt
  const items = groupTimeEntries(data);

  // Füge als Invoice Items hinzu
  setInvoiceItems(prev => [...prev, ...items]);
};

const groupTimeEntries = (entries: TimeEntry[]): InvoiceItem[] => {
  // WICHTIG: Gruppierung pro Kalenderwoche im Monat
  // Beispiel: "KW 3 (Jan 2026): Programmierung - 12.5h à CHF 120.-"

  const grouped = entries.reduce((acc, entry) => {
    const week = getWeekNumber(entry.date);
    const month = format(entry.date, 'MMM yyyy');
    const key = `KW${week}_${month}_${entry.description}`;

    if (!acc[key]) {
      acc[key] = {
        description: `KW ${week} (${month}): ${entry.description}`,
        quantity: 0,
        unit: 'Stunden',
        unit_price: 120, // TODO: Aus Projekt oder Product holen
        total: 0
      };
    }
    acc[key].quantity += entry.hours;
    acc[key].total = acc[key].quantity * acc[key].unit_price;
    return acc;
  }, {});

  return Object.values(grouped);
};
```

**Nach Rechnung erstellt:** time_entries.invoice_id setzen (Link).

**Checkliste:**
- [ ] Button "Zeiten laden" in InvoiceForm
- [ ] Modal: Zeiteinträge auswählen (Checkboxes) - NUR verrechenbare Zeiten anzeigen
- [ ] Gruppierungs-Logic: Pro Kalenderwoche im Monat
- [ ] date-fns: `getWeek()` und `format()` für KW-Berechnung
- [ ] Nach Save: time_entries.invoice_id updaten (Link zur Rechnung)
- [ ] Validierung: Zeiten dürfen nicht doppelt verrechnet werden (invoice_id IS NULL check)
- [ ] UI: Summe der Stunden pro KW prominent anzeigen

### 3.5 Rabatte (Zeilen + Total)

**Zeilenrabatt:**
```typescript
interface InvoiceItem {
  // ...
  unit_price: number;
  discount_percent: number; // NEU
  subtotal: number; // unit_price * quantity
  discount_amount: number; // subtotal * (discount_percent / 100)
  total: number; // subtotal - discount_amount
}
```

**Totalrabatt:**
```typescript
interface Invoice {
  // ...
  subtotal: number; // Summe aller Item-Totals
  total_discount_percent: number; // NEU
  total_discount_amount: number; // subtotal * (percent / 100)
  vat_amount: number; // (subtotal - total_discount) * vat_rate
  total_amount: number; // subtotal - total_discount + vat
}
```

**Checkliste:**
- [ ] Database: discount_percent in invoice_items
- [ ] Database: total_discount_percent in invoices
- [ ] InvoiceForm: Rabatt-Input pro Zeile (conditional)
- [ ] InvoiceForm: Totalrabatt-Input (conditional)
- [ ] Berechnung: Subtotal → Rabatt → MwSt → Total
- [ ] PDF: Rabatte anzeigen (Zeilen + Subtotal-Abzug)

### 3.6 Textvorlagen ✅ ERLEDIGT

**Architektur-Entscheidung:** Spalten direkt in `companies` Tabelle (statt separater text_templates Tabelle).
- Einfacher: 1:1 Beziehung (jede Firma hat genau ein Template-Set)
- RLS bereits vorhanden
- Keine zusätzlichen JOINs nötig

**Database (implementiert):**
```sql
ALTER TABLE companies
ADD COLUMN invoice_intro_text TEXT,
ADD COLUMN invoice_footer_text TEXT,
ADD COLUMN quote_intro_text TEXT,
ADD COLUMN quote_footer_text TEXT;
```

**Migrations:**
- `20260130_text_templates.sql` - Template-Spalten hinzufügen
- `20260130_update_rpc_text_templates.sql` - RPC-Funktion aktualisieren
- `20260130_fix_invoice_number_constraint.sql` - Invoice-Nummer pro Company eindeutig

**Checkliste:**
- [x] Migration für Template-Spalten in companies
- [x] RPC-Funktion `get_user_companies()` erweitert um Template-Felder
- [x] CompanyContext Mapping aktualisiert
- [x] Settings Tab "Textvorlagen" UI (4 Textareas)
- [x] Speichern-Logic mit direktem DB-Update + Rückgabe der Daten
- [x] PDF-Generator: `drawIntroText()` und `drawFooterText()` Funktionen
- [x] Dynamische Y-Koordinaten für flexible Textlängen
- [x] Fresh Company-Daten vor PDF-Generierung (garantiert aktuelle Templates)
- [x] Invoice-Nummer automatisch hochzählen pro Jahr und Company
- [x] UNIQUE constraint auf (company_id, invoice_number) statt global
- [ ] QuoteForm: Analog (wenn Offerten-Modul implementiert wird)
- [ ] Optional: Live-Preview der Markdown-Formatierung

### 3.7 Swiss QR-Bill - Fixes & Validierung

**Problem:** QR-Bill Implementation ist teilweise vorhanden, aber Validierung fehlt.

**Aktueller Status (aus Codebase-Analyse):**
- [swissqr.ts](src/utils/swissqr.ts) existiert
- [pdfGenerator.ts](src/utils/pdfGenerator.ts) existiert
- Dokumentation: SWISSQR_IMPLEMENTATION_V2.md vorhanden

**Fehlende/Unvollständige Features:**
1. Latin-1 Validierung der Eingaben (Namen, Adressen)
2. QR-IBAN vs. IBAN Unterscheidung im UI
3. Fehlerhandling bei unvollständigen Daten (bereits in 1.5 adressiert)
4. QR-Code Positionierung auf PDF prüfen

**Checkliste:**
- [ ] [swissqr.ts](src/utils/swissqr.ts) reviewen - Latin-1 Character Check
- [ ] Validation-Funktion: validateSwissQRData()
- [ ] Company Settings: QR-IBAN Feld prominenter machen
- [ ] InvoiceForm: Warnung wenn QR-IBAN fehlt
- [ ] PDF: QR-Code Position & Grösse testen (SPS 2025 Standard)
- [ ] Test mit beiden: IBAN & QR-IBAN
- [ ] Referenz-Nummer korrekt generieren (Rechnungsnummer)

### 3.8 Buchungen - Beleg-Upload & Kontenplan

**Feature:** PDF/JPEG/PNG Belege an Buchungen anhängen.

**Database:**
```sql
CREATE TABLE transaction_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  file_url text NOT NULL, -- Supabase Storage URL
  file_name text NOT NULL,
  file_type text NOT NULL, -- application/pdf, image/jpeg, image/png
  file_size int, -- Bytes
  uploaded_at timestamptz DEFAULT now()
);

-- RLS
CREATE POLICY "Tenant Isolation via Parent" ON transaction_attachments
  FOR ALL USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE company_id = get_user_company_id()
    )
  );

-- Supabase Storage Bucket
-- Name: "transaction-receipts"
-- Public: false (nur mit RLS)
```

**Upload UI:**
```tsx
// TransactionForm.tsx
<div className="upload-section">
  <label>Beleg hochladen</label>
  <input
    type="file"
    accept="application/pdf,image/jpeg,image/png"
    onChange={handleFileUpload}
  />
  {uploadedFile && (
    <div className="file-preview">
      <FileIcon type={uploadedFile.type} />
      <span>{uploadedFile.name}</span>
      <Button variant="ghost" onClick={removeFile}>×</Button>
    </div>
  )}
</div>
```

**Kontenplan (Flat Structure):**
```sql
CREATE TABLE expense_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  name text NOT NULL, -- z.B. "Marketing", "Büromaterial", "Reisekosten"
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS
CREATE POLICY "Tenant Isolation" ON expense_accounts
  FOR ALL USING (company_id = get_user_company_id());
```

**Settings UI:**
```tsx
// Settings > Kontenplan Tab (neu)
<TabsContent value="kontenplan">
  <Card>
    <Card.Header title="Aufwandskonten" />
    <Card.Content>
      <input placeholder="Neues Konto hinzufügen" />
      <Button onClick={addAccount}>+</Button>
      <ul className="accounts-list">
        {accounts.map(acc => (
          <li>
            {acc.name}
            <Button variant="ghost" onClick={() => deleteAccount(acc.id)}>×</Button>
          </li>
        ))}
      </ul>
    </Card.Content>
  </Card>
</TabsContent>
```

**Checkliste:**
- [ ] Migration `20260128_transaction_attachments.sql`
- [ ] Migration `20260128_expense_accounts.sql`
- [ ] Supabase Storage Bucket "transaction-receipts" erstellen
- [ ] Upload-Logic in [TransactionForm.tsx](src/components/TransactionForm.tsx)
- [ ] File Validation (max 10MB, nur PDF/JPEG/PNG)
- [ ] Anzeige der hochgeladenen Datei (Link zum Öffnen)
- [ ] Settings Tab "Kontenplan" für expense_accounts
- [ ] TransactionForm: Dropdown mit expense_accounts statt freiem Text

---

## PHASE 4: Zeiterfassung & Reporting ⏱️ (Priorität: MITTEL)

### 4.1 Inline-Input für Zeiteinträge

**Aktuell:** Modal für neuen Eintrag.

**Neu:** Inline-Form oberhalb der Tabelle (wie Notion/Airtable).

**UI-Konzept:**
```tsx
<div className="time-entry-quick-add">
  <div className="grid grid-cols-6 gap-2">
    <DatePicker value={date} />
    <Select options={customers} placeholder="Kunde" />
    <Select options={projects} placeholder="Projekt" />
    <Input type="number" placeholder="Stunden" step="0.25" />
    <Input placeholder="Beschreibung" />
    <div className="flex gap-2">
      <Select options={['Ja', 'Nein']} placeholder="Verrechenbar" />
      <Button variant="primary" onClick={handleQuickAdd}>+</Button>
    </div>
  </div>
</div>

<TimeEntryTable entries={entries} />
```

**Checkliste:**
- [ ] Inline-Form Component in [Zeiterfassung.tsx](src/pages/Zeiterfassung.tsx)
- [ ] handleQuickAdd() mit Validation
- [ ] Nach Add: Form leeren + Tabelle refreshen
- [ ] Optional: Enter-Taste → Submit

### 4.2 Tabellen-Erweiterungen

**Neue Spalten:**
```tsx
<table>
  <thead>
    <tr>
      <th>Datum</th>
      <th>KW</th> {/* Neu: Kalenderwoche */}
      <th>Kunde</th> {/* Neu: Name statt ID */}
      <th>Projekt</th> {/* Neu: Name statt ID */}
      <th>Beschreibung</th>
      <th>Stunden</th>
      <th>Verrechenbar</th> {/* Status Badge */}
      <th>Aktionen</th>
    </tr>
  </thead>
</table>
```

**Sortierung & Gruppierung:**
```typescript
const groupedEntries = entries.reduce((acc, entry) => {
  const week = getWeekNumber(entry.date); // KW berechnen
  if (!acc[week]) acc[week] = [];
  acc[week].push(entry);
  return acc;
}, {});

// Render: Gruppenkopf pro KW
{Object.entries(groupedEntries).map(([week, entries]) => (
  <>
    <tr className="group-header">
      <td colSpan={8}>Kalenderwoche {week}</td>
    </tr>
    {entries.map(entry => <TimeEntryRow {...entry} />)}
  </>
))}
```

**Toggle Date/KW Gruppierung:**
```tsx
<div className="time-entry-header">
  <PageHeader title="Zeiterfassung" />
  <ToggleGroup type="single" value={grouping} onValueChange={setGrouping}>
    <ToggleGroupItem value="date">Nach Datum</ToggleGroupItem>
    <ToggleGroupItem value="week">Nach KW</ToggleGroupItem>
  </ToggleGroup>
</div>

// Conditional Rendering
{grouping === 'week' ? (
  <TimeEntryTableGroupedByWeek entries={entries} />
) : (
  <TimeEntryTableByDate entries={entries} />
)}
```

**Checkliste:**
- [ ] Spalten Kunde & Projekt in Table hinzufügen
- [ ] JOIN-Query: .select('*, customers(name), projects(name)')
- [ ] KW-Spalte berechnen (date-fns: getWeek())
- [ ] Toggle-Komponente für Date/KW Umschaltung
- [ ] Gruppierung nach KW implementieren (groupedEntries)
- [ ] Sortierung nach Datum als Alternative
- [ ] CSS: Gruppen-Header stylen
- [ ] User-Präferenz speichern (localStorage)

### 4.3 Pflichtfeld "Verrechenbar"

**Problem:** Aktuell optional → Muss explizit gesetzt werden.

**Lösung:**
```typescript
// Zeiterfassungs-Form
<div className="form-group required">
  <label>Verrechenbar *</label>
  <div className="flex gap-4">
    <label>
      <input type="radio" name="billable" value="true" required />
      Ja
    </label>
    <label>
      <input type="radio" name="billable" value="false" required />
      Nein
    </label>
  </div>
</div>
```

**Validation:**
```typescript
if (billable === null || billable === undefined) {
  toast.error('Bitte "Verrechenbar" auswählen');
  return;
}
```

**Checkliste:**
- [ ] Radio-Group in Inline-Form (ersetze Dropdown)
- [ ] Validation vor Submit
- [ ] Default-Wert: Nein (sicherer als Ja)

### 4.4 Reporting-Submodul

**Neuer Tab/Section in Zeiterfassung-Page:**
```tsx
<Tabs defaultValue="erfassung">
  <TabsList>
    <TabsTrigger value="erfassung">Zeiterfassung</TabsTrigger>
    <TabsTrigger value="reporting">Reporting</TabsTrigger>
  </TabsList>

  <TabsContent value="erfassung">
    {/* Bestehende Tabelle */}
  </TabsContent>

  <TabsContent value="reporting">
    <TimeReporting />
  </TabsContent>
</Tabs>
```

**Filter:**
```tsx
<div className="filters">
  <DateRangePicker value={dateRange} onChange={...} />
  <Select options={users} placeholder="Nutzer (Alle)" />
  <Select options={customers} placeholder="Kunde (Alle)" />
  <Select options={projects} placeholder="Projekt (Alle)" />
  <Button onClick={applyFilters}>Anwenden</Button>
</div>
```

**KPIs (Bento-Style Cards):**
```tsx
<div className="grid grid-cols-4 gap-4">
  <KPICard
    label="Anzahl Leistungen"
    value={entries.length}
    icon={<FileText />}
  />
  <KPICard
    label="Total Stunden"
    value={`${totalHours.toFixed(2)} h`}
    icon={<Clock />}
  />
  <KPICard
    label="Verrechenbarkeits-Quote"
    value={`${billablePercent.toFixed(0)}%`}
    trend={billablePercent >= 70 ? 'up' : 'down'}
    icon={<TrendingUp />}
  />
  <KPICard
    label="Effektiver Stundenlohn"
    value={`CHF ${effectiveRate.toFixed(2)}`}
    icon={<DollarSign />}
  />
</div>
```

**Diagramm:**
```tsx
<BarChart
  data={[
    { category: 'Verrechenbar', hours: billableHours, fill: '#16a34a' },
    { category: 'Nicht verrechenbar', hours: nonBillableHours, fill: '#dc2626' }
  ]}
  xAxis="category"
  yAxis="hours"
/>
```

**WICHTIG:** Kein separater Export nötig - Zeiten werden direkt aus dem Rechnungsmodul importiert.

**Checkliste:**
- [ ] Tabs in [Zeiterfassung.tsx](src/pages/Zeiterfassung.tsx)
- [ ] [TimeReporting.tsx](src/components/TimeReporting.tsx) Component
- [ ] Filter-Logic mit State Management
- [ ] KPI-Berechnung:
  - [ ] Anzahl Leistungen (entries.length)
  - [ ] Total Stunden (sum of hours)
  - [ ] Verrechenbarkeits-Quote (billable / total * 100)
  - [ ] Effektiver Stundenlohn (total_revenue / billable_hours) - aus verknüpften Rechnungen
- [ ] BarChart mit Recharts Library (verrechenbar vs. nicht-verrechenbar)
- [ ] ❌ KEIN Export-Button (nicht benötigt)

---

## PHASE 5: UI/UX & Globale Filter 🎨 (Priorität: NIEDRIG)

### 5.1 Globale Filter für Listen

**Pattern für alle List-Pages:**
```tsx
<div className="page-header">
  <PageHeader title="Kunden" />
  <div className="filter-tabs">
    <Button
      variant={filter === 'alle' ? 'primary' : 'ghost'}
      onClick={() => setFilter('alle')}
    >
      Alle
    </Button>
    <Button
      variant={filter === 'aktiv' ? 'primary' : 'ghost'}
      onClick={() => setFilter('aktiv')}
    >
      Aktiv
    </Button>
    <Button
      variant={filter === 'archiviert' ? 'primary' : 'ghost'}
      onClick={() => setFilter('archiviert')}
    >
      Archiviert
    </Button>
  </div>
</div>
```

**Database:** Alle relevanten Tabellen brauchen `is_active boolean DEFAULT true`.

**Wiederherstellen-Funktion:**
```tsx
// In CustomerTable / ProjectTable / ProductTable
<Button
  variant="ghost"
  onClick={() => restoreItem(item.id)}
  disabled={item.is_active}
>
  Wiederherstellen
</Button>

const restoreItem = async (id: string) => {
  await supabase
    .from('customers') // oder projects, products
    .update({ is_active: true })
    .eq('id', id);

  toast.success('Erfolgreich wiederhergestellt');
  fetchData(); // Refresh
};
```

**Checkliste:**
- [ ] Migration: `is_active` in customers, projects (products hat bereits!)
- [ ] Migration: time_entries braucht KEIN is_active (Filter: verrechenbar/nicht)
- [ ] Filter-Tabs in:
  - [ ] [Kunden.tsx](src/pages/Kunden.tsx) - Alle/Aktiv/Archiviert
  - [ ] [Projekte.tsx](src/pages/Projekte.tsx) - Alle/Aktiv/Archiviert
  - [ ] [Produkte.tsx](src/pages/Produkte.tsx) (existiert schon!)
  - [ ] [Zeiterfassung.tsx](src/pages/Zeiterfassung.tsx) - Verrechenbar/Nicht-verrechenbar (kein Archiv)
- [ ] Archivieren-Action in Tables (statt hartem Löschen)
- [ ] Wiederherstellen-Button in Archiv-Ansicht
- [ ] Confirm-Dialog für Archivieren ("Wirklich archivieren?")

### 5.2 Kundenübersicht - Erweiterungen

**Offener Rechnungsbetrag:**
```sql
-- View oder berechnete Spalte
SELECT
  c.id,
  c.name,
  COALESCE(SUM(i.total_amount), 0) as open_invoice_amount
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
WHERE i.status IN ('versendet', 'überfällig')
GROUP BY c.id;
```

**Suchfunktion:**
```tsx
<Input
  placeholder="Kunde suchen..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>

// Filter-Logic
const filteredCustomers = customers.filter(c =>
  c.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

**Kontakte-Submodul (Eigene Page):**
```sql
CREATE TABLE customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text, -- z.B. "Geschäftsführer"
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
CREATE POLICY "Tenant Isolation via Parent" ON customer_contacts
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE company_id = get_user_company_id())
  );
```

**UI:** Eigene Page `/kunden/:id/kontakte`

```tsx
// Kunden.tsx Table - Link zu Kontakte-Page
<td>
  <Link to={`/kunden/${customer.id}/kontakte`}>
    <Badge>{customer.contacts_count} Kontakte</Badge>
  </Link>
</td>

// KundenKontakte.tsx - Neue Page
<PageHeader title={`Kontakte - ${customer.name}`} />
<ContactTable contacts={contacts} />
<ContactForm customerId={customer.id} />
```

**Checkliste:**
- [ ] Query für offene Rechnungen in [Kunden.tsx](src/pages/Kunden.tsx)
- [ ] Spalte "Offener Betrag" in CustomerTable
- [ ] Suchfeld implementieren
- [ ] Migration `20260128_customer_contacts.sql` mit RLS
- [ ] Neue Page [KundenKontakte.tsx](src/pages/KundenKontakte.tsx)
- [ ] Route /kunden/:id/kontakte in [App.tsx](src/App.tsx)
- [ ] CRUD für Kontakte (ContactForm + ContactTable)
- [ ] "Zurück zu Kunden" Breadcrumb

### 5.3 Projektübersicht - Offene Stunden

**Query:**
```sql
SELECT
  p.id,
  p.name,
  COALESCE(SUM(te.hours), 0) as open_hours
FROM projects p
LEFT JOIN time_entries te ON p.id = te.project_id
WHERE te.billable = true AND te.invoice_id IS NULL
GROUP BY p.id;
```

**UI:**
```tsx
<td>
  {project.open_hours > 0 && (
    <Badge variant="warning">
      {project.open_hours}h offen
    </Badge>
  )}
</td>
```

**Checkliste:**
- [ ] Query mit JOIN in [Projekte.tsx](src/pages/Projekte.tsx)
- [ ] Spalte "Offene Stunden" in Table
- [ ] Optional: Link zu Zeiterfassung mit Filter

### 5.4 Dashboard - Jahresansicht

**Jahr-Dropdown (nicht Toggle):**
```tsx
<div className="dashboard-header">
  <PageHeader title="Dashboard" />
  <div className="flex gap-4 items-center">
    <Select value={selectedYear} onValueChange={setSelectedYear}>
      <SelectItem value="2024">2024</SelectItem>
      <SelectItem value="2025">2025</SelectItem>
      <SelectItem value="2026">2026</SelectItem>
    </Select>
    <ToggleGroup type="single" value={view} onValueChange={setView}>
      <ToggleGroupItem value="month">Monat</ToggleGroupItem>
      <ToggleGroupItem value="year">Jahr</ToggleGroupItem>
    </ToggleGroup>
  </div>
</div>
```

**Analytics Hook Anpassung:**
```typescript
// useAnalytics.ts
const aggregateByMonth = (invoices: Invoice[], year: number) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return months.map(month => ({
    month: format(new Date(year, month - 1), 'MMM'),
    income: invoices
      .filter(i => getMonth(i.paid_at) === month && getYear(i.paid_at) === year)
      .reduce((sum, i) => sum + i.total_amount, 0)
  }));
};
```

**Checkliste:**
- [ ] Jahr-Dropdown in [Dashboard.tsx](src/pages/Dashboard.tsx) (2024-2026, dynamisch)
- [ ] Toggle Monat/Jahr View
- [ ] useAnalytics: Jahres-Aggregation (12 Monate)
- [ ] Chart X-Achse: Monate (Jan, Feb, Mär...)
- [ ] KPI-Cards: Jahres-Totale für gewähltes Jahr
- [ ] Datum-Range automatisch setzen (z.B. Jahr 2025 → 01.01. - 31.12.)
- [ ] Default: Aktuelles Jahr

### 5.5 Design Polish

**Farb-System Update:**
```javascript
// tailwind.config.js
colors: {
  success: {
    light: '#d1fae5', // Pastell Grün
    DEFAULT: '#10b981', // Weniger gesättigt
    dark: '#059669'
  },
  warning: {
    light: '#fef3c7', // Pastell Gelb
    DEFAULT: '#f59e0b',
    dark: '#d97706'
  },
  danger: {
    light: '#fee2e2', // Pastell Rot
    DEFAULT: '#ef4444', // Weniger Neon
    dark: '#dc2626'
  }
}
```

**Typography:**
```css
/* index.css */
body {
  font-family: 'Inter', sans-serif;
  font-size: 15px; /* Etwas grösser */
  line-height: 1.6; /* Luftiger */
}

h1, h2, h3 {
  letter-spacing: -0.02em; /* Leicht enger */
}

.card {
  padding: 24px; /* Mehr Whitespace */
}
```

**Button Spacing:**
```css
.btn {
  padding: 10px 20px; /* Lockerer */
  gap: 8px; /* Icon-Text Spacing */
}
```

**Fokus:** Farben entsättigen + Mehr Whitespace (User-Wunsch)

**Checkliste:**
- [ ] Farben in [tailwind.config.js](tailwind.config.js) entsättigen:
  - [ ] success: Pastell-Grün statt Neon
  - [ ] warning: Gedämpftes Gelb/Amber
  - [ ] danger: Weiches Rot statt grell
  - [ ] Badges weniger gesättigt
- [ ] Whitespace in [index.css](src/index.css) erhöhen:
  - [ ] .card padding: 20px → 24px
  - [ ] .form-group margin-bottom: 16px → 20px
  - [ ] Table row padding: 12px → 16px
  - [ ] Button padding: 8px 16px → 10px 20px
- [ ] ❌ NICHT ändern: Schriftgrösse (bleibt 14px body)
- [ ] ❌ NICHT ändern: Schatten (bereits subtil)
- [ ] Testen: Alle Pages durchgehen, Look & Feel prüfen

---

## Database Migration Summary

**Migrations to Create:**
1. `20260128_multi_company_schema.sql` - user_companies Junction Table + profiles.last_active_company_id
2. `20260128_quotes_module.sql` - Offerten-Tabellen (quotes + quote_items)
3. `20260128_invoice_fields.sql` - Zusatzfelder für Rechnungen (title, intro, footer, discounts, markdown)
4. `20260128_text_templates.sql` - Textvorlagen (eine pro Typ & Firma)
5. `20260128_customer_contacts.sql` - Kontakte-Modul mit RLS
6. `20260128_is_active_flags.sql` - Archivierungs-Flags (customers, projects)
7. `20260128_transaction_attachments.sql` - Beleg-Upload für Buchungen
8. `20260128_expense_accounts.sql` - Kontenplan (flat structure)

**Migration Workflow:**
```bash
# Lokal testen
psql -h localhost -U postgres -d crm_dev -f supabase/migrations/20260128_*.sql

# Auf Supabase deployen
supabase db push
```

---

## Testing Checklist (End-to-End)

### Phase 1: Core & Navigation
- [ ] Login mit User, der 2+ Firmen hat (oder manuell user_companies erstellen)
- [ ] Company Switcher öffnen, Firma wechseln → Page Reload
- [ ] Daten werden korrekt gefiltert (andere Firma sichtbar)
- [ ] Settings NICHT mehr in Sidebar
- [ ] Settings über User-Menu erreichbar
- [ ] Settings-Tabs funktionieren:
  - [ ] Firmenprofil: Logo hochladen, IBAN speichern
  - [ ] Benutzerprofil: Name ändern, Passwort ändern
  - [ ] Textvorlagen: Texte speichern & laden
  - [ ] Pipeline: Stages verwalten (existing)
- [ ] Rechnung erstellen ohne Strasse → Validation Error anzeigen (Toast)

### Phase 2: Offerten-Modul
- [ ] Offerte erstellen mit Produkten (aus Katalog)
- [ ] Offerte aus Opportunity erstellen (Sales Pipeline)
- [ ] Status ändern: offen → versendet → akzeptiert
- [ ] Überfällig automatisch (valid_until < heute)
- [ ] PDF generieren mit Logo & Markdown-Texten
- [ ] Offerte als Rechnung übernehmen → Modal öffnet, Items editierbar
- [ ] Sidebar zeigt "Offerten" Link

### Phase 3: Rechnungs-Upgrade
- [ ] Rechnung (Entwurf) bearbeiten → Funktioniert
- [ ] Rechnung (Versendet) bearbeiten → Funktioniert
- [ ] Bezahlte Rechnung bearbeiten → Error Toast
- [ ] PDF-Vorschau öffnen in Modal
- [ ] Markdown in Einleitung & Fusstext wird formatiert dargestellt
- [ ] Zeiteinträge in Rechnung laden:
  - [ ] Modal zeigt nur verrechenbare Zeiten
  - [ ] Gruppierung nach KW (z.B. "KW 3 (Jan 2026): 12.5h")
  - [ ] Nach Import: time_entries.invoice_id gesetzt
- [ ] Zeilenrabatt berechnen (separate Zeile im PDF)
- [ ] Totalrabatt berechnen (separate Zeile im PDF)
- [ ] Textvorlage laden Button → füllt Felder
- [ ] QR-Bill auf PDF korrekt positioniert
- [ ] Buchung: PDF/JPEG hochladen → Anzeige funktioniert
- [ ] Kontenplan in Settings verwalten

### Phase 4: Zeiterfassung & Reporting
- [ ] Zeiteintrag inline hinzufügen (ohne Modal)
- [ ] Verrechenbar-Pflicht: Submit ohne Auswahl → Error Toast
- [ ] Toggle Date/KW Ansicht umschalten
- [ ] Tabelle nach KW gruppiert anzeigen (Gruppenkopf)
- [ ] Spalten Kunde & Projekt zeigen Namen (nicht IDs)
- [ ] Reporting Tab:
  - [ ] Filter anwenden (Zeitraum, Kunde, Projekt)
  - [ ] KPIs korrekt berechnet (Anzahl, Stunden, Quote, Stundenlohn)
  - [ ] Diagramm zeigt verrechenbar vs. nicht-verrechenbar
- [ ] KEIN Export-Button (nicht nötig)

### Phase 5: UI/UX & Filter
- [ ] Kunde archivieren → Filter "Archiviert" zeigt
- [ ] Kunde wiederherstellen → In "Aktiv" sichtbar
- [ ] Kundensuche filtert Liste (Name)
- [ ] Kunde anklicken → /kunden/:id/kontakte Page
- [ ] Kontakt hinzufügen & anzeigen
- [ ] Projekt zeigt "Offene Stunden" Badge
- [ ] Dashboard Jahr-Dropdown (2024, 2025, 2026)
- [ ] Dashboard Toggle Monat/Jahr → Chart ändert sich
- [ ] Design: Farben weniger gesättigt (Pastell)
- [ ] Design: Mehr Whitespace (Cards, Forms, Tables)

---

## Current Focus

**Completed:**
- Phase 1.1-1.6 - Multi-Company Support + Settings + Validierung ✅
- Phase 2 - Offerten-Modul komplett ✅
- Phase 3.1 - Rechnungen bearbeiten ✅
- Phase 3.1b - Offerten bearbeiten ✅
- Phase 3.6 - Textvorlagen ✅

**Next:** Phase 3.2 - PDF-Vorschau Modal
**Alt:** Phase 3.4 - Zeiterfassungs-Import (KW-Gruppierung in Rechnung)

---

**Version:** 1.3
**Aktualisiert:** 2026-01-30
**Status:** Phase 3.1 (Bearbeitung) abgeschlossen → Weiter mit Phase 3.2 oder 3.4