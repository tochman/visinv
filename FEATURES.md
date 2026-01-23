# Invoice SaaS - Feature Documentation

## User Stories

### Authentication & User Management

**US-001: Email Authentication** ✅
- As a **user**, in order to **securely access my account**, I would like to **register and login using my email address and password**.
- **Status:** Implemented - Email/password auth with sign up/sign in pages, protected routes, profile management

**US-002: Google OAuth Authentication** ✅
- As a **user**, in order to **quickly access the platform without creating a new password**, I would like to **sign in using my Google account**.
- **Status:** Implemented - OAuth integration with redirect handling, configured in authService

**US-003: User Avatar Upload**
- As a **user**, in order to **personalize my account**, I would like to **upload my avatar to Supabase storage**.
- **Status:** Partial - Profile table exists, storage buckets configured, UI needs implementation

---

### Organization Management

**US-052: Organization Creation**
- As a **user**, in order to **represent my company on invoices**, I would like to **create an organization with company information (name, organization number, VAT number, address, municipality, bank details)**.
- **Required fields (Swedish compliance):** Company name, organization number, VAT registration number, address, municipality
- **Optional fields:** Bank/giro number, F-skatt approval, contact details, website

**US-053: Organization Logo Upload**
- As an **organization owner**, in order to **brand my invoices professionally**, I would like to **upload my company logo to appear on all invoices**.

**US-054: Organization Settings Management**
- As an **organization owner**, in order to **maintain accurate company information**, I would like to **edit organization details, payment terms, and invoice settings**.
- **Invoice settings:** Default payment terms, currency, tax rate, invoice number prefix, next invoice number

**US-055: Organization-Scoped Invoice Numbering**
- As an **organization**, in order to **maintain proper Swedish accounting compliance**, I would like to **have invoice numbers in unbroken sequence at organization level, shared by all users in the organization**.
- **Technical:** Invoice numbers scoped to organization_id, not user_id

**US-064: Manual vs Automatic Invoice Numbering** ✅
- As a **user that issues an invoice**, in order to **keep my books in good order**, I would like to **be able to choose whether invoice numbering is auto-incremented or manually set by me**.
- **Configuration:** Organization-level setting in Settings > Organization
- **Options:**
  - **Automatic:** System generates sequential invoice numbers (INV-0001, INV-0002, etc.)
  - **Manual:** User must enter invoice number for each invoice (with validation for uniqueness within organization)
- **Behavior:**
  - Automatic mode: Invoice number field auto-populated and read-only in invoice form
  - Manual mode: Invoice number field required and editable, system validates uniqueness
  - Setting stored in `organizations` table: `invoice_numbering_mode` (enum: 'automatic', 'manual')
  - Default: Automatic
- **Status:** Implemented
  - Database: Added `invoice_numbering_mode` column to organizations table with CHECK constraint
  - Backend: Invoice.js resource updated to check organization mode, validate manual numbers for uniqueness
  - UI: OrganizationSettings with dropdown selector for numbering mode
  - Form: InvoiceModal conditionally shows invoice_number input based on organization setting
  - Validation: Required field validation in manual mode, duplicate prevention
  - i18n: Full English/Swedish translations
  - Tests: Cypress test suite with 7 scenarios (mode toggle, field visibility, manual/auto creation, validation, duplicates)

**US-056: Organization Member Invitations** ✅
- As an **organization owner**, in order to **allow my colleagues to use the application**, I would like to **invite them to my organization via email and choose their role ("owner" or "associate")**.
- **Roles:**
  - **Owner:** Full administrative access, can invite/remove members, manage organization settings
  - **Associate:** Standard access to create invoices, clients, products within the organization
- **Status:** Implemented
  - Database: `organization_invitations` table with token-based invites, 7-day expiry
  - Service: `organizationService` with createInvitation, getInvitations, deleteInvitation, acceptInvitation methods
  - UI: Invite modal in Settings > Members tab, pending invitations list with cancel option
  - Acceptance: `/invite/:token` route with AcceptInvitation page
  - Email validation: Ensures invited email matches logged-in user
  - Full i18n support (Swedish/English)

**US-057: Organization Member Management**
- As an **organization owner**, in order to **control access**, I would like to **view all organization members, manage their roles (owner/associate), and remove users**.

**US-058: Multi-Organization Support**
- As a **user**, in order to **work with multiple companies**, I would like to **belong to multiple organizations and switch between them**.

**US-059: Team/Department Management**
- As an **organization owner**, in order to **organize users by department**, I would like to **create teams within my organization and assign members to teams**.
- **Use cases:** Sales team, Support team, Regional offices, Departments

**US-060: Team-Scoped Data Access**
- As a **team member**, in order to **collaborate efficiently**, I would like to **optionally scope clients and invoices to specific teams while maintaining organization-wide visibility for owners/admins**.

---

### Free Tier Features

**US-004: Free Invoice Limit**
- As a **free user**, in order to **try the platform before committing**, I would like to **create and send up to 10 invoices for free**.

**US-005: Client Management** ✅
- As a **free user**, in order to **organize my customer information**, I would like to **create, edit, and manage client profiles with contact details**.
- **Status:** Implemented - Full CRUD operations with search, modal forms, and i18n support

**US-006: Invoice Creation** ✅
- As a **free user**, in order to **bill my clients**, I would like to **create invoices with multiple line items, tax calculations, and client information**.
- **Status:** Implemented - Full CRUD with InvoiceModal, line items, tax calculations, status management (draft/sent/paid), 28 Cypress tests

**US-007: Product Catalog** ✅
- As a **free user**, in order to **speed up invoice creation**, I would like to **maintain a product/service catalog that I can add to invoices**.
- **Status:** Implemented - Full CRUD with search, product selection in invoices, 18 Cypress tests
- **Status:** Implemented - Full CRUD with Products page, product selection in invoice line items, auto-fill description/price/unit, 17 Cypress tests passing

**US-008: Invoice Email Delivery**
- As a **free user**, in order to **send invoices to my clients**, I would like to **email invoices using Resend integration**.

**US-009: Invoice Printing**
- As a **free user**, in order to **provide physical copies**, I would like to **print invoices in a professional format**.

**US-010: PDF Generation** ✅
- As a **free user**, in order to **share invoices in a standard format**, I would like to **download invoices as PDF files**.
- **Status:** Implemented - invoicePdfService with template rendering, download button in invoice list, 31 Cypress tests (28 invoice + 3 PDF)

**US-011: Predefined Invoice Templates** ✅
- As a **free user**, in order to **create professional-looking invoices quickly**, I would like to **choose from a set of predefined invoice templates**.
- **Status:** Implemented - System templates (Modern, Classic) available to all users, stored with user_id=null for shared access

---

### Premium Features

**US-012: Stripe Subscription**
- As a **user**, in order to **access premium features**, I would like to **subscribe to a premium plan via Stripe**.

**US-013: Unlimited Invoices**
- As a **premium user**, in order to **scale my business without limits**, I would like to **create and send unlimited invoices**.

**US-014: Custom Invoice Templates** ✅
- As a **premium user**, in order to **match my brand identity**, I would like to **create and customize my own invoice templates**.
- **Status:** Implemented - Full-page TipTap editor with visual/code/preview modes, 6 design themes, Handlebars templating

**US-015: Template Management** ✅
- As a **premium user**, in order to **maintain multiple branding options**, I would like to **save, edit, and delete multiple custom templates**.
- **Status:** Implemented - CRUD operations with search, clone system templates, edit/delete user templates, preview with sample data

**US-061: Invoice Template Selection** ✅
- As a **user**, in order to **vary what my invoices look like**, I would like to **choose either a system template or one of my custom templates to use for a specific invoice**.
- **Status:** Implemented
  - Template selector dropdown in invoice creation/edit modal
  - Template quick-change dropdown in invoice list view (per invoice row)
  - Grouped by "System Templates" and "My Templates"
  - Selected template stored with invoice (`invoice_template_id`)
  - PDF generation uses invoice's selected template (or falls back to default)
  - Preview functionality respects selected template

**US-016: Team Creation** → See US-059 (Team/Department Management)
- Moved to Organization Management section

**US-017: Team Collaboration** → See US-060 (Team-Scoped Data Access)
- Moved to Organization Management section

**US-018: Team Role Management** → See US-057 (Organization Member Management)
- Moved to Organization Management section

---

### Invoice Management

**US-019: Invoice Status Tracking** ✅
- As a **user**, in order to **monitor payment progress**, I would like to **track invoice statuses (draft, sent, paid, overdue, cancelled)**.
- **Status:** Implemented - Status badges, filter by status, mark as sent/paid actions, 11 tests in invoice suite
- **Status:** Implemented - Full status management with markAsSent/markAsPaid, status badges, filtering, 11 Cypress tests

**US-020: Payment Recording** ✅
- As a **user**, in order to **keep accurate financial records**, I would like to **record payments received against invoices**.
- **Status:** Implemented
  - **US-020-A: Single Payment Recording** - Record a single payment with amount, date, method, reference, and notes
  - **US-020-B: Partial Payment Support** - Support multiple partial payments against one invoice, track remaining balance
  - **US-020-C: Payment History** - View complete payment history for each invoice with dates, amounts, and methods
  - **US-020-D: Automatic Status Updates** - Automatically mark invoice as 'paid' when fully paid, revert to 'sent' if payment deleted
  - Database: payments table with invoice_id FK, amount, payment_date, payment_method, reference, notes
  - Backend: Payment resource with validation against remaining balance, Invoice methods for balance calculation
  - UI: PaymentModal for recording payments with real-time balance validation
  - i18n: Full English/Swedish translations for payment terminology
  - Features: Prevent overpayment, calculate remaining balance, support 6 payment methods (bank_transfer, swish, card, cash, check, other)

**US-021: Invoice Numbering System** ✅
- As a **user**, in order to **maintain professional record-keeping**, I would like to **automatically generate sequential invoice numbers with custom formats**.
- **Status:** Implemented - generateInvoiceNumber() with INV-0001 format, auto-increments per organization (refactored for US-055, US-064)
- **Completed:**
  - ✅ Refactored to use organization_id instead of user_id for Swedish compliance (US-055)
  - ✅ Added support for manual invoice numbering mode (US-064)

**US-022: Per-Client Invoice Sequences**
- As a **user**, in order to **organize invoices by client**, I would like to **maintain separate invoice number sequences for different clients** (optional).

**US-023: Tax/VAT Calculations** ✅
- As a **user**, in order to **comply with tax regulations**, I would like to **automatically calculate and display taxes (including Swedish moms)**.
- **Status:** Implemented - Automatic calculation in InvoiceModal, configurable tax rate (default 25% Swedish moms), tested in invoice tests

**US-024: Multi-Currency Support**
- As a **premium user**, in order to **invoice international clients**, I would like to **create invoices in different currencies**.

**US-025: Recurring Invoices**
- As a **premium user**, in order to **automate subscription billing**, I would like to **set up recurring invoices with custom intervals**.

**US-063: Credit Invoices** ✅
- As a **user that issues an invoice**, in order to **keep my books in good order**, I would like to **be able to issue CREDIT invoices (either partial or whole) for previously issued invoices**.
- **Invoice types:** DEBET (standard invoice), CREDIT (corrects/reverses a previous invoice)
- **Features:**
  - Link credit invoice to original invoice
  - Support partial credits (specify line items and amounts to credit)
  - Support full credits (credit entire invoice)
  - Display credit invoice relationships in invoice list and detail views
  - Automatically mark original invoice status when fully credited
  - Include reference to original invoice number on credit invoice
- **Compliance:** Required for proper Swedish accounting (Bokföringslagen)
- **Status:** Implemented
  - Database: Added invoice_type (DEBET/CREDIT) and credited_invoice_id columns with FK constraint
  - Backend: Invoice resource with createCredit(), getCredits(), getCreditedAmount() methods
  - UI: Invoice type selector in InvoiceModal, credited invoice dropdown for CREDIT type
  - Display: Credit note badge in invoice list, visual distinction for credit invoices
  - i18n: Full English/Swedish translations for credit terminology
  - Tests: Cypress test suite with 7 scenarios (type selector, original invoice selection, DEBET creation, CREDIT creation, badge display, client requirement, partial credit)

**US-050: Product VAT Rates** ✅
- As a **user**, in order to **comply with tax regulations**, I would like to **set VAT percentage on each product (0%, 6%, 12%, or 25%)**.
- **Status:** Implemented - Dropdown in ProductModal with standard Swedish VAT rates, i18n support

**US-051: VAT Breakdown by Rate** ✅
- As a **user**, in order to **clearly display how VAT values are calculated**, I would like to **see invoices display all VAT groups separately by rate (0%, 6%, 12%, 25%)**.
- **Status:** Implemented - Invoice totals calculate and display VAT grouped by rate, PDF includes VAT groups, 3 Cypress tests

---

### Notifications & Reminders

**US-026: Email Notifications**
- As a **user**, in order to **stay informed about invoice activity**, I would like to **receive email notifications when invoices are viewed or paid**.

**US-026-A: Overdue Invoice Alerts**
- As a **user**, in order to **stay on top of unpaid invoices**, I would like to **receive alerts when my invoices become overdue**.
- **Alert types:**
  - Dashboard notification badge showing overdue count
  - Email digest of overdue invoices (daily or weekly)
  - In-app notification when invoice transitions to overdue status
  - Visual indicators in invoice list (red badges, highlighted rows)
- **Features:**
  - Configurable alert preferences (email frequency, in-app notifications on/off)
  - Group overdue invoices by age (1-7 days, 8-30 days, 30+ days)
  - Quick action to send reminder to client from alert
  - Mark invoice as "reminder sent" to track follow-ups

**US-027: Overdue Reminders**
- As a **premium user**, in order to **improve payment collection**, I would like to **automatically send email reminders for overdue invoices**.

**US-028: Payment Confirmation Emails**
- As a **user**, in order to **confirm transactions**, I would like to **automatically send payment confirmation emails to clients**.

---

### Analytics & Reporting

**US-029: Revenue Dashboard**
- As a **premium user**, in order to **track business performance**, I would like to **view analytics showing total revenue, outstanding payments, and trends**.

**US-030: Invoice Reports**
- As a **premium user**, in order to **analyze my billing activity**, I would like to **generate reports filtered by date range, client, or status**.

**US-031: Outstanding Invoice Summary** ✅
- As a **user**, in order to **manage cash flow**, I would like to **see a summary of all outstanding and overdue invoices**.
- **Status:** Implemented - Dashboard displays draft invoices, overdue invoices, and active (sent but not overdue) invoices counts with color-coded cards and links to filtered invoice views

**US-032: Client Revenue Breakdown**
- As a **premium user**, in order to **identify top clients**, I would like to **view revenue breakdowns by client**.

**US-062: Dashboard Invoice Overview** ✅
- As a **user**, in order to **get a good overview of outstanding tasks**, I would like to **see draft invoices, overdue invoices, and currently active invoices counts on the dashboard**.
- **Status:** Implemented - Dashboard "Invoices to handle" card shows:
  - Draft invoices (yellow) - invoices not yet sent
  - Overdue invoices (red) - sent invoices past due date
  - Active invoices (blue) - sent invoices not yet overdue
  - Each item links to filtered invoice list
  - Shows "No outstanding tasks" when all caught up

---

### Internationalization

**US-033: Swedish Language Support**
- As a **Swedish user**, in order to **use the platform in my native language**, I would like to **switch the interface to Swedish**.

**US-034: English Language Support**
- As an **English-speaking user**, in order to **use the platform comfortably**, I would like to **use the interface in English**.

**US-035: Localized Invoice Templates**
- As a **user**, in order to **send invoices in my client's language**, I would like to **create invoices with localized content and date formats**.

---

### Administration

**US-036: Admin Dashboard Access** ✅
- As an **admin (thomas@communitaslabs.io)**, in order to **manage the platform**, I would like to **access a dedicated admin dashboard with full system access**.
- **Status:** Implemented - Admin-only route protection, dashboard with platform stats (users, organizations, invoices), 3 Cypress tests

**US-037: User Management - List & Search** ✅
- As an **admin**, in order to **support and monitor users**, I would like to **view a searchable list of all user accounts with their email, name, plan type, registration date, and last login**.
- **Status:** Implemented - AdminUsers page with searchable user list, displays email, name, plan, registered date, last login; 1 Cypress test

**US-037-A: User Profile Administration** ✅
- As an **admin**, in order to **assist users with account issues**, I would like to **view and edit user profile details including name, email, and plan type**.
- **Status:** Implemented - UserEditModal component for editing user details, updates reflected in list; 1 Cypress test

**US-037-B: Password Reset**
- As an **admin**, in order to **help users who are locked out**, I would like to **trigger a password reset email for any user account**.

**US-037-C: User Account Suspension**
- As an **admin**, in order to **enforce platform policies**, I would like to **ban/suspend user accounts temporarily (1 day, 1 week, N weeks, 1 month, N months) or permanently**.
- **Banned users:** Cannot sign in, see "Account suspended" message with reason and expiry date (if temporary)
- **Suspension options:** 1 day, 1 week, 2 weeks, 4 weeks, 1 month, 3 months, 6 months, 12 months, permanent
- **Features:** Add ban reason, view suspension history, unban users, automatic unban when period expires

**US-037-D: Global Invoice Overview**
- As an **admin**, in order to **monitor platform activity and support billing issues**, I would like to **view all invoices across all users, grouped by status (draft, sent, paid, overdue, cancelled) with filtering and search capabilities**.

**US-038: Platform Analytics** ✅
- As an **admin**, in order to **monitor platform health**, I would like to **view metrics on user signups, active subscriptions, and invoice volumes**.
- **Status:** Implemented - Dashboard displays total users, organizations, and invoices with stats cards

**US-039: Feature Access Control**
- As an **admin**, in order to **test and configure features**, I would like to **access all premium features regardless of subscription status**.

**US-040: Audit Logs**
- As an **admin**, in order to **track system changes**, I would like to **view audit logs of all user actions and data modifications**.

---

### Security & Data Management

**US-041: Row Level Security (RLS)**
- As a **user**, in order to **protect my data**, I would like to **have my data isolated using Supabase RLS policies so only I and my team can access it**.

**US-042: Team Data Isolation**
- As a **team member**, in order to **maintain data privacy**, I would like to **ensure my team's data is isolated from other teams**.

**US-043: Secure File Storage**
- As a **user**, in order to **protect my assets**, I would like to **store avatars and logos securely in Supabase storage with proper access controls**.

---

### Integration & Webhooks

**US-044: Stripe Webhook Handling**
- As a **system**, in order to **process subscription events**, I would like to **handle Stripe webhooks for subscription creation, updates, and cancellations**.

**US-045: Payment Gateway Integration**
- As a **premium user**, in order to **accept online payments**, I would like to **integrate payment links in my invoices** (future enhancement).

---

### Developer & Operations

**US-046: Error Tracking**
- As a **developer**, in order to **identify and fix bugs quickly**, I would like to **integrate error tracking (e.g., Sentry)**.

**US-047: Environment Management**
- As a **developer**, in order to **safely deploy updates**, I would like to **maintain separate development, staging, and production environments**.

**US-048: Data Backup**
- As an **admin**, in order to **prevent data loss**, I would like to **have automated backups of all critical data**.

---

## Technical Stack

### Frontend
- **Framework**: React (Vite)
- **Language**: JavaScript (no TypeScript)
- **Styling**: Tailwind CSS 4.x
- **State Management**: Redux
- **Routing**: React Router
- **Internationalization**: i18n (Swedish & English)
- **PDF Generation**: react-pdf or jsPDF

### Backend & Services
- **Database & Auth**: Supabase
- **Authentication**: Email/Password + Google OAuth
- **Payment Processing**: Stripe Subscriptions
- **Email Service**: Resend
- **File Storage**: Supabase Storage

### Security
- Row Level Security (RLS) in Supabase
- Team-based data isolation
- Role-based access control

---

## Data Models

### Core Entities
1. **Users** - Authentication and profile data
2. **Clients** - Customer information
3. **Invoices** - Invoice headers with status, dates, totals
4. **Invoice Rows** - Line items for each invoice
5. **Products** - Optional product/service catalog
6. **Templates** - Invoice template designs (predefined + custom)
7. **Teams** - Team information for collaboration
8. **Team Members** - User-team relationships with roles
9. **Subscriptions** - Stripe subscription tracking
10. **Payments** - Payment records against invoices
11. **Audit Logs** - Change tracking for compliance

---

## Feature Tiers

### Free Tier
- Up to 10 invoices
- Email & Google authentication
- Client management
- Basic invoice creation
- Predefined templates
- Email & print delivery
- PDF download
- Basic reporting

### Premium Tier
- Unlimited invoices
- Custom templates
- Team collaboration
- Advanced analytics
- Recurring invoices
- Multi-currency support
- Automated reminders
- Payment tracking
- Priority support

### Admin Access
- Full feature access
- User management
- Platform analytics
- Audit logs
- System configuration

---

## Priority Levels

### Phase 1 (MVP)
- US-001, US-002, US-003 (Authentication)
- US-004, US-005, US-006, US-008, US-009, US-010 (Free tier core)
- US-011 (Predefined templates)
- US-019 (Basic status tracking)
- US-041, US-042 (Security fundamentals)

### Phase 2 (Premium Launch)
- US-012, US-013 (Stripe & unlimited invoices)
- US-014, US-015 (Custom templates)
- US-020, US-021, US-023 (Enhanced invoice management)
- US-033, US-034 (i18n)
- US-044 (Stripe webhooks)

### Phase 3 (Collaboration)
- US-016, US-017, US-018 (Teams)
- US-040, US-043 (Advanced security)
- US-029, US-030, US-031 (Analytics)

### Phase 4 (Advanced Features)
- US-024, US-025 (Multi-currency & recurring)
- US-026, US-027, US-028 (Notifications)
- US-032 (Client analytics)
- US-036 through US-040 (Admin dashboard)

---

## Notes
- Legacy templating code to be integrated
- Admin email: thomas@communitaslabs.io
- All timestamps should use UTC
- Currency default: SEK (Swedish Krona)
- Tax rates configurable per invoice
