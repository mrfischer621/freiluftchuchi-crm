1. Branding & Identität
[x] 1.1 Application Renaming: Ändere den App-Namen in PageHeader, Metadata (Titel-Tag) und überall dort, wo "CRM" oder "Milchbüechli" steht, zu "Nicolas Fischer CRM".

2. Critical Bugfixes (Data & Logic)
[x] 2.1 MWST-Settings Fix: - Entferne die redundante "MWST-Pflichtig" Checkbox im Firmenprofil.

Fix: Stelle sicher, dass der upsert-Befehl für die MWST-Konfiguration (Satz, Methode) korrekt in der Tabelle company_settings gespeichert wird (RLS-Check).

[ ] 2.2 Settings Display Sync: Fix: Stelle sicher, dass die Felder alternativ_name und rechnungsname im Formular der Firmeneinstellungen geladen und angezeigt werden (aktuell fehlen sie in der UI, obwohl sie in der DB vorhanden sind).

[ ] 2.3 Reporting Engine Fix:

Synchronisiere die Daten-Pipeline zwischen den Buchungen und den Recharts-Diagrammen.

Fix: Die Datumsfilterung in den Auswertungen muss die Filter-Daten direkt an die Chart-Komponente weitergeben, ohne dass der State verloren geht.

[ ] 2.4 DatePicker Refactoring: Verhindere den Full-Page-Reload beim Wechseln des Monats im benutzerdefinierten Datumsfilter. Nutze e.preventDefault() und stelle sicher, dass nur der lokale State oder die URL-Params aktualisiert werden.

3. Feature Enhancements & UX
[ ] 3.1 Flexible Zeit-Eingabe: Erlaube in allen Zeiterfassungs-Komponenten (TimeEntryForm) die Eingabe von Stunden in 0.25 Schritten (Step-Attribut im Number-Input anpassen).

[ ] 3.2 Dynamic Product Categories:

Settings: Erstelle eine neue Sektion in den CRM-Einstellungen, um die Liste der Produktkategorien (als Array oder separate Tabelle product_categories) zu verwalten.

Product Form: Ersetze das Freitext-Feld für die Kategorie durch ein Dropdown (Select), das die Werte aus den Einstellungen bezieht.