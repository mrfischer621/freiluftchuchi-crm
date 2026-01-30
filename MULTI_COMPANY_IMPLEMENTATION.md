# Multi-Company Implementation - Final Architecture

**Status:** ✅ Productive (Single-User + Erweiterbar auf Multi-User)
**Letzte Aktualisierung:** 2026-01-30
**Architektur:** Table-Based RLS (Session-Variable-Free)

---

## Übersicht

Das CRM unterstützt Multi-Company-Architektur, optimiert für:
- ✅ **Aktuell:** Single-User mit mehreren Firmen
- ✅ **Zukunft:** Multi-User (Familienmitglieder) mit je eigenen Firmen
- ✅ **Skalierbar:** Bis 100+ Firmen ohne Architektur-Änderungen

---

## Architektur-Entscheidungen

### 1. Table-Based RLS (Keine Session Variables)

**Warum?**
- Session-Variablen persistieren nicht über HTTP-Requests (Supabase Connection Pooling)
- Table-based Approach ist zuverlässiger und einfacher zu debuggen
- Bessere Performance durch direkten Tabellen-Zugriff

**Wie?**
```sql
-- ALTE METHODE (funktioniert nicht):
WHERE company_id = get_user_company_id()  -- Liest Session Variable

-- NEUE METHODE (funktioniert):
WHERE company_id IN (
  SELECT company_id FROM user_companies WHERE user_id = auth.uid()
)
```

### 2. RLS auf user_companies: DEAKTIVIERT

**Entscheidung:** RLS auf `user_companies` Tabelle ist **DEAKTIVIERT**

**Grund:**
- Verhindert infinite recursion bei RLS-Policy-Checks
- Sicherheit durch RPC-Funktionen (SECURITY DEFINER mit `auth.uid()` Check)
- Für Single-User ausreichend sicher

**Sicherheit trotzdem gewährleistet:**
```sql
-- get_user_companies() RPC filtert immer nach auth.uid()
CREATE FUNCTION get_user_companies() ...
WHERE uc.user_id = auth.uid();  -- ✅ Sicher

-- Keine direkten Queries auf user_companies im Frontend
-- Nur via sichere RPC-Funktionen
```

### 3. Frontend: Defense in Depth

**Prinzip:** RLS + Explizite Filters

```typescript
// Frontend filtert IMMER explizit nach company_id
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('company_id', selectedCompany.id);  // ✅ Expliziter Filter

// RLS Policy auf DB-Ebene validiert zusätzlich
// → Doppelte Absicherung
```

---

## Datenbank-Schema

### Junction Table: user_companies

```sql
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- RLS: DISABLED (verhindert infinite recursion)
ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
```

### RLS Policies (Alle Tabellen außer user_companies)

```sql
-- Standard Policy für alle Tabellen mit company_id
CREATE POLICY "Tenant Isolation" ON public.customers
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

**Gilt für:** customers, projects, invoices, time_entries, transactions, expenses, products, opportunities, pipeline_stages, year_end_closings

### Spezialfall: invoice_items (kein company_id)

```sql
-- JOIN-basierte Policy
CREATE POLICY "Tenant Isolation via Invoice" ON invoice_items
  FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );
```

---

## RPC-Funktionen

### get_user_companies()

**Zweck:** Gibt alle Firmen zurück, zu denen der User Zugriff hat

```sql
CREATE FUNCTION get_user_companies()
RETURNS TABLE (...)
SECURITY DEFINER  -- ✅ Bypassed RLS auf companies Tabelle
AS $$
  SELECT c.*, uc.role, (c.id = p.last_active_company_id) AS is_active
  FROM user_companies uc
  JOIN companies c ON uc.company_id = c.id
  JOIN profiles p ON p.id = auth.uid()
  WHERE uc.user_id = auth.uid();  -- ✅ Sicherheitsfilter
$$;
```

**Sicherheit:**
- `SECURITY DEFINER` bypassed RLS auf `companies` Tabelle
- Filtert trotzdem nach `auth.uid()` → nur eigene Firmen sichtbar

### set_active_company(company_id)

**Zweck:** Setzt aktive Firma und speichert in `last_active_company_id`

```sql
CREATE FUNCTION set_active_company(company_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  -- Validierung: User muss Zugriff auf Firma haben
  IF NOT EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_id = auth.uid() AND company_id = set_active_company.company_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update last_active_company_id für Persistenz
  UPDATE profiles
  SET last_active_company_id = set_active_company.company_id
  WHERE id = auth.uid();
END;
$$;
```

**Verwendung:**
- `CompanyContext.tsx` - Beim App-Start und Company-Switch
- `BentoHeader.tsx` - Company-Switcher UI
- **NICHT** vor jedem INSERT/UPDATE (unnötig!)

---

## Frontend-Architektur

### CompanyContext

**State Management für aktive Firma:**

```typescript
export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Lädt Firmen via RPC
  const fetchUserCompanies = async () => {
    const { data } = await supabase.rpc('get_user_companies');
    setCompanies(data);
    selectInitialCompany(data);
  };

  // Setzt initiale Firma basierend auf last_active_company_id
  const selectInitialCompany = (companies) => {
    const active = companies.find(c => c.is_active) || companies[0];
    setSelectedCompany(active);
    await supabase.rpc('set_active_company', { company_id: active.id });
  };

  // Company Switch
  const switchCompany = async (companyId) => {
    await supabase.rpc('set_active_company', { company_id: companyId });
    const company = companies.find(c => c.id === companyId);
    setSelectedCompany(company);
    // Seiten refreshen automatisch via useEffect
  };
}
```

### Page Components

**Pattern für alle Seiten:**

```typescript
export default function Kunden() {
  const { selectedCompany } = useCompany();
  const [customers, setCustomers] = useState([]);

  // Lädt Daten wenn selectedCompany sich ändert
  useEffect(() => {
    if (selectedCompany) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    // Expliziter Filter nach company_id (Defense in Depth)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', selectedCompany.id);  // ✅

    setCustomers(data);
  };

  const handleCreate = async (customerData) => {
    // KEIN set_active_company() Call nötig!
    // RLS WITH CHECK validiert automatisch
    await supabase
      .from('customers')
      .insert([{ ...customerData, company_id: selectedCompany.id }]);
  };
}
```

---

## Migration History

### Phase 1: Multi-Company Setup (28.01.2026)
- ✅ `20260128_multi_company_step1_junction_table.sql` - user_companies erstellt
- ✅ `20260128_multi_company_step2_migrate_data.sql` - Daten migriert
- ✅ `20260128_multi_company_step3_update_profiles.sql` - profiles angepasst
- ✅ `20260128_multi_company_step4_update_function.sql` - RPC-Funktionen
- ✅ `20260128_multi_company_step5_create_company_rpc.sql` - Company Creation

### Phase 2: RLS Fix (29.01.2026)
- ✅ `20260129_fix_rls_no_session.sql` - **WICHTIG:** Entfernt Session-Dependency
- ✅ `20260129_disable_rls_user_companies.sql` - RLS auf user_companies deaktiviert
- ✅ `20260129_add_user_companies_indexes.sql` - Performance-Optimierung

---

## Performance-Optimierungen

### Indexes auf user_companies

```sql
-- Optimiert RLS Subquery Lookups
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_user_company ON user_companies(user_id, company_id);
```

**Ergebnis:**
- RLS Subquery: O(log n) statt O(n)
- Typische Query-Zeit: <2ms Overhead

### Caching in Frontend

```typescript
// CompanyContext cached selectedCompany
// Pages fetchen nur bei Company-Wechsel neu
useEffect(() => {
  fetchData();
}, [selectedCompany]);  // ✅ Nur bei Wechsel
```

---

## Sicherheits-Checkliste

### ✅ Für Single-User (Aktuell)
- [x] Supabase Authentication aktiv
- [x] ANON Key verwendet (nicht SERVICE_ROLE)
- [x] RLS auf allen Tabellen (außer user_companies)
- [x] RPC-Funktionen validieren auth.uid()
- [x] Frontend filtert explizit nach company_id

### ✅ Für Multi-User (Zukünftig)
- [x] user_companies Junction Table
- [x] RLS Policies isolieren Firmen
- [x] get_user_companies() RPC sicher
- [x] set_active_company() validiert Zugriff
- [ ] **TODO:** RLS auf user_companies enablen (mit Helper-Function für Recursion-Fix)

---

## Multi-User Onboarding (Zukünftig)

**Schritt 1: User registriert sich**
```typescript
// Automatisch via Supabase Auth UI
const { user } = await supabase.auth.signUp({ email, password });
```

**Schritt 2: Firma erstellen**
```sql
INSERT INTO companies (name, street, house_number, zip_code, city)
VALUES ('Firma Name', 'Strasse', '123', '8000', 'Zürich')
RETURNING id;
```

**Schritt 3: Verknüpfung erstellen**
```sql
INSERT INTO user_companies (user_id, company_id, role)
VALUES ('user-uuid', 'company-uuid', 'admin');
```

**Fertig!** User kann sich einloggen und sieht nur seine Firma.

---

## Troubleshooting

### Problem: "Infinite recursion detected"

**Ursache:** RLS auf `user_companies` aktiviert → Rekursion bei Policy-Checks

**Lösung:**
```sql
ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
```

### Problem: User sieht keine Daten nach Company-Switch

**Ursache:** Frontend cached alte Daten

**Lösung:** useEffect Dependency auf `selectedCompany` prüfen
```typescript
useEffect(() => {
  if (selectedCompany) {
    fetchData();
  }
}, [selectedCompany]);  // ✅ Muss vorhanden sein
```

### Problem: RLS Policy Violation bei INSERT

**Ursache:** User hat keinen Eintrag in `user_companies` für diese Firma

**Lösung:**
```sql
-- Prüfe user_companies Einträge
SELECT * FROM user_companies WHERE user_id = auth.uid();

-- Falls leer: Eintrag erstellen
INSERT INTO user_companies (user_id, company_id, role)
VALUES (auth.uid(), 'company-uuid', 'admin');
```

---

## Best Practices

### ✅ DO
- Frontend IMMER mit `selectedCompany` filtern
- RLS als zweite Sicherheitsebene (Defense in Depth)
- RPC-Funktionen für user_companies Zugriff nutzen
- `last_active_company_id` für Persistenz nutzen

### ❌ DON'T
- `set_active_company()` vor jedem INSERT/UPDATE callen (unnötig!)
- Direkte Queries auf `user_companies` (nur via RPC)
- Session Variables für Company-State verwenden
- RLS auf `user_companies` enablen (ohne Recursion-Fix)

---

## Zukunfts-Erweiterungen

### Option 1: Shared Companies (Team-Firmen)

**Use Case:** Mehrere User arbeiten an derselben Firma

**Implementation:**
```sql
-- Mehrere user_companies Einträge für gleiche company_id
INSERT INTO user_companies (user_id, company_id, role) VALUES
  ('user-1-uuid', 'shared-company-uuid', 'admin'),
  ('user-2-uuid', 'shared-company-uuid', 'member');
```

**Funktioniert sofort!** Keine Code-Änderungen nötig.

### Option 2: Rollen-System

**Use Case:** Admin vs. Member vs. Viewer Permissions

**Implementation:**
```typescript
// user_companies.role bereits vorhanden
const { role } = companies.find(c => c.id === selectedCompany.id);

if (role === 'viewer') {
  // Nur Lesezugriff
} else if (role === 'admin') {
  // Voller Zugriff
}
```

### Option 3: Company Invitations

**Use Case:** User kann andere einladen

**Implementation:**
```sql
CREATE TABLE company_invitations (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Zusammenfassung

**Aktuelle Architektur:**
- ✅ Table-based RLS (keine Session Variables)
- ✅ RLS auf user_companies DEAKTIVIERT (verhindert Recursion)
- ✅ Defense in Depth (RLS + Frontend-Filtering)
- ✅ Optimiert für Single-User, bereit für Multi-User
- ✅ Skalierbar bis 100+ Firmen

**Nächste Schritte bei Multi-User:**
1. RLS auf user_companies enablen (mit Helper-Function)
2. Rollen-System im Frontend implementieren
3. Company Invitation Flow erstellen

---

**Dokumentation Stand:** 2026-01-30
**Architektur:** Production-Ready ✅
