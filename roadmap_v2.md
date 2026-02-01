# Roadmap V2: Refactoring & Finanz-Core

## 1. Quick Wins & UI-Fixes (Aufräumen)
Kleine Anpassungen, die das Nutzungserlebnis sofort verbessern und "Noise" entfernen.

- [x] **1.1 Global UI Cleanup**
    - [x] Sidebar: Doppelten Firmennamen rechts entfernen.
    - [x] Header: Glocken-Icon (Notification) komplett entfernen.
    - [x] Produkte: Schriftgrösse an den Rest der App angleichen.
- [x] **1.2 Kunden-Management Fixes**
    - [x] **Bugfix:** Löschen von Kunden ermöglichen (Prüfung auf `ON DELETE` Constraints / Fehlermeldung).
    - [x] **Erstellung:** Telefonnummer-Feld in den Tab "Allgemein" verschieben.
- [x] **1.3 Sales Pipeline Fixes**
    - [x] **Bugfix:** Drag & Drop Verhalten fixen (IDs sind bereits global unique UUIDs).
    - [x] **Settings:** Farbe für Phasen existiert bereits in DB (`color` Spalte in `pipeline_stages`).
    - [x] **Actions:**
        - [x] "Deal löschen" (Physisches Löschen aus DB).
        - [x] "Als verloren markieren" (Logik: Neues Boolean-Feld `is_lost`).
        - [x] UI: Verlorene Deals standardmäßig ausgeblendet, via Toggle-Filter sichtbar.

## 2. Core CRM Features & Workflow
Verbesserung der Datenströme zwischen Kunden, Kontakten und Zeiterfassung.

- [x] **2.1 Automatische Kontakterstellung**
    - [x] Beim Erstellen eines Kunden (Feld "Kontaktperson" + Email + Telefon) -> Automatisch Eintrag in `customer_contacts`.
- [x] **2.2 Kunden-Detailansicht (Modal)**
    - [x] Klick auf Kunden-Zeile öffnet Popup/Modal (statt Seite).
    - [x] Hinzufügen eines "Notizen"-Textfelds (Rich Text) im Kunden-Objekt.
- [x] **2.3 Zeiterfassung UX**
    - [x] Filter-Zeile "Nach Projekten filtern" entfernen.
    - [x] Filter-Icon im Header der Tabelle implementieren.
- [ ] **2.4 Global Timer (Stopwatch)**
    - [ ] "Play"-Button im Global Header hinzufügen.
    - [ ] Klick öffnet Popover: Kunde & Projekt wählen.
    - [ ] Globaler State (überdauert Seitenwechsel).
    - [ ] Stop-Button -> Öffnet "Save Time Entry" Modal.

## 3. Finanz-Architektur: Milchbüechli (Einnahmen-/Ausgabenrechnung)
Einfache Single-Entry Buchhaltung für Schweizer KMU und Selbstständige.

- [x] **3.1 Settings: Buchungskategorien (Categories)**
    - [x] Tabelle `categories` erstellen (id, company_id, name, type: 'income'|'expense', icon, color, is_tax_relevant).
    - [x] Migration mit Standard-Kategorien (Warenaufwand, Personalaufwand, Raumaufwand, Informatik, Werbung, Dienstleistungsumsatz, etc.).
    - [x] UI in Settings zum Verwalten (Hinzufügen/Bearbeiten/Löschen).
- [ ] **3.2 Einnahmen/Ausgaben Manager**
    - [ ] Bestehende Buchungen-Seite anpassen für neue Kategorien-Struktur.
    - [ ] Dropdown zur Kategorie-Auswahl (gruppiert nach Einnahmen/Ausgaben).
    - [ ] Automatische Typ-Erkennung basierend auf gewählter Kategorie.
- [ ] **3.3 Auswertungen / Reports**
    - [ ] Einnahmen-/Ausgabenübersicht nach Kategorien.
    - [ ] Steuerrelevante Positionen hervorheben.
    - [ ] Export für Treuhänder (CSV/PDF).
