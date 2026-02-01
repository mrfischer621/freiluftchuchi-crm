# Roadmap V2: Refactoring & Finanz-Core

## 1. Quick Wins & UI-Fixes (Aufräumen)
Kleine Anpassungen, die das Nutzungserlebnis sofort verbessern und "Noise" entfernen.

- [ ] **1.1 Global UI Cleanup**
    - [ ] Sidebar: Doppelten Firmennamen rechts entfernen.
    - [ ] Header: Glocken-Icon (Notification) komplett entfernen.
    - [ ] Produkte: Schriftgrösse an den Rest der App angleichen.
- [ ] **1.2 Kunden-Management Fixes**
    - [ ] **Bugfix:** Löschen von Kunden ermöglichen (Prüfung auf `ON DELETE` Constraints).
    - [ ] **Erstellung:** Telefonnummer-Feld in den Tab "Allgemein" verschieben.
- [ ] **1.3 Sales Pipeline Fixes**
    - [ ] **Bugfix:** Drag & Drop Verhalten fixen (Karten bleiben nicht in allen Spalten hängen).
    - [ ] **Settings:** Farbe und Beschreibung für Phasen (Stages) hinzufügen und speicherbar machen.
    - [ ] **Actions:**
        - [ ] "Deal löschen" (Entfernen aus Datenbank).
        - [ ] "Als verloren markieren" (Status-Update, Deal bleibt für Reporting erhalten).

## 2. Core CRM Features & Workflow
Verbesserung der Datenströme zwischen Kunden, Kontakten und Zeiterfassung.

- [ ] **2.1 Automatische Kontakterstellung**
    - [ ] Beim Erstellen eines Kunden (Feld "Kontaktperson" + Email + Telefon) -> Automatisch Eintrag in `customer_contacts`.
- [ ] **2.2 Kunden-Detailansicht (Modal)**
    - [ ] Klick auf Kunden-Zeile öffnet Popup/Modal (statt Seite).
    - [ ] Hinzufügen eines "Notizen"-Textfelds (Rich Text) im Kunden-Objekt.
- [ ] **2.3 Zeiterfassung UX**
    - [ ] Filter-Zeile "Nach Projekten filtern" entfernen.
    - [ ] Filter-Icon im Header der Tabelle implementieren.
- [ ] **2.4 Global Timer (Stopwatch)**
    - [ ] "Play"-Button im Global Header hinzufügen.
    - [ ] Klick öffnet Popover: Kunde & Projekt wählen.
    - [ ] Globaler State (überdauert Seitenwechsel).
    - [ ] Stop-Button -> Öffnet "Save Time Entry" Modal.

## 3. Finanz-Architektur (The Heavy Lifting)
Umbau der Buchhaltung auf ein Journal-basiertes System (Double-Entry Lite).

- [ ] **3.1 Settings: Kontenplan (Chart of Accounts)**
    - [ ] **Bugfix:** Laden der Konten fixen (API Error beheben).
    - [ ] CRUD: Hinzufügen und Bearbeiten von Buchungskonten ermöglichen.
- [ ] **3.2 Buchungs-Journal (Ledger)**
    - [ ] Tabelle `journal_entries` erweitern: Spalten für `source_type` (invoice, expense, manual), `source_id`, `amount`, `account_id`.
    - [ ] UI: "Bearbeiten/Löschen" für manuelle Buchungen erlauben.
    - [ ] UI: Scrollbalken-Bug rechts beheben.
- [ ] **3.3 Automatisierung (Rechnung -> Journal)**
    - [ ] Trigger/Logik: Wenn Rechnung `sent`/`paid` -> Automatischer Eintrag ins Journal.
    - [ ] Trigger/Logik: Wenn Rechnung storniert -> Eintrag im Journal kompensieren.
- [ ] **3.4 Reporting & Dashboard Verknüpfung**
    - [ ] Auswertungen auf `journal_entries` umstellen (Single Source of Truth).
    - [ ] Dashboard-KPIs aus dem Journal ziehen.

## 4. Tenant & Branding (Multi-Company)
Finalisierung der Mandantenfähigkeit.

- [ ] **4.1 Auto-Login**
    - [ ] Beim Login `last_active_company_id` nutzen.
- [ ] **4.2 Firmen-Logo**
    - [ ] Settings: Bildupload für Logo (PNG/SVG).
    - [ ] PDF-Generator: Dynamisches Einbinden des Logos.

## 5. Design System "Modern Apple" (Final Polish)
Erst wenn die Technik steht, wird das Kleid angepasst.

- [ ] **5.1 Design Guidelines definieren (Tailwind)**
    - [ ] Glassmorphism, San Francisco Font Style, Subtile Gradients.
- [ ] **5.2 Umsetzung**
    - [ ] Global Layout, Tabellen-Styling, Buttons vereinheitlichen.