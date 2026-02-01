# Roadmap V5: Stabilisierung & Finanz-Integrität

**Status:** Active
**Focus:** Bugfixes, Mobile Basics, Data Correctness (Swiss Finance)
**Forbidden:** "Big Bang" Design Refactors (Sage/Bento changes put on hold).

---

## 🏗 Phase 1: Critical Fixes & Stability (Immediate)
*Showstoppers that cause crashes or wrong data representation.*

- [ ] **1.1 Fix "Auswertungen" Crash**
    - [ ] Fix Whitescreen crash when selecting "Benutzerdefiniert" filter.
    - [ ] *Tech Hint:* Check `date-fns` parsing or `undefined` state in the date picker component.
- [ ] **1.2 Data Boundary Fix (Year Transition)**
    - [ ] Fix: Dashboard Revenue Chart missing data from Dec 2025 (currently Feb 2026).
    - [ ] Fix: "Auswertungen" list missing items from previous year in "Last 90 Days" view.
    - [ ] Set "Last 90 Days" as default view for Dashboard (Charts & KPIs).
    - [ ] *Tech Hint:* Ensure SQL queries use `date >= (now() - interval '90 days')` instead of strict year filtering.
- [ ] **1.3 UI Layout Fixes**
    - [ ] **Transactions Table:** Fix "Ghost Whitespace" at bottom caused by Dropdown menu.
        - *Tech Hint:* Render Dropdown Action Menu via **React Portal** (`document.body`) to escape table overflow container.
    - [ ] **Pagination:** Implement generic Pagination (Limit 10 items/page) for all major tables (Buchungen, Kunden, Rechnungen) to prevent layout shifts.
- [ ] **1.4 Booking Logic Cleanup**
    - [ ] Remove "Verrechenbar" field from Buchungen (not needed).

## 📱 Phase 2: Mobile Core & UX Basics
*Making the app usable on smartphones.*

- [ ] **2.1 Mobile Navigation & Structure**
    - [ ] **Refactor Sidebar:** Implement new grouping logic:
        1. **Cockpit** (Dashboard)
        2. **Verkauf & Projekte** (Sales, Offerten, Projekte, Zeiterfassung)
        3. **Finanzen** (Rechnungen, Buchungen, Jahresabschluss, Auswertungen)
        4. **Stammdaten** (Kunden, Produkte)
        5. **System** (Einstellungen - Bottom)
    - [ ] **Hamburger Menu:** Implement collapsible sidebar state for mobile viewports (`< md`).
- [ ] **2.2 Mobile Tables**
    - [ ] Implement `overflow-x-auto` with `sticky-left` columns for key identifiers (Name/Amount) on small screens.
- [ ] **2.3 UX Refinements**
    - [ ] **Product Table:** Truncate description to 10 words in list view (expand on click/hover).
    - [ ] **Global Search:** Fix navigation. Clicking a result must navigate to the specific entity detail view (not just the list).

## 💰 Phase 3: Finanz-Logik & Swiss Compliance
*Ensuring generated invoices and numbers are legally compliant and correct.*

- [ ] **3.1 MWST (VAT) Handling**
    - [ ] **Global Settings:** Add VAT Toggle (Enabled/Disabled) and Default Rate (e.g. 8.1%) in `settings` table.
    - [ ] **Application:** Auto-apply VAT logic to Hours and Products based on global setting.
- [ ] **3.2 Discount System (Rabatte)**
    - [ ] **Offerten:** Implement discount field logic.
    - [ ] **Invoices:** Allow discount entry as both **% (Percentage)** and **CHF (Absolute)**.
- [ ] **3.3 Invoice Sender Identity**
    - [ ] Add support for "c/o" or "Inhaber" name in Invoice Sender Address.
    - *Requirement:* User can choose if `company_name` OR `contact_name` + `company_name` appears on PDF.
- [ ] **3.4 Booking Numbers (Belegnummern)**
    - [ ] Replace random string generation with **Auto-Increment Sequence** per Company.
    - *Tech Hint:* Needs Database Migration (New Sequence scoped by `company_id` or Max+1 Trigger).

## 🗃 Phase 4: Data Hierarchy & Extended Features
*Advanced data handling once the core is stable.*

- [ ] **4.1 Fallback Logic for Contacts**
    - [ ] Logic: If `contact_name` is empty on create, auto-fill/use `company_name` as display name (B2B use case).
- [ ] **4.2 Product Categories**
    - [ ] DB: Add `category` field to products.
    - [ ] UI: Add Input field, Table Column, and "Group by Category" toolbar action.
- [ ] **4.3 Stundensätze (Hourly Rates) Hierarchy**
    - [ ] Enforce Hierarchy: `Project Rate` > `Customer Rate` > `System Standard`.
    - [ ] **Critical:** Implement "Snapshotting" for Time Entries (Store rate *at time of entry*, not reference to dynamic rate).
- [ ] **4.4 Partner Contacts**
    - [ ] Add "Partner/Dienstleister" relation field to Customer Form (Link to existing contacts).
- [ ] **4.5 Visual Consistency**
    - [ ] Unify Chart Colors: Match "Milchbüechli" Table badges with Recharts colors (Income=Green, Expense=Red/Rose).
- [ ] **4.6 Project Filters**
    - [ ] Add Status Filter to Project List.

---

## 📝 Context for Claude Code

### Technical Constraints
- **Design System:** Use existing Tailwind classes. Do **not** introduce new Layout primitives (Sage/Bento) unless specified.
- **Components:** Reuse `Card`, `Button`, `PageHeader` from `/src/components/ui`.
- **Database:** All new tables/columns must comply with **RLS Policies** (`company_id`).
- **State:** Prefer URL-based state for Filters/Pagination over local state where possible (enables sharing/refresh).

### Key Architectural Patterns
1. **Multi-Tenancy:** Always filter by `company_id` in Frontend Queries (Defense in Depth).
2. **Swiss QR:** Changes to Invoices must be validated against `swissqr.ts` logic.
3. **Portal Rendering:** Use React Portals for Dropdowns/Modals inside Tables to avoid `overflow: hidden` clipping.