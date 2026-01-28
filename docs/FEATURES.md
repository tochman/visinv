# VisInv - Feature Documentation

## Overview

This document provides a comprehensive list of user stories for the VisInv platform - a **full-featured Swedish accounting and invoicing solution**. The platform is organized into three major modules:

1. **Invoicing (Fakturering)** - Invoice creation, templates, payments, clients, products
2. **Accounting (Bokföring)** - General ledger, journal entries, financial reports, Swedish compliance
3. **Time & Projects (Tid & Projekt)** - Time tracking, expenses, project management (planned)

Features are organized into logical categories and prioritized into development phases to guide implementation from the current invoicing MVP to a fully-featured enterprise accounting system.

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

**US-052: Organization Creation** ✅
- As a **user**, in order to **represent my company on invoices**, I would like to **create an organization with company information (name, organization number, VAT number, address, municipality, bank details)**.
- **Required fields (Swedish compliance):** Company name, organization number, VAT registration number, address, municipality
- **Optional fields:** Bank/giro number, F-skatt approval, contact details, website
- **Implementation:**
  - Database: organizations table (migration 007) with all required Swedish compliance fields
  - UI: OrganizationSetupWizard with 4-step wizard (Basic Info, Address, Banking, Invoice Settings)
  - Resource: Organization resource with CRUD operations
  - Context: OrganizationContext for managing current organization state
  - Validation: Required fields enforced, Swedish org number format validation
- **Tests:** Comprehensive Cypress test suite (organizations.cy.js) covering wizard flow, navigation, and organization creation
- **Status:** ✅ Complete

**US-053: Organization Logo Upload**
- As an **organization owner**, in order to **brand my invoices professionally**, I would like to **upload my company logo to appear on all invoices**.
- **Status:** Not Started

**US-054: Organization Settings Management** ✅
- As an **organization owner**, in order to **maintain accurate company information**, I would like to **edit organization details, payment terms, and invoice settings**.
- **Invoice settings:** Default payment terms, currency, tax rate, invoice number prefix, next invoice number
- **Implementation:**
  - UI: OrganizationSettings component with edit mode
  - Resource: Organization.update() method
  - Features: Editable organization details, banking info, invoice settings, logo upload
  - Validation: All required fields validated on update
  - Real-time updates: OrganizationContext refreshes on successful update
- **Tests:** Cypress test suite (organizations.cy.js) covering display, edit mode, field updates
- **Status:** ✅ Complete

**US-055: Organization-Scoped Invoice Numbering** ✅
- As an **organization**, in order to **maintain proper Swedish accounting compliance**, I would like to **have invoice numbers in unbroken sequence at organization level, shared by all users in the organization**.
- **Technical:** Invoice numbers scoped to organization_id, not user_id
- **Implementation:**
  - Database: organization_id foreign key in invoices table
  - Invoice numbering: generateInvoiceNumber() scoped to organization_id
  - Sequence tracking: next_invoice_number stored per organization
  - RLS policies: Updated to enforce organization-based data isolation
- **Status:** ✅ Complete (refactored with US-064)

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

**US-057: Organization Member Management** ✅
- As an **organization owner**, in order to **control access**, I would like to **view all organization members, manage their roles (owner/associate), and remove users**.
- **Status:** Implemented - OrganizationMembers component with role management, member removal, 55 Cypress tests

**US-058: Multi-Organization Support** ✅
- As a **user**, in order to **work with multiple companies**, I would like to **belong to multiple organizations and switch between them**.
- As a **premium user**, in order to **manage multiple businesses**, I would like to **create additional organizations beyond my first one**.
- **Acceptance Criteria:**
  - Users can belong to multiple organizations via `organization_members` junction table
  - Premium/admin users can create new organizations from the OrganizationSwitcher dropdown
  - Users can switch between organizations using the OrganizationSwitcher in the sidebar
  - **Data Isolation:** When switching organizations, users only see data (invoices, clients, products) for the currently selected organization
  - Newly created organizations automatically become the current organization
  - Each organization membership has a role (owner/associate)
- **Status:** Implemented - OrganizationSwitcher component, multi-org context, 23 Cypress E2E tests including 8 data isolation tests

**US-059: Team/Department Management**
- As an **organization owner**, in order to **organize users by department**, I would like to **create teams within my organization and assign members to teams**.
- **Use cases:** Sales team, Support team, Regional offices, Departments

**US-060: Team-Scoped Data Access**
- As a **team member**, in order to **collaborate efficiently**, I would like to **optionally scope clients and invoices to specific teams while maintaining organization-wide visibility for owners/admins**.

---

### Free Tier Features

**US-004: Free Invoice Limit** ✅
- As a **free user**, in order to **try the platform before committing**, I would like to **create and send up to 10 invoices for free**.
- **Status:** Implemented - Enforces 10 invoice limit for free users, shows upgrade modal when limit reached, premium users have unlimited invoices
- **Technical:** 
  - `appConfig.freeInvoiceLimit: 10` constant
  - `subscriptionsSlice` tracks `invoiceCount` and `isPremium` status
  - `Invoices.jsx` checks limit in `handleCreate()` before opening modal
  - `UpgradeModal` component displays upgrade prompt
  - Auto-increments count after successful invoice creation
  - 5 Cypress tests covering free user below limit, at limit (upgrade modal), and premium unlimited

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
  - **US-020-A: Single Payment Recording** ✅ - Record a single payment with amount, date, method, reference, and notes
  - **US-020-B: Partial Payment Support** ✅ - Support multiple partial payments against one invoice, track remaining balance
  - **US-020-C: Payment History** ✅ - View complete payment history for each invoice with dates, amounts, and methods
  - **US-020-D: Automatic Status Updates** ✅ - Automatically mark invoice as 'paid' when fully paid, revert to 'sent' if payment deleted
  - **US-020-E: Payment Confirmation Dialog** - Show confirmation dialog when marking invoice as paid from list view
  - **US-020-F: Payment Recording from Invoice Detail** - Record payment from within invoice detail/edit view
  - **US-020-G: Enhanced Payment Method Selection** - Support Swedish payment methods with proper categorization
  - Database: payments table with invoice_id FK, amount, payment_date, payment_method, reference, notes
  - Backend: Payment resource with validation against remaining balance, Invoice methods for balance calculation
  - UI: PaymentModal for recording payments with real-time balance validation, InvoiceDetail with payment history
  - i18n: Full English/Swedish translations for payment terminology
  - Features: Prevent overpayment, calculate remaining balance, support 6 payment methods (bank_transfer, swish, card, cash, check, other)
  - Tests: 12 Cypress E2E tests covering recording, validation, history, partial payments

**US-020-E: Payment Confirmation Dialog**
- As a **user**, in order to **ensure payment data accuracy**, I would like to **confirm payment details before marking an invoice as paid from the list view**.
- **User Flow:**
  1. User clicks "Mark as Paid" button in invoice list
  2. Dialog appears requesting payment details
  3. User enters payment date (defaults to today)
  4. User selects payment method from dropdown
  5. User optionally adds reference/notes
  6. User confirms or cancels
  7. Payment is recorded and invoice status updated to 'paid'
- **Acceptance Criteria:**
  - ✅ Dialog appears when clicking "Mark as Paid" button in list view
  - ✅ Payment date field defaults to current date, user can change
  - ✅ Payment method dropdown includes all Swedish payment methods (see US-020-G)
  - ✅ Payment amount defaults to full outstanding amount (read-only in quick dialog)
  - ✅ Optional reference field for transaction/check number
  - ✅ Cancel button closes dialog without changes
  - ✅ Confirm button records payment and updates invoice status
  - ✅ Success toast notification after recording payment
  - ✅ Error handling for failed payment recording
- **Technical Requirements:**
  - Component: PaymentConfirmationDialog.jsx (new)
  - Props: invoice (object), onConfirm (function), onCancel (function)
  - Validation: Payment date cannot be in the future
  - Integration: Update handleMarkAsPaid() in Invoices.jsx to show dialog
  - Redux: Use existing createPayment thunk from payments slice
- **i18n Keys:** payment.confirmDialog.title, payment.confirmDialog.confirm, payment.confirmDialog.cancel, payment.dateLabel, payment.methodLabel, payment.referenceLabel
- **Tests:** 
  - Dialog appears on button click
  - Payment date defaults to today
  - All payment methods available
  - Cancel closes dialog without changes
  - Confirm records payment and updates status
  - Validation for future dates

**US-020-F: Payment Recording from Invoice Detail View**
- As a **user**, in order to **record payments in context**, I would like to **record payments while viewing or editing an invoice**.
- **User Flow:**
  1. User views invoice detail or opens invoice for editing
  2. User sees "Record Payment" button in invoice header/actions
  3. User clicks button, payment dialog appears
  4. User enters payment details (amount, date, method, reference)
  5. User confirms payment
  6. Payment is recorded, invoice updates if fully paid
  7. Payment appears in payment history section
- **Acceptance Criteria:**
  - ✅ "Record Payment" button visible in InvoiceDetail view for 'sent' or 'overdue' invoices
  - ✅ "Record Payment" button visible in InvoiceModal (edit mode) for sent invoices
  - ✅ Payment dialog supports partial payments (user can enter any amount ≤ remaining balance)
  - ✅ Payment date field with date picker
  - ✅ Payment method dropdown with all options
  - ✅ Reference and notes fields
  - ✅ Real-time validation of payment amount against remaining balance
  - ✅ Success notification showing remaining balance if partial payment
  - ✅ Payment history section refreshes to show new payment
  - ✅ Invoice status auto-updates to 'paid' when fully paid
- **Technical Requirements:**
  - Reuse existing PaymentModal component
  - Add "Record Payment" button to InvoiceDetail.jsx
  - Add "Record Payment" button to InvoiceModal.jsx (shown when editing sent invoice)
  - Hook into existing createPayment Redux thunk
  - Refresh payment history after successful recording
- **i18n Keys:** payment.recordPayment, payment.remainingBalance, payment.fullPayment, payment.partialPayment
- **Tests:**
  - Button appears in detail view for sent/overdue invoices
  - Button does not appear for draft/paid/cancelled invoices
  - Dialog opens with correct invoice context
  - Partial payment reduces remaining balance
  - Full payment marks invoice as paid
  - Payment history updates immediately

**US-020-G: Enhanced Payment Method Selection for Swedish Market**
- As a **user**, in order to **accurately categorize payments**, I would like to **select from common Swedish payment methods**.
- **Payment Methods (Swedish Context):**
  1. **Bankgiro** (Bank Giro) - Most common for business payments in Sweden
  2. **Plusgiro** (Postgiro) - Alternative giro system
  3. **Banköverföring** (Bank Transfer/Wire) - Direct bank account transfer
  4. **Swish** - Popular Swedish mobile payment system
  5. **Kontant** (Cash) - Cash payment
  6. **Kort** (Card) - Credit/debit card payment
  7. **Autogiro** (Direct Debit) - Automatic bank withdrawal
  8. **Övrigt** (Other) - Other payment methods
- **Acceptance Criteria:**
  - ✅ Payment method dropdown shows Swedish payment methods with Swedish names
  - ✅ Methods stored in English keys in database (bankgiro, plusgiro, bank_transfer, swish, cash, card, autogiro, other)
  - ✅ Display names translated via i18n (Swedish and English)
  - ✅ Icon indicators for each payment method (optional enhancement)
  - ✅ Method is required field when recording payment
  - ✅ Historical payments display correct method name in current language
- **Technical Requirements:**
  - Update payment method constants in config/constants.js
  - Database: payment_method column accepts new values (migration may be needed)
  - Component: PaymentMethodSelect.jsx (reusable dropdown component)
  - Existing payments with old methods (bank_transfer, check) remain valid
  - Backward compatibility: Map old 'bank_transfer' to 'banköverföring' in display
- **i18n Keys:** 
  - payment.methods.bankgiro, payment.methods.plusgiro, payment.methods.bank_transfer
  - payment.methods.swish, payment.methods.cash, payment.methods.card
  - payment.methods.autogiro, payment.methods.other
- **Tests:**
  - All payment methods available in dropdown
  - Swedish names display in Swedish locale
  - English names display in English locale
  - Payment method stored correctly in database
  - Historical payments display with correct method name

**US-021: Invoice Numbering System** ✅
- As a **user**, in order to **maintain professional record-keeping**, I would like to **automatically generate sequential invoice numbers with custom formats**.
- **Status:** Implemented - generateInvoiceNumber() with INV-0001 format, auto-increments per organization (refactored for US-055, US-064)
- **Completed:**
  - ✅ Refactored to use organization_id instead of user_id for Swedish compliance (US-055)
  - ✅ Added support for manual invoice numbering mode (US-064)

**US-022: Per-Client Invoice Sequences**
- As a **user**, in order to **organize invoices by client**, I would like to **maintain separate invoice number sequences for different clients** (optional).

**US-022-A: Save or Send Invoice from Creation Modal** ✅
- As a **user**, in order to **control my invoice workflow**, I would like to **either save an invoice as a draft or send it immediately from the creation modal**.
- **Current Problem:** Two-step process requires saving first, then marking as sent
- **Proposed Solution:** Modal footer with two action buttons: "Save as Draft" and "Send Invoice"
- **Behavior:**
  - **Save as Draft:** Creates invoice with status='draft', assigns invoice number, closes modal, shows success toast
  - **Send Invoice:** Creates invoice with status='sent', assigns invoice number, triggers email (if configured), closes modal, shows success toast
  - Both actions validate required fields before proceeding
  - "Send Invoice" may show confirmation dialog with email preview (optional)
- **Benefits:** 
  - Faster workflow for immediate invoicing
  - Clear intent separation (draft vs. final)
  - Reduces clicks and confusion
- **i18n Keys:** invoice.saveAsDraft, invoice.sendInvoice, invoice.sentSuccessfully, invoice.draftSavedSuccessfully
- **Technical:**
  - InvoiceModal: Add two submit buttons with different handlers
  - Create thunks: createInvoiceDraft() and createAndSendInvoice()
  - Validation: Both require same field validation
  - Email: sendInvoice() triggers email notification to client (if US-027 implemented)

**US-022-B: Edit Lock for Sent Invoices** ✅
- As a **user**, in order to **maintain invoice integrity and compliance**, I would like to **prevent editing or deleting invoices once they are sent**.
- **Compliance Rationale:** 
  - Swedish Bokföringslagen requires maintaining original invoice records
  - Audit trail integrity for tax purposes
  - Prevents accidental modification of legally binding documents
- **Edit Restrictions:**
  - Invoices with status='sent', 'paid', 'overdue' cannot be edited
  - Edit button disabled in invoice list for non-draft invoices
  - Opening sent invoice shows read-only view (no edit modal)
  - Display lock icon and message: "This invoice cannot be edited because it has been sent"
- **Delete Restrictions:**
  - Delete action hidden/disabled for non-draft invoices
  - If user attempts to delete via URL/API, show error message
  - Error message: "Sent invoices cannot be deleted. Create a credit invoice instead."
- **Allowed Actions on Sent Invoices:**
  - View/download PDF
  - Mark as paid
  - Record payments
  - Send reminder
  - Create credit invoice (US-063)
  - Copy invoice (US-022-C)
- **Visual Indicators:**
  - Lock icon in invoice list for sent invoices
  - Disabled edit/delete buttons with tooltip explanation
  - Badge showing invoice is locked
- **i18n Keys:** 
  - invoice.locked, invoice.cannotEditSent, invoice.cannotDeleteSent
  - invoice.useCreditInvoiceInstead, invoice.invoiceIsReadOnly
- **Technical:**
  - Frontend: Conditional rendering of edit/delete buttons based on status
  - Backend: Validate status before allowing updates/deletes in Invoice resource
  - Database: Add CHECK constraint to prevent updates on sent invoices (optional)
  - Error handling: Return 403 Forbidden with clear error message

**US-022-C: Copy Invoice** ✅
- As a **user**, in order to **quickly create similar invoices**, I would like to **copy an existing invoice with the same client and line items**.
- **Use Cases:**
  - Recurring work for same client (monthly retainer, ongoing services)
  - Similar projects for different clients (change client, keep items)
  - Correcting a sent invoice (copy, modify, send new one, credit the old one)
  - Template-like workflow without formal recurring invoices
- **Functionality:**
  - "Copy Invoice" action in invoice list and detail view
  - Creates new draft invoice with:
    - Same client
    - Same line items (description, quantity, unit_price, tax_rate)
    - Same currency
    - Same template selection
    - New invoice number (auto-generated)
    - New invoice date (today)
    - New due date (today + default payment terms, e.g., 30 days)
    - Status: draft
    - All other fields reset (no payments, no reminder history)
  - Opens InvoiceModal in edit mode with copied data
  - User can modify before saving
- **Visual Design:**
  - "Copy" button with duplicate/copy icon in invoice list dropdown
  - "Copy Invoice" button in invoice detail view
  - Modal title shows: "Copy Invoice - Based on INV-1234"
  - Info banner in modal: "This is a copy of invoice INV-1234. Modify as needed before saving."
- **Benefits:**
  - Saves time for repetitive invoicing
  - Reduces data entry errors
  - Faster than recurring invoices for irregular patterns
- **i18n Keys:** 
  - invoice.copy, invoice.copyInvoice, invoice.basedOn
  - invoice.copyDescription, invoice.invoiceCopied
- **Technical:**
  - Frontend: Add copyInvoice() thunk in invoicesSlice
  - Resource: Invoice.copy(id) method to fetch and transform data
  - Populate InvoiceModal with copied data
  - Generate new invoice number on save
  - Validation: Ensure all copied data is valid

**US-022-D: Draft-Only Edit Mode** ✅
- As a **user**, in order to **have clarity on what can be changed**, I would like to **only see edit functionality for draft invoices**.
- **Current Problem:** Edit action may be visible/available for all invoices, causing confusion
- **Proposed Solution:** 
  - Edit button only appears for invoices with status='draft'
  - For sent/paid/overdue invoices, show "View" button instead
  - View mode shows all invoice data in read-only format
  - Clear visual distinction between editable (draft) and locked (sent) invoices
- **List View Changes:**
  - Draft invoices: Pencil icon → "Edit" (opens edit modal)
  - Sent invoices: Eye icon → "View" (opens read-only view)
  - Lock badge on sent/paid/overdue invoices
- **Detail View Changes:**
  - Draft: "Edit Invoice" button available
  - Sent: "Edit Invoice" button replaced with info message
  - Info message: "This invoice is locked and cannot be edited. Use Copy to create a similar invoice."
- **Benefits:**
  - Prevents user frustration from trying to edit locked invoices
  - Clear visual communication of invoice state
  - Guides users to correct workflow (copy instead of edit)
- **i18n Keys:** 
  - invoice.view, invoice.viewInvoice, invoice.editOnlyDrafts
  - invoice.copyToEdit
- **Technical:**
  - Conditional rendering based on invoice.status
  - Read-only modal variant for viewing sent invoices
  - Tooltip on disabled edit button explaining why

**US-022-E: Audit Trail for Invoice Lifecycle** ✅
- As a **user**, in order to **track invoice history**, I would like to **see an audit trail of all status changes and key events**.
- **Status:** ✅ Complete - Implemented with invoice_events table, InvoiceEvent resource, AuditTrail component, and comprehensive E2E tests
- **Tracked Events:**
  - Invoice created (draft)
  - Invoice sent (with timestamp and user)
  - Invoice viewed by client (if tracking enabled)
  - Payment recorded (with amount, date, method)
  - Status changes (draft → sent → paid/overdue)
  - Reminder sent (with count and timestamps)
  - Credit invoice created (reference to credit invoice)
  - Invoice copied (reference to new invoice)
- **Display:**
  - Timeline view in invoice detail page
  - Each event shows: timestamp, event type, user (if applicable), details
  - Visual timeline with icons for each event type
  - Expandable details for complex events (payment details, etc.)
- **Benefits:**
  - Complete history for accounting and compliance
  - Transparency for multi-user organizations
  - Debugging and support assistance
  - Swedish compliance (Bokföringslagen audit requirements)
- **Technical:**
  - Database: invoice_events table (invoice_id, event_type, event_data JSON, user_id, created_at)
  - Resource: InvoiceEvent.js for CRUD operations
  - Hook: useInvoiceAuditTrail(invoiceId) to fetch timeline
  - Component: AuditTrail.jsx to display events
- **Future Enhancement:** Link to US-040 (full audit logs system)

**US-023: Tax/VAT Calculations** ✅
- As a **user**, in order to **comply with tax regulations**, I would like to **automatically calculate and display taxes (including Swedish moms)**.
- **Status:** Implemented - Automatic calculation in InvoiceModal, configurable tax rate (default 25% Swedish moms), tested in invoice tests

**US-024: Multi-Currency Support** ✅
- As a **premium user**, in order to **invoice international clients**, I would like to **create invoices in different currencies**.
- **Supported Currencies:** SEK (Swedish Krona), EUR (Euro), USD (US Dollar), GBP (British Pound), NOK (Norwegian Krone), DKK (Danish Krone)
- **Features:**
  - Currency selector in invoice creation with all major currencies
  - Currency symbol display with proper positioning (before/after amount)
  - Automatic exchange rate calculation and storage for historical accuracy
  - Static exchange rates configurable in `currencies.js`
  - Proper currency formatting in invoice list, detail view, and PDF
  - Multi-currency aware dashboard (shows primary currency)
  - i18n support with currency names in English and Swedish
- **Technical:** 
  - Database: `currency` column (default SEK), `exchange_rate` column (DECIMAL(12,6))
  - Config: Centralized currency configuration with formatting utilities
  - Resource: Automatic exchange rate calculation on invoice creation
  - PDF: All monetary values formatted with correct currency symbols
- **Status:** Implemented
  - Migration: 029_add_exchange_rate_to_invoices.sql
  - Config: src/config/currencies.js with 6 currencies and utilities
  - Resource: Invoice.js sets currency and exchange_rate on create
  - UI: InvoiceModal dropdown, InvoiceDetail/Invoices list formatting
  - PDF: invoicePdfService formats all amounts with currency
  - i18n: English/Swedish translations for all currencies
  - Tests: Comprehensive Cypress test suite (multi-currency.cy.js)
  - Documentation: docs/MULTI_CURRENCY.md

**US-024-A: Multi-Currency Product Pricing** ✅
- As a **user**, in order to **issue invoices in various currencies**, I would like to **set prices in multiple currencies for each product in my catalog**.
- **Features:**
  - Each product can have multiple price entries (one per currency)
  - Default price in organization's primary currency
  - Optional prices in additional currencies (SEK, EUR, USD, GBP, NOK, DKK)
  - Product modal shows currency-specific price fields with progressive disclosure
  - Price list view displays first price with popover for multiple currencies
  - Validation: At least one price must be defined
- **Database:** 
  - New `product_prices` table with columns: id, product_id, currency, price, created_at, updated_at
  - Remove single `unit_price` from `products` table (breaking change)
  - Foreign key constraint to products table with CASCADE delete
  - Unique constraint on (product_id, currency) to prevent duplicates
- **UI:**
  - Product creation/edit modal with dynamic currency price inputs
  - Progressive disclosure: Show only currencies with prices + "Add Currency" button
  - Display first currency price in product list with + icon popover for multiple prices
  - Visual indicator for which currencies have prices defined
- **Use Cases:** 
  - Consultants working with international clients
  - SaaS companies with global pricing
  - Product businesses selling in multiple markets
- **Status:** Implemented
  - Migration: 033_add_product_prices.sql
  - Resource: ProductPrice resource with CRUD operations, Product resource updated
  - UI: ProductModal with react-hook-form validation, progressive disclosure UX
  - Product list: First price displayed, popover for multi-currency products
  - i18n: Full English/Swedish translations
  - Tests: Comprehensive Cypress test suite (multi-currency-products.cy.js) with 17 tests

**US-024-B: Currency-Aware Product Selection** ✅
- As a **user creating an invoice**, in order to **ensure accurate pricing**, I would like to **automatically use the product price that matches my invoice currency**.
- **Features:**
  - When adding product to invoice, system selects price matching invoice currency
  - If no price exists for invoice currency, show warning and require manual price entry
  - Display which currency price is being used in the product selector/line item
  - Fallback behavior: Allow manual price override if currency mismatch
  - Visual indicator when using non-matching currency (warning icon)
- **Behavior:**
  - Invoice currency SEK + Product with SEK price → Auto-fill SEK price
  - Invoice currency EUR + Product with only SEK price → Warning: "No EUR price defined, please enter manually"
  - Invoice currency USD + Product with both SEK and USD prices → Auto-fill USD price
- **UI:**
  - Product selector shows available currencies for each product (e.g., "100 SEK, 10 EUR, 12 USD")
  - Line item auto-populates with matching currency price
  - Warning message when currency mismatch occurs with amber background
  - Manual price entry remains editable as override
- **Prerequisites:** US-024-A (Multi-Currency Product Pricing)
- **Implementation:**
  - InvoiceModal.jsx updated with currency matching logic in handleProductSelect()
  - Added currencyMismatches state to track warnings per line item
  - Product dropdown displays all available prices with currency codes
  - Warning banner with ExclamationTriangleIcon for currency mismatches
  - Translations added for noPrices, currencyMismatch, currencyMismatchHelp (EN/SV)
- **Tests:** Comprehensive Cypress test suite (multi-currency-invoice-selection.cy.js) with 16 tests
- **Status:** ✅ Complete

**US-024-C: Save Manual Price to Product** ✅
- As a **user creating an invoice**, when I **manually enter a price for a product that lacks a price in the invoice currency**, I would like to **save that price to the product** so I don't have to enter it again.
- **Features:**
  - Show "Save price to product" action in currency mismatch warning
  - Allow user to add the manually entered price to the product's price list
  - Update product_prices table with the new currency/price
  - Remove warning after successful save
  - Show success confirmation message
  - Price field must contain a valid value before saving
- **Behavior:**
  - Warning appears when product has no matching currency price
  - User enters manual price (e.g., 150 GBP)
  - User clicks "Save GBP 150 to product" button in warning
  - System adds new price record to product_prices table
  - Warning disappears, success message shows
  - Future invoices with this product + currency auto-fill saved price
- **UI:**
  - Action button in warning banner: "Save [currency] [price] to product"
  - Button only shows when price > 0
  - Success toast: "Price saved to product successfully"
  - Error toast on save failures
- **Prerequisites:** US-024-B (Currency-Aware Product Selection)
- **Implementation:**
  - InvoiceModal.jsx: Added handleSavePriceToProduct() handler
  - Uses ProductPrice resource to create new price record
  - Refreshes products via fetchProducts() after successful save
  - Removes currency mismatch warning after save
  - Tracks saving state per line item to disable button during save
  - Translations added for savePriceToProduct, priceSavedSuccess, priceSaveFailed (EN/SV)
- **Tests:** Comprehensive Cypress test suite with 6 additional tests (22 total in multi-currency-invoice-selection.cy.js)
- **Status:** ✅ Complete

**US-025: Recurring Invoices** ✅
- As a **premium user**, in order to **automate subscription billing**, I would like to **set up recurring invoices with custom intervals**.
- **Status:** Implemented
  - Database: `recurring_invoices` table with schedule, interval, status tracking
  - Migration: 030_create_recurring_invoices.sql
  - Resource: RecurringInvoice.js for CRUD operations
  - Fixtures: recurring_invoices.json for testing
  - Intervals: Daily, weekly, monthly, quarterly, yearly
  - Status tracking: Active, paused, cancelled
  - Auto-generation: next_invoice_date calculation

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

**US-119: Cookie Consent Management** ✅
- As a **user**, in order to **control what information I leave**, I would like to **accept and change the cookie settings**.
- **GDPR/EU Compliance:** Full compliance with European data protection regulations (GDPR, ePrivacy Directive)
- **Features:**
  - **Cookie banner on first visit** with clear options (Accept All, Reject Non-Essential, Customize)
  - **Cookie categories:**
    - **Essential:** Required for authentication, session management, security (always enabled, no consent needed)
    - **Analytics:** Usage statistics, performance monitoring (Google Analytics, Plausible)
    - **Marketing:** Advertising cookies, remarketing (optional)
    - **Preferences:** Language, theme, UI settings
  - **Granular control:** Users can enable/disable each category individually
  - **Persistent storage:** Cookie preferences saved to local storage or user profile
  - **Re-consent mechanism:** Users can change preferences anytime in Settings > Privacy
  - **Cookie policy page:** Detailed explanation of what cookies are used and why
  - **Compliance features:**
    - No non-essential cookies loaded before consent
    - Clear information about data processing
    - Easy withdrawal of consent
    - Consent tracking and audit trail
    - Default to privacy (no pre-checked boxes except essential)
- **Implementation:**
  - Redux: `cookieConsentSlice` with actions for accept/reject/customize
  - Components: `CookieBanner`, `CookieSettings` modal
  - Page: `/cookie-policy` with detailed information
  - Settings: Privacy tab in Settings page with cookie preferences button
  - Storage: Preferences persisted to localStorage
  - i18n: Full English/Swedish translations
- **Tests:** Comprehensive Cypress test suite (`cookie-consent.cy.js`) covering:
  - Banner display on first visit
  - Accept all / Reject non-essential flows
  - Custom preferences with granular toggles
  - Settings modal interactions
  - Cookie policy page navigation
  - Privacy tab in Settings
  - Persistence across page reloads
  - Swedish language support
- **Status:** ✅ Complete

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

**US-120: NPS Survey System** ✅
- As an **admin/system owner**, in order to **understand what users think about the system**, I would like to **present an optional NPS survey to users at certain intervals**.
- **User Story:** Track user satisfaction through Net Promoter Score (NPS) surveys shown to engaged users
- **Eligibility Criteria (any of these):**
  - User has created at least 3 invoices
  - User has created at least 3 clients
  - User has created at least 3 products
- **Display Rules:**
  - Survey shown after creating an invoice, client, or product (post-request success)
  - Not shown to new users who haven't used the system substantially
  - 20% random chance of showing survey again after responding
  - Minimum 30-day interval between survey displays (regardless of response)
- **Survey Format:**
  - Standard NPS question: "How likely are you to recommend VisInv to a friend or colleague?" (0-10 scale)
  - Follow-up question: "Why did you give this score?" (optional text field)
  - Simple modal interface with easy dismiss option
- **Data Tracking:**
  - Each NPS response stored with: score (0-10), feedback text, timestamp, user ID
  - Track when survey was shown (even if not responded to)
  - Record trigger context (which action triggered the display: invoice/client/product creation)
  - Response rate analytics
  - NPS score calculation (% Promoters - % Detractors)
- **Implementation:**
  - Database: `nps_responses` table with user_id, score, feedback, shown_at, responded_at, trigger_context
  - Migration: `034_add_nps_tracking_fields.sql` adds tracking columns to existing table
  - Resource: `NpsResponse.js` for data operations with eligibility check and submission methods
  - Redux: `npsSlice` with eligibility check, submission actions, and modal state management
  - Hook: `useNpsTrigger` custom hook for easy integration in success flows
  - Component: `NpsModal.jsx` with 0-10 scale buttons (color-coded by category), feedback textarea, and responsive design
  - Triggers: Integrated in InvoiceModal, ClientModal, and ProductModal after successful creation
  - i18n: Full English/Swedish translations
- **Tests:** Cypress test suite (`nps.cy.js`) covering:
  - Eligibility checks with activity thresholds
  - Display rules (30-day interval enforcement)
  - Score selection and feedback submission
  - Dismiss/close functionality
  - Trigger context tracking (invoice_created, client_created, product_created)
  - Score category styling (detractors/passives/promoters)
- **Status:** ✅ Complete - Ready for testing and deployment

---

### Navigation & UI Architecture

**US-401: Hierarchical Sidebar Navigation** ✅
- As a **user**, in order to **navigate the expanded application**, I would like to **use a hierarchical sidebar with collapsible module sections**.
- **Acceptance Criteria:**
  - ✅ Three main sections: Accounting, Invoicing, Time & Projects (with Administration)
  - ✅ Sections are collapsible/expandable
  - ✅ Remember expanded state per user (localStorage)
  - ✅ Active item highlighting
  - Coming Soon placeholder for Accounting and Time & Projects modules
  - Mobile responsive (hamburger menu) - existing behavior
- **Status:** Complete
- **Implementation:** `CollapsibleNavSection.jsx`, updated `Sidebar.jsx`
- **Tests:** `cypress/e2e/hierarchical-navigation.cy.js` (28 tests)

**US-402: Module-Based Dashboard**
- As a **user**, in order to **see relevant information at a glance**, I would like to **have a customizable dashboard with module-specific widgets**.
- **Acceptance Criteria:**
  - Dashboard widgets per module:
    - Accounting: Account balances, cash position, recent transactions
    - Invoicing: Outstanding invoices, overdue amount, recent activity
    - Time: Today's timer, weekly hours, unbilled time value
  - Drag-and-drop widget arrangement
  - Widget settings (date range, accounts to show)
  - Role-based default layouts
- **Status:** Not Started

**US-403: Global Search**
- As a **user**, in order to **quickly find anything**, I would like to **search across all modules from a global search bar**.
- **Acceptance Criteria:**
  - Search bar in header (Cmd/Ctrl+K shortcut)
  - Search across: invoices, clients, transactions, projects, accounts
  - Type-ahead suggestions
  - Grouped results by type
  - Recent searches
- **Status:** Not Started

**US-404: Quick Actions Menu**
- As a **user**, in order to **perform common tasks quickly**, I would like to **access a quick actions menu from anywhere in the app**.
- **Acceptance Criteria:**
  - Floating action button or keyboard shortcut
  - Quick actions: New Invoice, New Client, New Time Entry, New Expense, New Journal Entry
  - Recently used actions
  - Context-aware suggestions
- **Status:** Not Started

---

### Accounting Module (Bokföring)

Swedish accounting follows **Bokföringslagen** (BFL) and **Årsredovisningslagen** (ÅRL). The accounting module provides full Swedish-compliant bookkeeping capabilities.

#### Chart of Accounts

**US-201: BAS Chart of Accounts Setup**
- As an **organization owner**, in order to **start accounting according to Swedish standards**, I would like to **initialize my chart of accounts with the BAS standard account plan**.
- **Acceptance Criteria:**
  - Option to import standard BAS chart of accounts (BAS 2024)
  - Account structure: 4-digit codes (1xxx Assets, 2xxx Liabilities, 3xxx Revenue, etc.)
  - Support for account groups and subaccounts
  - Each account has: number, name, type (asset/liability/equity/revenue/expense), VAT code
  - SRU codes for tax reporting linkage
- **Status:** Not Started

**US-202: Custom Account Management**
- As a **bookkeeper**, in order to **adapt the chart of accounts to my business**, I would like to **add, edit, and deactivate accounts**.
- **Acceptance Criteria:**
  - Create new accounts with proper validation (unique number, correct range for type)
  - Edit account name and settings (not number after use)
  - Deactivate accounts (soft delete, keep for historical data)
  - Cannot delete accounts with transactions
  - Show account balance and transaction count
- **Status:** Not Started

**US-203: Account Groups and Hierarchy**
- As a **bookkeeper**, in order to **organize accounts for reporting**, I would like to **group accounts into logical categories and subcategories**.
- **Acceptance Criteria:**
  - Hierarchical account structure (groups → subgroups → accounts)
  - Collapsible/expandable account tree view
  - Summary rows show totals for groups
  - Support standard BAS groupings
- **Status:** Not Started

#### Journal Entries (Verifikationer)

**US-210: Manual Journal Entry** ✅
- As a **bookkeeper**, in order to **record financial transactions**, I would like to **create journal entries with multiple debit and credit lines**.
- **Acceptance Criteria:**
  - ✅ Entry date, verification number (auto), description
  - ✅ Multiple lines: account, debit amount, credit amount, optional line description
  - ✅ Total debits must equal total credits (balanced entry)
  - ⏸️ Attach supporting documents (PDF, images) - Future enhancement
  - ✅ Sequential verification numbering per fiscal year
  - ✅ Draft mode before posting
- **Implementation:**
  - Database: `fiscal_years`, `journal_entries`, `journal_entry_lines` tables with RLS
  - Resources: `FiscalYear`, `JournalEntry` with balance validation
  - Redux: `fiscalYearsSlice`, `journalEntriesSlice`
  - UI: `JournalEntries` page, `JournalEntryModal`, `FiscalYearModal`
  - Cypress E2E tests: 38 tests covering all functionality
- **Status:** ✅ Complete

**US-211: Journal Entry from Invoice**
- As a **system**, in order to **maintain accurate books**, I would like to **automatically create journal entries when invoices are created/sent/paid**.
- **Acceptance Criteria:**
  - Invoice sent → Debit: Accounts Receivable (1510), Credit: Revenue (3xxx) + VAT (26xx)
  - Payment received → Debit: Bank (19xx), Credit: Accounts Receivable (1510)
  - Configurable default accounts per organization
  - Link between invoice and journal entries visible
- **Status:** Not Started

**US-212: Recurring Journal Entries**
- As a **bookkeeper**, in order to **handle regular transactions**, I would like to **set up recurring journal entries (e.g., monthly rent, depreciation)**.
- **Acceptance Criteria:**
  - Create template journal entry
  - Set recurrence: monthly, quarterly, yearly
  - Auto-generate entries on schedule (or prompt to create)
  - Option to adjust amounts before posting
- **Status:** Not Started

**US-213: Journal Entry Templates**
- As a **bookkeeper**, in order to **speed up common entries**, I would like to **save journal entry templates for frequently used transactions**.
- **Acceptance Criteria:**
  - Save entry as template with name
  - Templates list for quick access
  - Create new entry from template
  - Edit template definitions
- **Status:** Not Started

**US-214: Journal Entry Search and Filter**
- As a **bookkeeper**, in order to **find specific transactions**, I would like to **search and filter journal entries by date, account, amount, description, or verification number**.
- **Acceptance Criteria:**
  - Date range filter
  - Account filter (single or multiple)
  - Amount range filter
  - Text search in description
  - Verification number search
  - Export filtered results
- **Status:** Not Started

**US-215: Verification Number Management**
- As an **organization**, in order to **comply with Swedish accounting law**, I would like to **have unbroken verification number sequences per fiscal year**.
- **Acceptance Criteria:**
  - Verification numbers restart each fiscal year (or continue, configurable)
  - Prefix support (e.g., "VER-" or custom)
  - Gap detection and warnings
  - Cannot reuse or delete verification numbers
- **Status:** Not Started

#### Account Ledger Views

**US-220: General Ledger View**
- As a **bookkeeper**, in order to **see all transactions for an account**, I would like to **view the general ledger with running balances**.
- **Acceptance Criteria:**
  - Select account to view
  - Show all transactions affecting account
  - Running balance after each transaction
  - Date range filter
  - Drill-down to journal entry
  - Export to PDF/Excel
- **Status:** Not Started

**US-221: Trial Balance**
- As a **bookkeeper**, in order to **verify that books are balanced**, I would like to **generate a trial balance report showing all account balances**.
- **Acceptance Criteria:**
  - As of date selection
  - Show all accounts with balances
  - Debit and credit columns
  - Total debits = total credits check
  - Filter by account range or type
  - Include zero-balance accounts option
- **Status:** Not Started

**US-222: Account Balance Inquiry**
- As a **bookkeeper**, in order to **quickly check an account balance**, I would like to **view current balance and period movements for any account**.
- **Acceptance Criteria:**
  - Quick account lookup
  - Show: opening balance, period debits, period credits, closing balance
  - Period selection (month, quarter, year, custom)
  - Link to detailed transactions
- **Status:** Not Started

#### Financial Reports

**US-230: Balance Sheet (Balansräkning)**
- As an **organization owner**, in order to **understand my financial position**, I would like to **generate a balance sheet report**.
- **Acceptance Criteria:**
  - As of date selection
  - Standard Swedish format per ÅRL
  - Assets (Tillgångar): Fixed assets, current assets
  - Equity & Liabilities (Eget kapital och skulder)
  - Comparative period (previous year)
  - Export to PDF/Excel
- **Status:** Not Started

**US-231: Income Statement (Resultaträkning)**
- As an **organization owner**, in order to **see profit and loss**, I would like to **generate an income statement report**.
- **Acceptance Criteria:**
  - Period selection (month, quarter, year, custom)
  - Standard Swedish format per ÅRL
  - Revenue, costs, operating profit, financial items, net profit
  - Comparative period
  - Budget comparison (if budgets exist)
  - Export to PDF/Excel
- **Status:** Not Started

**US-232: Cash Flow Statement (Kassaflödesanalys)**
- As an **organization owner**, in order to **understand cash movements**, I would like to **generate a cash flow statement**.
- **Acceptance Criteria:**
  - Period selection
  - Operating activities, investing activities, financing activities
  - Indirect method (from net income)
  - Comparative period
  - Export to PDF/Excel
- **Status:** Not Started

**US-233: VAT Report (Momsrapport)**
- As a **bookkeeper**, in order to **file VAT returns**, I would like to **generate a VAT report for the reporting period**.
- **Acceptance Criteria:**
  - Period selection (monthly, quarterly, yearly based on org settings)
  - Show: Output VAT (sales), Input VAT (purchases), Net VAT payable/receivable
  - Breakdown by VAT rate (25%, 12%, 6%, 0%)
  - Format compatible with Skatteverket requirements
  - Drilldown to underlying transactions
  - Export for filing
- **Status:** Not Started

**US-234: Aged Receivables Report (Kundreskontra)**
- As a **bookkeeper**, in order to **manage outstanding invoices**, I would like to **generate an aged receivables report showing overdue amounts by client**.
- **Acceptance Criteria:**
  - As of date
  - Aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days
  - By client with totals
  - Drilldown to individual invoices
  - Export to PDF/Excel
- **Status:** Not Started

**US-235: Aged Payables Report (Leverantörsreskontra)**
- As a **bookkeeper**, in order to **manage bills to pay**, I would like to **generate an aged payables report showing amounts owed to suppliers**.
- **Acceptance Criteria:**
  - As of date
  - Aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days
  - By supplier with totals
  - Drilldown to individual bills
  - Export to PDF/Excel
- **Status:** Not Started

#### Bank & Reconciliation

**US-240: Bank Account Setup**
- As a **bookkeeper**, in order to **track bank transactions**, I would like to **register bank accounts and link them to ledger accounts**.
- **Acceptance Criteria:**
  - Add bank account: name, account number, bank name, currency
  - Link to chart of accounts (19xx accounts)
  - Multiple bank accounts per organization
  - Set opening balance and date
- **Status:** Not Started

**US-241: Bank Transaction Import**
- As a **bookkeeper**, in order to **record bank transactions**, I would like to **import bank statements in common formats (CSV, OFX, ISO 20022)**.
- **Acceptance Criteria:**
  - Upload bank statement file
  - Parse transactions: date, description, amount, reference
  - Preview before import
  - Duplicate detection
  - Store imported transactions for reconciliation
- **Status:** Not Started

**US-242: Bank Reconciliation**
- As a **bookkeeper**, in order to **ensure bank records match my books**, I would like to **reconcile bank transactions with journal entries**.
- **Acceptance Criteria:**
  - Select bank account and statement period
  - Show unreconciled bank transactions
  - Show unreconciled book transactions
  - Match transactions (auto-suggest and manual)
  - Create adjusting entries for differences
  - Mark as reconciled
  - Reconciliation report
- **Status:** Not Started

**US-243: Open Banking Integration (PSD2)**
- As a **user**, in order to **automatically sync bank transactions**, I would like to **connect my bank account via Open Banking APIs**.
- **Acceptance Criteria:**
  - Support Swedish banks via aggregator (Tink, Plaid, etc.)
  - Secure OAuth connection flow
  - Automatic daily sync of transactions
  - Categorization suggestions based on description
- **Status:** Not Started

#### Fiscal Year Management

**US-250: Fiscal Year Setup**
- As an **organization owner**, in order to **organize accounting by periods**, I would like to **define fiscal years with start and end dates**.
- **Acceptance Criteria:**
  - Create fiscal year: name, start date, end date
  - Support non-calendar fiscal years (e.g., July-June)
  - Multiple fiscal years visible
  - Current/active fiscal year indicator
  - Cannot overlap fiscal years
- **Status:** Not Started

**US-251: Fiscal Year Closing**
- As a **bookkeeper**, in order to **finalize the accounting period**, I would like to **close a fiscal year, transfer result to equity, and lock transactions**.
- **Acceptance Criteria:**
  - Year-end closing process wizard
  - Calculate net result
  - Create closing entries (result to equity account 2099)
  - Generate opening balances for new year
  - Lock closed year (prevent modifications)
  - Audit trail of closing
- **Status:** Not Started

**US-252: Period Locking**
- As an **organization owner**, in order to **prevent accidental changes to finalized periods**, I would like to **lock accounting periods (months, quarters)**.
- **Acceptance Criteria:**
  - Lock individual months or quarters
  - Locked periods: no new entries, no edits
  - Admin override with reason logging
  - Visual indicator of locked periods
- **Status:** Not Started

#### SIE Integration

**US-121: SIE File Export**
- As a **user with accounting needs**, in order to **transfer data to external accounting software**, I would like to **export data in SIE4/SIE5 format**.
- **Acceptance Criteria:**
  - SIE4 (text format) - Wide compatibility
  - SIE5 (XML format) - Modern format
  - Export options: chart of accounts, balances, transactions, complete
  - Date range selection
  - Schema validation
  - Compatible with Fortnox, Visma, Björn Lundén, etc.
- **Data Mapping:**
  - Invoices → Vouchers (Verifikationer)
  - Clients → Customer register (Kunder)
  - Products → Article register (Artiklar) - if applicable
  - VAT amounts → VAT transactions (Momstransaktioner)
  - Payment records → Payment transactions (Betalningar)
- **Status:** Not Started

**US-122: SIE File Import** ✅
- As a **user migrating to VisInv**, in order to **bring existing accounting data**, I would like to **import SIE files from other accounting software**.
- **Acceptance Criteria:**
  - Support SIE4 (.se text format) and SIE5 (.sie XML format)
  - Import wizard: upload → validate → preview → import → complete
  - Import chart of accounts with BAS account class mapping
  - Skip existing accounts option (enabled by default)
  - Organization mismatch handling (see below)
  - Conflict resolution for duplicates
- **Organization Mismatch Handling:**
  - Extract organization details from SIE file (company name, organization number)
  - Compare with current organization's details
  - If mismatch detected, show dialog with options:
    1. **Create new organization** - Create a new organization using details from SIE file, then import to that organization
    2. **Use current organization** - Ignore mismatch and import to current organization anyway
  - Dialog shows both sets of details for comparison (SIE file vs current org)
  - Creating new organization switches context to that organization before import
- **Implementation:**
  - Parser: `sieParser.js` supporting SIE4/SIE5 with auto-detection
  - Resource: `Account.js` with `bulkImport()` method
  - Redux: `accountsSlice.js` with `importAccounts` thunk
  - Page: `SieImport.jsx` with wizard interface and org mismatch dialog
  - Route: `/import/sie`
  - i18n: Full English/Swedish translations
- **Tests:** Cypress test suite (`sie-import.cy.js`) with 20 tests
- **Status:** ✅ Complete

#### Supplier Management (Leverantörer)

**US-260: Supplier Invoice Registration**
- As a **bookkeeper**, in order to **track business expenses**, I would like to **register supplier invoices/bills**.
- **Acceptance Criteria:**
  - Supplier selection (from supplier register)
  - Invoice details: number, date, due date, amount, VAT
  - Line items with account coding
  - Attach PDF of invoice
  - Auto-create journal entry
- **Status:** Not Started

**US-261: Supplier Management**
- As a **bookkeeper**, in order to **manage vendors**, I would like to **maintain a supplier register**.
- **Acceptance Criteria:**
  - CRUD operations for suppliers
  - Fields: name, org number, VAT number, address, bank details
  - Default accounts for supplier
  - Supplier transaction history
- **Status:** Not Started

**US-262: Purchase Invoice Approval Workflow**
- As an **organization**, in order to **control spending**, I would like to **route supplier invoices through an approval workflow before payment**.
- **Acceptance Criteria:**
  - Submit invoice for approval
  - Approval routing based on amount or department
  - Approve/reject with comments
  - Approved invoices ready for payment
  - Audit trail of approvals
- **Status:** Not Started

**US-263: Supplier Invoice & Receipt OCR Upload**
- As a **user**, in order to **simplify my accounting**, I would like to **upload a supplier invoice or receipt and extract information from it**.
- **Acceptance Criteria:**
  - **OCR Processing:**
    - Upload PDF or image files (JPEG, PNG)
    - Use OCR software (Scribe.js: https://github.com/scribeocr/scribe.js) to extract text from uploaded documents
    - Consider Supabase Edge Function implementation to off-load browser processing
  - **AI-Powered Data Extraction:**
    - Use OpenAI GPT model to identify and extract key information:
      - Supplier name and details (organization number, VAT number, address)
      - Invoice number and date
      - Due date and payment terms
      - Line items with descriptions and amounts
      - VAT rates and amounts
      - Total amount
    - Identify what the invoice is for (category/purpose of expense)
  - **Account Suggestion:**
    - AI suggests appropriate chart of accounts codes based on:
      - Invoice content and category
      - Supplier type
      - Historical coding patterns for similar expenses
    - User can review and adjust suggested accounts
  - **UI Requirements:**
    - Small, expandable document preview (thumbnail view)
    - Click to expand preview to full-screen or larger modal
    - Side-by-side view: document preview + extracted data form
    - Highlight extracted fields on document (if possible)
    - Edit extracted information before saving
  - **Integration:**
    - Pre-populate supplier invoice form (US-260) with extracted data
    - Create or link to supplier record (US-261)
    - Suggest account coding for line items
    - Attach original document to invoice record
  - **Validation:**
    - Flag low-confidence extractions for manual review
    - Validate extracted amounts and VAT calculations
    - Check supplier data against existing supplier register
- **Technical Considerations:**
  - OCR: Scribe.js for text extraction (client-side or server-side via Supabase Function)
  - AI: OpenAI GPT API for intelligent data extraction and categorization
  - Storage: Supabase Storage for uploaded documents
  - Performance: Consider Edge Function to off-load browser processing for large documents
  - Progressive enhancement: Show loading states during OCR/AI processing
- **Status:** Not Started

#### Invoicing & Accounting Integration

**US-280: Invoice Accounting Integration**
- As a **bookkeeper**, in order to **have invoices automatically recorded**, I would like to **invoices to generate proper journal entries based on configured accounts**.
- **Acceptance Criteria:**
  - Configure default revenue accounts per product category
  - Configure accounts receivable account
  - Configure VAT accounts per rate
  - Invoice creation → journal entry created (or on send)
  - Payment recording → journal entry created
  - View linked journal entries from invoice
- **Status:** Not Started

**US-281: Invoice Payment Matching**
- As a **bookkeeper**, in order to **reconcile payments**, I would like to **match bank transactions to invoice payments**.
- **Acceptance Criteria:**
  - Suggest matches based on amount and reference
  - Manual matching for unclear cases
  - Partial payment handling
  - Overpayment handling
  - Update invoice status on match
- **Status:** Not Started

**US-282: Credit Note Accounting**
- As a **bookkeeper**, in order to **properly account for credit notes**, I would like to **credit notes to generate reversing journal entries**.
- **Acceptance Criteria:**
  - Credit note creates negative revenue entry
  - Proper VAT reversal
  - Link to original invoice
  - Accounts receivable reduction
- **Status:** Not Started

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

### Accounting Module Entities
23. **Accounts** - Chart of accounts (BAS standard, 4-digit codes)
24. **Journal Entries** - Verifikationer with verification numbers
25. **Journal Entry Lines** - Debit/credit lines for each entry
26. **Fiscal Years** - Accounting periods with open/closed status
27. **Bank Accounts** - Linked to ledger accounts for reconciliation
28. **Bank Transactions** - Imported transactions for matching
29. **Suppliers** - Vendor register with payment details
30. **Supplier Invoices** - Bills payable with approval workflow

### Database Schema - Accounting Module

```sql
-- Chart of Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  account_number VARCHAR(10) NOT NULL,  -- 4-digit BAS code
  name VARCHAR(255) NOT NULL,
  name_sv VARCHAR(255),
  account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
  account_group VARCHAR(50),
  parent_account_id UUID REFERENCES accounts(id),
  vat_code VARCHAR(10),
  sru_code VARCHAR(10),  -- Swedish tax reporting code
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, account_number)
);

-- Fiscal Years
CREATE TABLE fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, start_date)
);

-- Journal Entries (Verifikationer)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
  verification_number INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',  -- draft, posted, voided
  source_type VARCHAR(50),  -- manual, invoice, payment, bank_import
  source_id UUID,  -- ID of related entity
  created_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, fiscal_year_id, verification_number)
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  vat_code VARCHAR(10),
  vat_amount DECIMAL(15,2),
  cost_center VARCHAR(50),
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Accounts (for accounting)
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  account_id UUID REFERENCES accounts(id),  -- Link to chart of accounts
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  iban VARCHAR(50),
  bic VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'SEK',
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Transactions (imported)
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100),
  counterparty VARCHAR(255),
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_with UUID REFERENCES journal_entry_lines(id),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB  -- Original import data
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  organization_number VARCHAR(20),
  vat_number VARCHAR(30),
  email VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  postal_code VARCHAR(20),
  city VARCHAR(100),
  country VARCHAR(2) DEFAULT 'SE',
  bank_account VARCHAR(50),
  default_expense_account_id UUID REFERENCES accounts(id),
  payment_terms INTEGER DEFAULT 30,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier Invoices
CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_number VARCHAR(50),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'SEK',
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, paid, cancelled
  journal_entry_id UUID REFERENCES journal_entries(id),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

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
- US-104, US-105, US-106, US-107, US-108, US-109, US-119 (Enhanced security & compliance)

### Phase 6 (Accounting Module - Foundation)
- US-401, US-402, US-403, US-404 (Navigation & UI architecture)
- US-201, US-202, US-203 (Chart of accounts)
- US-250 (Fiscal year setup)
- US-210, US-213, US-214, US-215 (Manual journal entries & templates)

### Phase 7 (Accounting Module - Core)
- US-211, US-212 (Auto journal entries & recurring)
- US-220, US-221, US-222 (Ledger views & trial balance)
- US-230, US-231, US-232, US-233 (Financial reports)
- US-121, US-122 (SIE import/export)

### Phase 8 (Accounting Module - Advanced)
- US-240, US-241, US-242, US-243 (Bank accounts & reconciliation)
- US-234, US-235 (Aged receivables/payables)
- US-251, US-252 (Fiscal year closing & period locking)
- US-260, US-261, US-262 (Supplier management)
- US-280, US-281, US-282 (Invoice accounting integration)

### Phase 9 (Inventory & Product Businesses)
- US-098, US-099, US-100 (Inventory & COGS tracking)

### Phase 10 (Mobile & Enterprise)
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
| **Invoice Management** | 8 | 8 | 0 | 0 |
| **Notifications & Reminders** | 4 | 1 | 0 | 3 |
| **Analytics & Reporting** | 5 | 3 | 0 | 2 |
| **Internationalization** | 3 | 0 | 0 | 3 |
| **Administration** | 9 | 4 | 0 | 5 |
| **Security & Data Management** | 3 | 0 | 0 | 3 |
| **Integration & Webhooks** | 2 | 0 | 0 | 2 |
| **Developer & Operations** | 3 | 0 | 0 | 3 |
| **Navigation & UI Architecture** | 4 | 0 | 0 | 4 |
| **Accounting - Chart of Accounts** | 3 | 0 | 0 | 3 |
| **Accounting - Journal Entries** | 6 | 0 | 0 | 6 |
| **Accounting - Ledger Views** | 3 | 0 | 0 | 3 |
| **Accounting - Financial Reports** | 6 | 0 | 0 | 6 |
| **Accounting - Bank & Reconciliation** | 4 | 0 | 0 | 4 |
| **Accounting - Fiscal Year Management** | 3 | 0 | 0 | 3 |
| **Accounting - SIE Integration** | 2 | 0 | 0 | 2 |
| **Accounting - Supplier Management** | 3 | 0 | 0 | 3 |
| **Accounting - Invoice Integration** | 3 | 0 | 0 | 3 |
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
| **Security Enhancements** | 6 | 1 | 0 | 5 |
| **White Label** | 3 | 0 | 0 | 3 |
| **Support & Growth** | 6 | 1 | 0 | 5 |
| **TOTAL** | **155** | **31** | **2** | **122** |

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

**New Features for Full System (US-065 to US-119)**: Competitive feature set
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
- US-104 to US-109, US-119: Security & Compliance
- US-110 to US-112: White Label & Multi-tenancy
- US-113 to US-118: Support & Growth
- US-121 to US-122: SIE Integration

**Accounting Module (US-201 to US-282)**: Full Swedish-compliant bookkeeping
- US-201 to US-203: Chart of Accounts (BAS standard)
- US-210 to US-215: Journal Entries (Verifikationer)
- US-220 to US-222: Account Ledger Views
- US-230 to US-235: Financial Reports (Balance Sheet, Income Statement, VAT, etc.)
- US-240 to US-243: Bank Accounts & Reconciliation
- US-250 to US-252: Fiscal Year Management
- US-260 to US-262: Supplier Management (Leverantörer)
- US-280 to US-282: Invoice & Accounting Integration

**Navigation & UI (US-401 to US-404)**: Application architecture
- US-401: Hierarchical Sidebar Navigation
- US-402: Module-Based Dashboard
- US-403: Global Search
- US-404: Quick Actions Menu

---

## Competitive Analysis

### How VisInv Compares to Industry Leaders

| Feature Category | FreshBooks | QuickBooks | Fortnox | VisInv (Planned) |
|------------------|------------|------------|---------|------------------|
| **Basic Invoicing** | ✅ | ✅ | ✅ | ✅ Implemented |
| **Custom Templates** | ✅ | ✅ | ⚠️ Limited | ✅ Implemented |
| **Time Tracking** | ✅ | ⚠️ Add-on | ✅ | 📋 US-068 |
| **Expense Tracking** | ✅ | ✅ | ✅ | 📋 US-069 |
| **Estimates/Quotes** | ✅ | ✅ | ✅ | 📋 US-065 |
| **Client Portal** | ✅ | ✅ | ⚠️ Limited | 📋 US-072 |
| **Recurring Invoices** | ✅ | ✅ | ✅ | 📋 US-025 |
| **Multi-Currency** | ✅ | ✅ | ✅ | ✅ Implemented |
| **Payment Processing** | ✅ | ✅ | ✅ | 🔶 US-078 |
| **Mobile Apps** | ✅ | ✅ | ✅ | 📋 US-101 |
| **Project Management** | ✅ | ⚠️ Limited | ⚠️ Limited | 📋 US-071 |
| **Inventory** | ❌ | ✅ | ✅ | 📋 US-098 |
| **Payroll** | ⚠️ 3rd party | ✅ | ✅ | ⏸️ Future |
| **Double-Entry Accounting** | ❌ | ✅ | ✅ | 📋 US-210+ |
| **Chart of Accounts (BAS)** | ❌ | ❌ | ✅ | 📋 US-201 |
| **Journal Entries** | ❌ | ✅ | ✅ | 📋 US-210 |
| **Financial Reports** | ⚠️ Basic | ✅ | ✅ | 📋 US-230+ |
| **VAT Reporting** | ⚠️ Generic | ⚠️ Generic | ✅ | 📋 US-233 |
| **Bank Reconciliation** | ⚠️ Limited | ✅ | ✅ | 📋 US-242 |
| **SIE Import/Export** | ❌ | ❌ | ✅ | 📋 US-121/122 |
| **Supplier Invoices** | ❌ | ✅ | ✅ | 📋 US-260+ |
| **Team Collaboration** | ✅ | ✅ | ✅ | ✅ Implemented |
| **API & Integrations** | ✅ | ✅ | ✅ | 📋 US-095 |
| **White Label** | ❌ | ❌ | ❌ | 📋 US-110 |
| **Swedish Compliance** | ⚠️ Generic | ⚠️ Generic | ✅ Native | ✅ Built-in |

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
- Enhanced reporting (US-087 to US-092)

### 2025 Q4: Integrations & Ecosystem
- CRM integrations (US-094)
- API & webhooks (US-095)
- Zapier & email integrations (US-096, US-097)
- Mobile-optimized web (US-102)

### 2026 Q1-Q2: Accounting Module - Foundation
- Hierarchical navigation (US-401 to US-404)
- Chart of Accounts with BAS standard (US-201 to US-203)
- Fiscal year setup (US-250)
- Manual journal entries & templates (US-210 to US-215)
- Database migrations for accounting tables

### 2026 Q3: Accounting Module - Core
- Auto journal entries from invoices (US-211, US-280 to US-282)
- Ledger views & trial balance (US-220 to US-222)
- Financial reports: Balance Sheet, Income Statement, VAT (US-230 to US-233)
- SIE import/export (US-121, US-122)

### 2026 Q4: Accounting Module - Advanced
- Bank accounts & reconciliation (US-240 to US-243)
- Aged receivables/payables reports (US-234, US-235)
- Fiscal year closing & period locking (US-251, US-252)
- Supplier management & invoices (US-260 to US-262)

### 2027 Q1-Q2: Mobile & Enterprise
- Native mobile apps (US-101)
- Inventory management (US-098 to US-100)
- SSO & advanced security (US-104 to US-109)
- Accessibility (WCAG) compliance (US-103)

### 2027 Q3+: Scale & Growth
