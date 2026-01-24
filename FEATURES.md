# Invoice SaaS - Feature Documentation

## Overview

This document provides a comprehensive list of user stories for the VisInv invoicing platform. The features are organized into logical categories and prioritized into development phases to guide implementation from MVP to a fully-featured enterprise invoicing system.

### Recent Additions (Phase 4-7 Planning)

To transform VisInv into a **fully featured invoicing system** competitive with industry leaders like FreshBooks and QuickBooks, the following feature categories have been added:

- **Estimates & Quotes** (US-065 to US-067): Pre-invoice proposals with quote-to-invoice conversion
- **Time & Expense Tracking** (US-068 to US-071): Billable hours, expense recording, receipt scanning, project management
- **Client Portal & Self-Service** (US-072 to US-074): Client login, payment portal, account statements
- **Advanced Payment Features** (US-075 to US-079): Installment plans, deposits, late fees, payment gateways, bank reconciliation
- **Bulk Operations & Automation** (US-080 to US-083): Batch actions, CSV import, workflow automation
- **Document Management** (US-084 to US-086): File attachments, internal notes, document archiving
- **Advanced Reporting** (US-087 to US-092): P&L statements, tax reports, cash flow forecasting, aging reports, custom report builder
- **Integrations & Ecosystem** (US-093 to US-097): Accounting software, CRM, API/webhooks, Zapier, email integration
- **Inventory Management** (US-098 to US-100): Stock tracking, purchase orders, COGS for product-based businesses
- **Mobile & Accessibility** (US-101 to US-103): Native mobile apps, PWA, WCAG compliance
- **Security & Compliance** (US-104 to US-109): 2FA, SSO, audit trails, GDPR tools, encryption, backup/recovery
- **White Label & Multi-Tenancy** (US-110 to US-112): Enterprise branding, multi-tenant architecture, reseller program
- **Support & Growth** (US-113 to US-118): In-app help, live chat, support tickets, referrals, email marketing, client feedback

These additions position VisInv as a comprehensive solution for:
- **Freelancers & Solopreneurs**: Simple invoicing, time tracking, expense management
- **Small Businesses**: Client management, quotes, payments, basic reporting
- **Growing Companies**: Team collaboration, advanced reporting, automation, integrations
- **Agencies & Service Providers**: Project management, time tracking, client portal
- **Product-Based Businesses**: Inventory management, purchase orders, COGS tracking
- **Enterprise Clients**: White label, SSO, multi-tenant, API access, dedicated support

---

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
  - UI: PaymentModal for recording payments with real-time balance validation, InvoiceDetail with payment history
  - i18n: Full English/Swedish translations for payment terminology
  - Features: Prevent overpayment, calculate remaining balance, support 6 payment methods (bank_transfer, swish, card, cash, check, other)
  - Tests: 12 Cypress E2E tests covering recording, validation, history, partial payments

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

**US-024: Multi-Currency Support** ✅
- As a **premium user**, in order to **invoice international clients**, I would like to **create invoices in different currencies**.
- **Status:** Implemented
  - Database: Added `exchange_rate` DECIMAL(12,6) column to invoices table
  - Currencies: SEK (base), EUR, USD, GBP, NOK, DKK with static exchange rates
  - Config: `src/config/currencies.js` with formatCurrency(), convertCurrency(), getExchangeRate() utilities
  - UI: Currency dropdown in InvoiceModal with symbols and translated names
  - Display: formatCurrency() used in InvoiceDetail, Invoices list, Dashboard, PDF generation
  - i18n: Full English/Swedish translations for currency names
  - Tests: 5 Cypress E2E tests for currency selection and display

**US-025: Recurring Invoices** ✅
- As a **premium user**, in order to **automate subscription billing**, I would like to **set up recurring invoices with custom intervals**.
- **Status:** Implemented (Simplified architecture - recurring settings on invoices table)
  - Database: Recurring fields added directly to `invoices` table (is_recurring, recurring_frequency, recurring_start_date, recurring_end_date, recurring_next_date, recurring_max_count, recurring_current_count, recurring_parent_id, recurring_status)
  - Database: Invoice number uniqueness changed from global to per-organization (migration 031)
  - Frequencies: Weekly, Bi-weekly, Monthly, Quarterly, Yearly
  - Statuses: Active, Paused, Completed, Cancelled
  - Backend: Invoice resource with recurring logic in create() method, calculateNextRecurringDate() helper
  - UI: Recurring toggle in InvoiceModal with frequency, end date, max count settings (premium feature)
  - UI: Recurring indicator (ArrowPathIcon) with Tailwind tooltip on invoice list
  - UI: Status display (frequency, next date, progress) shown when editing recurring invoices
  - Premium gating: Toggle disabled for non-premium users with PRO badge
  - i18n: Full English/Swedish translations for all recurring UI elements
  - Tests: 15 comprehensive Cypress E2E test scenarios covering create, view, edit, delete, premium/non-premium access, all with "is expected to" format

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

**US-026-A: Overdue Invoice Alerts** ✅
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
- **Status:** Implemented
  - Database: Added reminder_sent_at, reminder_count columns to invoices table
  - Backend: Invoice.markReminderSent(), getOverdueByAge() methods for tracking and grouping
  - UI: Red highlighted rows for overdue invoices, days overdue indicator below invoice number
  - Visual: Purple "Reminder Sent" badge showing count when reminders have been sent
  - Actions: "Send Reminder" button (bell icon) appears for overdue invoices
  - Grouping: getOverdueByAge() method groups by recent (1-7d), moderate (8-30d), old (30+d)
  - i18n: Full English/Swedish translations for reminder terminology
  - TODO: Email sending integration (currently marks reminder as sent only)

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

### Estimates & Quotes

**US-065: Estimate/Quote Creation**
- As a **user**, in order to **provide clients with pricing before committing to work**, I would like to **create and send estimates/quotes that can be converted to invoices**.
- **Features:**
  - Create quote with line items similar to invoices
  - Quote status: draft, sent, accepted, rejected, expired
  - Expiration date for quotes
  - Terms and conditions specific to quotes
  - Quote numbering system (separate from invoices)
  - Convert accepted quote to invoice with one click
  - Client acceptance signature/approval workflow
- **Use cases:** Service proposals, project quotes, custom work estimates

**US-066: Quote-to-Invoice Conversion**
- As a **user**, in order to **streamline my workflow**, I would like to **automatically convert accepted quotes into invoices**.
- **Features:**
  - Preserve all line items, pricing, and client details
  - Link invoice to original quote for reference
  - Update quote status to "converted"
  - Optional: Apply quote-specific discounts or terms to invoice

**US-067: Quote Templates**
- As a **user**, in order to **create professional quotes quickly**, I would like to **use customizable quote templates similar to invoice templates**.

---

### Time & Expense Tracking

**US-068: Time Tracking**
- As a **service provider**, in order to **bill clients for time-based work**, I would like to **track time spent on projects and add billable hours to invoices**.
- **Features:**
  - Start/stop timer for tasks
  - Manual time entry (date, hours, description)
  - Link time entries to clients and projects
  - Set hourly rates (default or per-client/per-project)
  - Mark time entries as billable or non-billable
  - Add time entries directly to invoice line items
  - Time tracking reports (by client, project, team member)
- **Use cases:** Consultants, freelancers, agencies, professional services

**US-069: Expense Tracking**
- As a **user**, in order to **track and bill for business expenses**, I would like to **record expenses and optionally add them to client invoices**.
- **Features:**
  - Record expenses with date, amount, category, description
  - Attach receipt images/PDFs to expenses
  - Categorize expenses (office supplies, travel, meals, etc.)
  - Mark expenses as billable or non-billable
  - Link expenses to clients and projects
  - Add expenses to invoices as line items
  - Support for different expense categories and tax treatment
- **Reporting:** Expense reports by category, client, date range

**US-070: Receipt Scanning (OCR)**
- As a **user**, in order to **quickly capture expense data**, I would like to **take photos of receipts and automatically extract key information**.
- **Features:**
  - Mobile app or web upload for receipt images
  - OCR extraction of: vendor name, date, amount, category
  - Manual correction of OCR results
  - Automatic expense creation from scanned receipt
  - Store receipt image with expense record
- **Technology:** OCR API integration (Google Vision, AWS Textract, etc.)

**US-071: Project Management**
- As a **service provider**, in order to **organize billable work**, I would like to **create projects, assign tasks, track time, and bill clients per project**.
- **Features:**
  - Create projects linked to clients
  - Set project budgets and deadlines
  - Track project progress (hours logged, expenses, amount invoiced)
  - Project-specific billing rates
  - Invoice entire project or partial milestones
  - Project profitability tracking (revenue vs. time/expenses)
- **Reporting:** Project status, budget utilization, profitability

---

### Client Portal & Self-Service

**US-072: Client Portal**
- As a **client**, in order to **access my invoices and payment history**, I would like to **log into a dedicated client portal**.
- **Features:**
  - Secure login for clients (email/password or magic link)
  - View all invoices (current and past)
  - Download invoice PDFs
  - View payment history and outstanding balance
  - Update contact information
  - View and accept quotes/estimates
  - Communication with vendor (messages, disputes)
- **Benefits:** Reduces support requests, improves client experience

**US-073: Online Payment from Client Portal**
- As a **client**, in order to **pay invoices easily**, I would like to **pay directly from the client portal using credit card, bank transfer, or other methods**.
- **Integration:** Payment gateway (Stripe, PayPal, etc.)

**US-074: Client Statements**
- As a **user**, in order to **provide clients with account summaries**, I would like to **generate and send client statements showing all transactions over a period**.
- **Features:**
  - Date range selection (month, quarter, year, custom)
  - Show all invoices, payments, credits, and outstanding balance
  - PDF generation for statements
  - Email delivery to clients
- **Use cases:** Monthly statements for ongoing clients, year-end summaries

---

### Advanced Payment Features

**US-075: Payment Plans (Installments)**
- As a **user**, in order to **help clients manage large invoices**, I would like to **set up payment plans with multiple installments**.
- **Features:**
  - Divide invoice total into N installments
  - Set due dates for each installment
  - Automatically generate separate invoices or track within one invoice
  - Send reminders for each installment
  - Track installment payment status
- **Use cases:** Large projects, expensive services, equipment sales

**US-076: Deposit/Retainer Invoices**
- As a **user**, in order to **secure work before starting**, I would like to **create deposit or retainer invoices that are credited against future work**.
- **Features:**
  - Create deposit invoice (fixed amount or percentage)
  - Track deposit balance
  - Apply deposit credits to final invoices
  - Show deposit applied in invoice details
- **Use cases:** Project down payments, retainer agreements, prepaid services

**US-077: Late Fees & Interest**
- As a **user**, in order to **incentivize on-time payment**, I would like to **automatically calculate and apply late fees or interest to overdue invoices**.
- **Features:**
  - Configure late fee rules (fixed amount or percentage)
  - Set grace period before late fees apply
  - Automatically add late fees to overdue invoices
  - Display late fees separately on invoice
  - Option to waive late fees manually
- **Compliance:** Must comply with local regulations

**US-078: Payment Gateway Integration**
- As a **user**, in order to **accept online payments easily**, I would like to **integrate with payment gateways (Stripe, PayPal, Square, etc.)**.
- **Features:**
  - Embedded payment links in invoices
  - Payment buttons in email and PDF invoices
  - Support for credit/debit cards, ACH, digital wallets
  - Automatic payment reconciliation
  - PCI compliance through gateway
- **Status:** Partial - Stripe integration exists, needs expansion

**US-079: Bank Reconciliation**
- As a **user**, in order to **match payments to invoices**, I would like to **connect my bank account and automatically reconcile transactions**.
- **Features:**
  - Connect bank account (via Plaid, Teller, or similar)
  - Import bank transactions
  - Auto-match transactions to invoices/payments
  - Manual matching for unrecognized transactions
  - Flag discrepancies and missing payments
- **Benefits:** Catch missed payments, maintain accurate books

---

### Bulk Operations & Automation

**US-080: Bulk Invoice Actions**
- As a **user**, in order to **manage invoices efficiently**, I would like to **perform bulk actions on multiple invoices at once**.
- **Actions:**
  - Bulk send invoices (email to multiple clients)
  - Bulk mark as sent/paid
  - Bulk delete/archive
  - Bulk apply tags or categories
  - Bulk change status
  - Bulk export to CSV/Excel
- **UI:** Checkbox selection in invoice list

**US-081: Bulk Client Import**
- As a **user**, in order to **migrate from another system**, I would like to **import multiple clients from CSV/Excel**.
- **Features:**
  - CSV/Excel upload
  - Field mapping (name → system field)
  - Validation and error reporting
  - Preview before import
  - Duplicate detection

**US-082: Batch Invoice Generation**
- As a **premium user**, in order to **invoice multiple clients at once**, I would like to **generate invoices in batch from templates or recurring schedules**.
- **Use cases:** Monthly subscription billing, recurring services, batch billing events

**US-083: Workflow Automation**
- As a **premium user**, in order to **reduce manual work**, I would like to **set up automated workflows for invoice lifecycle events**.
- **Workflow examples:**
  - Auto-send invoice when marked as "sent"
  - Auto-send reminder 3 days before due date
  - Auto-send overdue notice 1 day after due date
  - Auto-create recurring invoices on schedule
  - Auto-update project status when invoice paid
  - Trigger webhooks on invoice events
- **Configuration:** Visual workflow builder or rule-based setup

---

### Document Management

**US-084: Document Attachments**
- As a **user**, in order to **provide supporting documentation**, I would like to **attach files to invoices, quotes, and payments**.
- **Features:**
  - Attach PDF, images, Excel, Word files
  - Multiple attachments per invoice
  - Include attachments in email delivery
  - Client access to attachments in portal
  - File size limits and type restrictions
- **Use cases:** Contracts, work samples, receipts, specifications

**US-085: Invoice Notes & Internal Memos**
- As a **user**, in order to **track context and decisions**, I would like to **add internal notes to invoices that clients cannot see**.
- **Features:**
  - Private notes field on invoices
  - Note history with timestamps
  - Notes visible only to organization members
  - Search invoices by note content
- **Use cases:** Collection notes, special circumstances, payment arrangements

**US-086: Document Archive**
- As a **user**, in order to **maintain compliance and records**, I would like to **archive old invoices and documents with long-term storage**.
- **Features:**
  - Automatic archiving of paid invoices after N days
  - Archive search and retrieval
  - Bulk download archived invoices
  - Compliance with data retention regulations
  - Export archive to external storage

---

### Advanced Reporting & Analytics

**US-087: Profit & Loss Reports**
- As a **premium user**, in order to **understand business profitability**, I would like to **generate profit & loss (P&L) statements**.
- **Features:**
  - Revenue (invoiced and paid amounts)
  - Expenses (tracked expenses)
  - Calculate net profit/loss
  - Filter by date range, client, project
  - Export to PDF/Excel
- **Visualization:** Charts and graphs for trends

**US-088: Tax Reports**
- As a **user**, in order to **prepare for tax filing**, I would like to **generate tax reports showing revenue, VAT collected, and expenses**.
- **Features:**
  - VAT/sales tax summary by rate (0%, 6%, 12%, 25%)
  - Revenue by category or client
  - Deductible expenses
  - Date range selection (fiscal year, quarter, custom)
  - Export to formats compatible with tax software
- **Compliance:** Support for Swedish tax reporting (Bokföringslagen, BAS)

**US-089: Cash Flow Forecasting**
- As a **premium user**, in order to **plan for the future**, I would like to **forecast cash flow based on outstanding invoices and recurring revenue**.
- **Features:**
  - Project future payments based on due dates
  - Factor in recurring invoices and payment history
  - Show expected cash flow by week/month
  - Alert on potential cash shortfalls
  - Visual timeline and charts

**US-090: Aging Reports**
- As a **user**, in order to **manage collections**, I would like to **see accounts receivable aging reports**.
- **Features:**
  - Group outstanding invoices by age (0-30, 31-60, 61-90, 90+ days)
  - Show total outstanding by aging bucket
  - Client-level aging breakdown
  - Identify clients with oldest unpaid invoices
- **Actions:** Prioritize collection efforts

**US-091: Revenue by Client/Product Reports**
- As a **premium user**, in order to **identify top revenue sources**, I would like to **see reports breaking down revenue by client, product, or service**.
- **Features:**
  - Top clients by revenue
  - Product/service revenue breakdown
  - Trend analysis over time
  - Compare periods (month-over-month, year-over-year)
- **Visualization:** Bar charts, pie charts, trend lines

**US-092: Custom Report Builder**
- As a **premium user**, in order to **analyze specific data**, I would like to **create custom reports with selected fields and filters**.
- **Features:**
  - Choose report dimensions (client, product, date, status, etc.)
  - Select metrics (revenue, count, average, etc.)
  - Apply filters and grouping
  - Save report templates for reuse
  - Schedule automated report generation and delivery

**US-093: Export to Accounting Software**
- As a **user**, in order to **integrate with my accounting system**, I would like to **export invoices, payments, and expenses to QuickBooks, Xero, Fortnox, or other accounting platforms**.
- **Features:**
  - Direct integration (API sync)
  - Export to compatible file formats (CSV, IIF, QBO)
  - Map chart of accounts
  - Automatic sync on schedule
  - Manual export option
- **Platforms:** QuickBooks, Xero, Fortnox (Swedish), Visma (Nordic), Sage

---

### Integrations & Ecosystem

**US-094: CRM Integration**
- As a **user**, in order to **sync client data**, I would like to **integrate with CRM systems (Salesforce, HubSpot, Pipedrive, etc.)**.
- **Features:**
  - Sync contacts and companies
  - Create invoices from CRM deals
  - Track invoice status in CRM
  - Bidirectional data sync
- **Benefits:** Single source of truth for client data

**US-095: API & Webhooks**
- As a **developer**, in order to **build custom integrations**, I would like to **access a comprehensive REST API with webhook support**.
- **Features:**
  - Full CRUD operations for all resources
  - Webhook notifications for events (invoice created, paid, etc.)
  - API key authentication
  - Rate limiting and usage monitoring
  - Comprehensive API documentation
- **Versioning:** Versioned API for backward compatibility

**US-096: Zapier Integration**
- As a **user**, in order to **connect with other tools**, I would like to **use Zapier to automate workflows between VisInv and 1000+ other apps**.
- **Triggers:** Invoice created, invoice paid, client added, payment received
- **Actions:** Create invoice, update client, send email, etc.

**US-097: Email Integration**
- As a **user**, in order to **manage invoice emails**, I would like to **integrate with my email provider (Gmail, Outlook) for seamless email communication**.
- **Features:**
  - Send invoices from my business email
  - Track email opens and link clicks
  - Email templates for different scenarios
  - BCC to my email for record-keeping
  - Reply tracking and conversation threads

---

### Inventory Management (for Product-Based Businesses)

**US-098: Inventory Tracking**
- As a **product-based business**, in order to **manage stock levels**, I would like to **track inventory quantities for products**.
- **Features:**
  - Stock quantity for each product
  - Automatically reduce stock when invoiced
  - Low stock alerts
  - Reorder points and quantities
  - Stock adjustment (manual adds/removes)
- **Reports:** Inventory valuation, stock movement

**US-099: Purchase Orders**
- As a **business owner**, in order to **order inventory**, I would like to **create purchase orders for suppliers**.
- **Features:**
  - Create PO with line items and quantities
  - Send PO to supplier
  - Track PO status (ordered, received, cancelled)
  - Receive items and update inventory
  - Link PO to bills/expenses
- **Workflow:** PO → Receive goods → Bill → Payment

**US-100: Cost of Goods Sold (COGS) Tracking**
- As a **user**, in order to **calculate profit margins**, I would like to **track cost of goods sold for products**.
- **Features:**
  - Set cost per product
  - Calculate COGS for each invoice
  - Profit margin calculation (revenue - COGS)
  - Profit reports by product and invoice
- **Use cases:** Product businesses, resellers

---

### Mobile & Accessibility

**US-101: Mobile App (iOS/Android)**
- As a **user on the go**, in order to **manage invoices from my phone**, I would like to **use native mobile apps for iOS and Android**.
- **Features:**
  - Create and send invoices
  - Record time and expenses
  - Capture receipt photos
  - View dashboard and reports
  - Receive push notifications
  - Offline mode with sync
- **Technology:** React Native or Flutter

**US-102: Mobile-Optimized Web Interface**
- As a **user**, in order to **use the platform on mobile browsers**, I would like to **have a fully responsive mobile web interface**.
- **Features:**
  - Touch-friendly UI elements
  - Mobile-optimized forms and lists
  - Fast loading on mobile networks
  - Progressive Web App (PWA) capabilities

**US-103: Accessibility Compliance (WCAG)**
- As a **user with disabilities**, in order to **use the platform effectively**, I would like to **have full accessibility support compliant with WCAG 2.1 AA standards**.
- **Features:**
  - Screen reader compatibility
  - Keyboard navigation
  - High contrast themes
  - Proper ARIA labels
  - Alt text for images
  - Focus indicators
- **Testing:** Automated and manual accessibility testing

---

### Security & Compliance Enhancements

**US-104: Two-Factor Authentication (2FA)**
- As a **user**, in order to **secure my account**, I would like to **enable two-factor authentication**.
- **Methods:** Authenticator app (TOTP), SMS codes, email codes
- **Features:** Enforce 2FA for organization, backup codes

**US-105: Single Sign-On (SSO)**
- As an **enterprise user**, in order to **manage authentication centrally**, I would like to **use Single Sign-On with our identity provider**.
- **Protocols:** SAML 2.0, OAuth 2.0, OpenID Connect
- **Providers:** Okta, Azure AD, Google Workspace, Auth0

**US-106: Activity Audit Trail**
- As an **organization owner**, in order to **track user actions**, I would like to **view an audit log of all activities**.
- **Logged events:**
  - Invoice created/edited/deleted
  - Payment recorded
  - Client added/edited
  - User invited/removed
  - Settings changed
  - Login attempts
- **Details:** User, timestamp, action, changes made, IP address

**US-107: GDPR Compliance Tools**
- As a **user**, in order to **comply with GDPR**, I would like to **provide data export and deletion for clients**.
- **Features:**
  - Export all client data (invoices, payments, communication)
  - Right to be forgotten (delete client and all data)
  - Data processing agreements
  - Cookie consent management
  - Privacy policy and terms acceptance tracking

**US-108: Data Encryption**
- As a **user**, in order to **protect sensitive data**, I would like to **have all data encrypted at rest and in transit**.
- **Implementation:**
  - TLS/SSL for data in transit
  - Database encryption at rest
  - Encrypted storage for file uploads
  - Secure key management

**US-109: Backup & Disaster Recovery**
- As a **user**, in order to **protect against data loss**, I would like to **have automated backups with recovery options**.
- **Features:**
  - Daily automated backups
  - Point-in-time recovery
  - Backup retention policy
  - Test recovery procedures
  - Download backups (for premium users)

---

### White Label & Multi-Tenancy

**US-110: White Label Branding**
- As an **enterprise or agency**, in order to **offer invoicing to my clients**, I would like to **white label the platform with my branding**.
- **Features:**
  - Custom domain (invoicing.mycompany.com)
  - Replace logo and brand colors
  - Custom email sender address
  - Remove VisInv branding from interface and emails
  - Custom terms of service and privacy policy
- **Tier:** Enterprise plan

**US-111: Multi-Tenant Architecture**
- As a **platform administrator**, in order to **scale the platform**, I would like to **support multiple tenants with complete data isolation**.
- **Features:**
  - Tenant-level configuration
  - Separate billing per tenant
  - Usage tracking per tenant
  - Tenant-specific customizations

**US-112: Reseller/Partner Program**
- As a **reseller**, in order to **offer VisInv to my clients**, I would like to **have a partner dashboard to manage multiple client accounts**.
- **Features:**
  - Create and manage client accounts
  - Set pricing and billing
  - View aggregated analytics
  - Support tickets and billing management
  - Revenue sharing configuration

---

### Customer Support & Help

**US-113: In-App Help & Documentation**
- As a **user**, in order to **learn the platform**, I would like to **access help articles and tutorials within the app**.
- **Features:**
  - Searchable knowledge base
  - Context-sensitive help (tooltips, guides)
  - Video tutorials
  - Interactive product tours
  - FAQ section

**US-114: Live Chat Support**
- As a **premium user**, in order to **get quick help**, I would like to **use live chat support**.
- **Features:**
  - In-app chat widget
  - Business hours support
  - Chat history
  - File sharing in chat
- **Integration:** Intercom, Zendesk Chat, or custom solution

**US-115: Ticket-Based Support System**
- As a **user**, in order to **get help with complex issues**, I would like to **submit and track support tickets**.
- **Features:**
  - Submit ticket from app or email
  - Track ticket status
  - Receive updates via email
  - Attach screenshots and files
  - Priority support for premium users

---

### Marketing & Growth Features

**US-116: Referral Program**
- As a **user**, in order to **earn rewards**, I would like to **refer new users and receive discounts or credits**.
- **Features:**
  - Unique referral link
  - Track referrals and conversions
  - Rewards (discount, free months, cash)
  - Referral dashboard

**US-117: Email Marketing Integration**
- As a **user**, in order to **stay in touch with clients**, I would like to **integrate with email marketing platforms (Mailchimp, SendGrid, etc.)**.
- **Features:**
  - Sync client list
  - Tag clients by activity (paid, overdue, etc.)
  - Trigger email campaigns based on invoice events

**US-118: Client Feedback & Ratings**
- As a **user**, in order to **improve service**, I would like to **request feedback from clients after invoice payment**.
- **Features:**
  - Automated feedback request after payment
  - Simple rating (1-5 stars)
  - Optional text feedback
  - View feedback dashboard
  - Respond to feedback

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
12. **Quotes/Estimates** - Pre-invoice proposals with conversion tracking
13. **Time Entries** - Billable time tracking linked to clients/projects
14. **Expenses** - Business expense tracking with receipt attachments
15. **Projects** - Project management with budget and billing tracking
16. **Client Portal Users** - Client login credentials and permissions
17. **Recurring Schedules** - Automated recurring invoice configurations
18. **Documents** - File attachments linked to invoices, quotes, clients
19. **Bank Accounts** - Connected bank accounts for reconciliation
20. **Transactions** - Bank transactions for matching to payments
21. **Purchase Orders** - Supplier orders and inventory receiving
22. **Inventory** - Stock levels and product inventory tracking

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
- Quote creation (limited)
- Payment recording
- Basic time & expense tracking

### Premium Tier
- Unlimited invoices
- Custom templates
- Team collaboration
- Advanced analytics
- Recurring invoices
- Multi-currency support
- Automated reminders
- Advanced payment tracking
- Unlimited quotes/estimates
- Time & expense tracking with projects
- Client portal access
- Bulk operations
- Document attachments
- Bank reconciliation
- Advanced reporting (P&L, tax reports)
- Priority support

### Enterprise Tier
- All Premium features
- White label branding
- SSO (Single Sign-On)
- Custom domain
- Advanced security features
- Dedicated account manager
- API access with higher limits
- Custom integrations
- SLA guarantees
- On-premise deployment option
- Multi-tenant management

### Admin Access
- Full feature access
- User management
- Platform analytics
- Audit logs
- System configuration
- Tenant management
- Partner/reseller dashboard

---

## Priority Levels

### Phase 1 (MVP)
- US-001, US-002, US-003 (Authentication)
- US-004, US-005, US-006, US-008, US-009, US-010 (Free tier core)
- US-011 (Predefined templates)
- US-019, US-020, US-021, US-023 (Basic invoice management)
- US-041, US-042 (Security fundamentals)
- US-052, US-053, US-054 (Organization management)

### Phase 2 (Premium Launch)
- US-012, US-013 (Stripe & unlimited invoices)
- US-014, US-015, US-061 (Custom templates)
- US-033, US-034 (i18n)
- US-044 (Stripe webhooks)
- US-050, US-051 (VAT management)
- US-063, US-064 (Credit invoices, invoice numbering)
- US-056, US-057 (Organization invitations and member management)

### Phase 3 (Collaboration & Advanced Features)
- US-058, US-059, US-060 (Multi-organization, teams)
- US-024, US-025 (Multi-currency & recurring)
- US-026, US-026-A, US-027, US-028 (Notifications & reminders)
- US-029, US-030, US-031, US-032, US-062 (Analytics & reporting)
- US-040, US-043 (Advanced security)
- US-036, US-037, US-037-A, US-037-B, US-037-C, US-037-D, US-038, US-039 (Admin features)

### Phase 4 (Quotes, Time & Expenses)
- US-065, US-066, US-067 (Estimates & quotes)
- US-068, US-069, US-070, US-071 (Time & expense tracking, projects)
- US-075, US-076, US-077, US-078 (Advanced payment features)
- US-080, US-081, US-082, US-083 (Bulk operations & automation)
- US-087, US-088, US-089, US-090, US-091, US-092 (Advanced reporting)

### Phase 5 (Client Portal & Integrations)
- US-072, US-073, US-074 (Client portal & self-service)
- US-079 (Bank reconciliation)
- US-084, US-085, US-086 (Document management)
- US-093, US-094, US-095, US-096, US-097 (Integrations & ecosystem)
- US-104, US-105, US-106, US-107, US-108, US-109 (Enhanced security)

### Phase 6 (Inventory & Product Businesses)
- US-098, US-099, US-100 (Inventory & COGS tracking)

### Phase 7 (Mobile & Enterprise)
- US-101, US-102, US-103 (Mobile apps & accessibility)
- US-110, US-111, US-112 (White label & multi-tenancy)
- US-113, US-114, US-115 (Support systems)
- US-116, US-117, US-118 (Marketing & growth features)

---

## Notes
- Legacy templating code to be integrated
- Admin email: thomas@communitaslabs.io
- All timestamps should use UTC
- Currency default: SEK (Swedish Krona)
- Tax rates configurable per invoice

---

## Feature Summary

### Implementation Status Overview

| Category | Total Features | Implemented ✅ | Partial 🔶 | Planned 📋 |
|----------|---------------|---------------|-----------|-----------|
| **Authentication & User Management** | 3 | 2 | 1 | 0 |
| **Organization Management** | 9 | 3 | 0 | 6 |
| **Free Tier Features** | 8 | 6 | 0 | 2 |
| **Premium Features** | 4 | 3 | 0 | 1 |
| **Invoice Management** | 8 | 7 | 0 | 1 |
| **Notifications & Reminders** | 4 | 0 | 0 | 4 |
| **Analytics & Reporting** | 5 | 3 | 0 | 2 |
| **Internationalization** | 3 | 0 | 0 | 3 |
| **Administration** | 9 | 4 | 0 | 5 |
| **Security & Data Management** | 3 | 0 | 0 | 3 |
| **Integration & Webhooks** | 2 | 0 | 0 | 2 |
| **Developer & Operations** | 3 | 0 | 0 | 3 |
| **Estimates & Quotes** | 3 | 0 | 0 | 3 |
| **Time & Expense Tracking** | 4 | 0 | 0 | 4 |
| **Client Portal** | 3 | 0 | 0 | 3 |
| **Advanced Payment Features** | 5 | 0 | 1 | 4 |
| **Bulk Operations** | 4 | 0 | 0 | 4 |
| **Document Management** | 3 | 0 | 0 | 3 |
| **Advanced Reporting** | 6 | 0 | 0 | 6 |
| **Integrations & Ecosystem** | 5 | 0 | 0 | 5 |
| **Inventory Management** | 3 | 0 | 0 | 3 |
| **Mobile & Accessibility** | 3 | 0 | 0 | 3 |
| **Security Enhancements** | 6 | 0 | 0 | 6 |
| **White Label** | 3 | 0 | 0 | 3 |
| **Support & Growth** | 6 | 0 | 0 | 6 |
| **TOTAL** | **118** | **28** | **2** | **88** |

### Quick Reference: User Stories by Number

**Authentication & Management (US-001 to US-064)**: Core platform functionality
- US-001 to US-003: User authentication
- US-004 to US-011: Free tier features
- US-012 to US-018: Premium tier features
- US-019 to US-025: Invoice management
- US-026 to US-028: Notifications
- US-029 to US-032: Analytics
- US-033 to US-035: Internationalization
- US-036 to US-040: Administration
- US-041 to US-043: Security
- US-044 to US-048: Developer features
- US-050 to US-064: Swedish compliance & advanced features

**New Features for Full System (US-065 to US-118)**: Competitive feature set
- US-065 to US-067: Estimates & Quotes
- US-068 to US-071: Time & Expense Tracking
- US-072 to US-074: Client Portal
- US-075 to US-079: Advanced Payments
- US-080 to US-083: Bulk Operations
- US-084 to US-086: Document Management
- US-087 to US-092: Advanced Reporting
- US-093 to US-097: Integrations
- US-098 to US-100: Inventory Management
- US-101 to US-103: Mobile & Accessibility
- US-104 to US-109: Security Enhancements
- US-110 to US-112: White Label & Multi-tenancy
- US-113 to US-118: Support & Growth

---

## Competitive Analysis

### How VisInv Compares to Industry Leaders

| Feature Category | FreshBooks | QuickBooks | VisInv (Planned) |
|------------------|------------|------------|------------------|
| **Basic Invoicing** | ✅ | ✅ | ✅ Implemented |
| **Custom Templates** | ✅ | ✅ | ✅ Implemented |
| **Time Tracking** | ✅ | ⚠️ Add-on | 📋 US-068 |
| **Expense Tracking** | ✅ | ✅ | 📋 US-069 |
| **Estimates/Quotes** | ✅ | ✅ | 📋 US-065 |
| **Client Portal** | ✅ | ✅ | 📋 US-072 |
| **Recurring Invoices** | ✅ | ✅ | 📋 US-025 |
| **Multi-Currency** | ✅ | ✅ | 📋 US-024 |
| **Payment Processing** | ✅ | ✅ | 🔶 US-078 |
| **Mobile Apps** | ✅ | ✅ | 📋 US-101 |
| **Project Management** | ✅ | ⚠️ Limited | 📋 US-071 |
| **Inventory** | ❌ | ✅ | 📋 US-098 |
| **Payroll** | ⚠️ 3rd party | ✅ | ⏸️ Future |
| **Double-Entry Accounting** | ❌ | ✅ | ⏸️ Future |
| **Bank Reconciliation** | ⚠️ Limited | ✅ | 📋 US-079 |
| **Team Collaboration** | ✅ | ✅ | ✅ Implemented |
| **API & Integrations** | ✅ | ✅ | 📋 US-095 |
| **White Label** | ❌ | ❌ | 📋 US-110 |
| **Swedish Compliance** | ⚠️ Generic | ⚠️ Generic | ✅ Built-in |

**Legend:**
- ✅ = Available
- 🔶 = Partial/In Progress
- 📋 = Planned
- ⚠️ = Limited or add-on
- ❌ = Not available
- ⏸️ = Not currently planned

### VisInv Competitive Advantages

1. **Swedish Market Focus**: Built-in Swedish compliance (VAT, F-skatt, credit invoices, Bokföringslagen)
2. **Modern Tech Stack**: React, Vite, Tailwind CSS for fast, responsive UI
3. **White Label Option**: Unique offering for agencies and resellers (Enterprise tier)
4. **Flexible Organization Model**: Multi-organization with team structure
5. **Open Architecture**: Resource pattern for easy customization and extensions
6. **Comprehensive Template System**: Visual editor with Handlebars templating
7. **Fair Pricing**: Competitive pricing with generous free tier (10 invoices)

### Target Market Positioning

- **Freelancers & Solopreneurs**: Compete with FreshBooks on simplicity and design
- **Swedish SMBs**: Unique value with built-in compliance features
- **Growing Businesses**: Match QuickBooks on features, exceed on UX
- **Agencies & Resellers**: Win with white label and multi-tenant capabilities
- **International Companies with Swedish Operations**: Only solution with true Swedish compliance

---

## Roadmap Timeline Estimate

### 2024 Q1-Q2: Foundation Complete ✅
- Core authentication, organizations, clients
- Invoice creation and management
- Templates and PDF generation
- Swedish compliance features
- Basic admin dashboard

### 2024 Q3-Q4: Premium & Collaboration
- Stripe integration
- Recurring invoices
- Multi-currency support
- Enhanced team features
- Advanced reporting
- Notification system

### 2025 Q1-Q2: Professional Services Features
- Estimates & quotes (US-065 to US-067)
- Time & expense tracking (US-068 to US-071)
- Project management
- Advanced payments (US-075 to US-078)
- Document attachments

### 2025 Q3: Client Experience & Automation
- Client portal (US-072 to US-074)
- Bulk operations (US-080 to US-083)
- Workflow automation
- Bank reconciliation (US-079)
- Enhanced reporting (US-087 to US-092)

### 2025 Q4: Integrations & Ecosystem
- Accounting software exports (US-093)
- CRM integrations (US-094)
- API & webhooks (US-095)
- Zapier & email integrations (US-096, US-097)
- Mobile-optimized web (US-102)

### 2026 Q1-Q2: Mobile & Enterprise
- Native mobile apps (US-101)
- Inventory management (US-098 to US-100)
- SSO & advanced security (US-104 to US-109)
- Accessibility (WCAG) compliance (US-103)

### 2026 Q3+: Scale & Growth
- White label & multi-tenant (US-110 to US-112)
- Enhanced support systems (US-113 to US-115)
- Marketing & growth features (US-116 to US-118)
- Performance optimization
- Global expansion features
