# Roadmap V3: Finance Core & Usability

## 1. Finanz-Modul: "Milchbüechli" (Priorität Hoch)
Abschluss der Umstellung auf Single-Entry Bookkeeping und Verbesserung der UX.

- [x] **1.1 Transaction UI & Logic** (ehemals 3.2)
    - [ ] **UI Fix:** Scrollbalken rechts entfernen. Layout an `InvoiceTable` angleichen (Pagination oder Auto-Height statt fester Container-Höhe).
    - [x] **Kategorien-Logik:** Dropdown im Formular gruppieren (Einnahmen/Ausgaben).
    - [x] **Auto-Type:** Beim Wählen einer Kategorie (z.B. "Miete") automatisch den Typ (Ausgabe) setzen.
- [ ] **1.2 Beleg-Management** (Neu)
    - [x] **Storage:** Supabase Storage Bucket `receipts` einrichten (Public/Private Policies).
    - [x] **DB:** Tabelle `transactions` um Spalte `receipt_url` (oder `attachments` array) erweitern.
    - [x] **UI:** Upload-Zone (Drag & Drop) im Buchungs-Formular für PDF/JPG.
    - [x] **View:** Vorschau-Button oder Download-Link in der Tabelle.
- [ ] **1.3 Auswertungen / Reports** (ehemals 3.3)
    - [ ] Einnahmen-/Ausgabenübersicht nach Kategorien (Chart oder Tabelle).
    - [ ] Steuerrelevante Positionen hervorheben.
    - [ ] Export für Treuhänder (CSV/PDF).

## 2. Global Usability (Priorität Mittel)
Funktionen, die sich über alle Module erstrecken.

- [x] **2.1 Globale Suche** (Neu)
    - [x] Implementierung der Suchleiste (Text-Filter wie bei Kunden) für:
        - [x] Projekte
        - [x] Produkte
        - [x] Angebote (Offerten)
        - [x] Rechnungen
        - [x] Buchungen
- [ ] **2.2 Global Timer (Stopwatch)** (ehemals 2.4)
    - [ ] "Play"-Button im Global Header.
    - [ ] Context & LocalStorage Persistence (überdauert Reload).
    - [ ] Workflow: Start -> Projekt wählen -> Stop -> Speichern.

## 3. Backlog & Maintenance (Priorität Niedrig)
Bekannte Bugs und Optimierungen ohne Zeitdruck.

- [ ] **3.1 Sales Pipeline**
    - [ ] **Bugfix:** Drag & Drop funktioniert noch nicht zuverlässig (stuck cards). *Low Prio.*

---

## Archiv (Erledigt in V2)
- [x] Global UI Cleanup (Header, Sidebar, Fonts).
- [x] Kunden-Management (Löschen, Telefon-Feld).
- [x] Sales Pipeline Basics (Löschen, Lost-Status).
- [x] Automatische Kontakterstellung.
- [x] Kunden-Modal & Notizen.
- [x] Zeiterfassung UX (Filter).
- [x] Finanz-Settings (Kategorien-Tabelle & CRUD).