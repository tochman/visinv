# VisInv → Full Accounting Platform Proposal

## Overview

This document proposes transforming VisInv from an invoicing-focused application into a **fully-featured Swedish accounting platform** with three major modules:

1. **Accounting** (Bokföring) - General ledger, journal entries, financial reports
2. **Invoicing** (Fakturering) - Current invoicing functionality, enhanced
3. **Time & Projects** (Tid & Projekt) - Time tracking, expenses, project management

Each module will be self-contained but interconnected, sharing common data (clients, organizations) while maintaining clear boundaries.

---

## Navigation Structure

### Proposed Hierarchical Menu

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR                                                         │
├─────────────────────────────────────────────────────────────────┤
│  [Logo]                                                          │
│  [Organization Switcher]                                         │
│                                                                  │
│  ── OVERVIEW ──                                                  │
│  📊 Dashboard                                                    │
│                                                                  │
│  ── ACCOUNTING ──                        (Collapsed by default) │
│  📒 General Ledger                                               │
│     ├─ Chart of Accounts                                         │
│     ├─ Journal Entries                                           │
│     └─ Account Balances                                          │
│  📄 Transactions                                                 │
│     ├─ All Transactions                                          │
│     ├─ Bank Transactions                                         │
│     └─ Reconciliation                                            │
│  📊 Financial Reports                                            │
│     ├─ Balance Sheet                                             │
│     ├─ Income Statement                                          │
│     ├─ Cash Flow                                                 │
│     └─ VAT Report                                                │
│  🏦 Bank Accounts                                                │
│  💰 Fiscal Years                                                 │
│                                                                  │
│  ── INVOICING ──                         (Expanded by default)  │
│  📑 Invoices                                                     │
│  📝 Quotes                                                       │
│  👥 Clients                                                      │
│  📦 Products & Services                                          │
│  🎨 Templates                                                    │
│  💳 Payments                                                     │
│                                                                  │
│  ── TIME & PROJECTS ──                   (Collapsed by default) │
│  ⏱️ Time Tracking                                                │
│     ├─ Timer                                                     │
│     ├─ Timesheet                                                 │
│     └─ Time Reports                                              │
│  📁 Projects                                                     │
│  💸 Expenses                                                     │
│                                                                  │
│  ── ADMINISTRATION ──                                            │
│  ⚙️ Settings                                                     │
│  👥 Team Members                                                 │
│  🔒 Admin (if admin)                                             │
│                                                                  │
│  [User Profile]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module 1: ACCOUNTING (Bokföring)

### Core Accounting Concepts

Swedish accounting follows **Bokföringslagen** (BFL) and **Årsredovisningslagen** (ÅRL). The system must support:

- **BAS Chart of Accounts** - Swedish standard account plan (4-digit accounts)
- **Double-entry bookkeeping** - Every transaction has debit and credit entries
- **Verification numbers** - Sequential numbering per fiscal year
- **Fiscal years** - Support for different fiscal year periods
- **VAT handling** - Swedish VAT rates (0%, 6%, 12%, 25%)

---

### User Stories - Chart of Accounts

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

---

### User Stories - Journal Entries (Verifikationer)

**US-210: Manual Journal Entry**
- As a **bookkeeper**, in order to **record financial transactions**, I would like to **create journal entries with multiple debit and credit lines**.
- **Acceptance Criteria:**
  - Entry date, verification number (auto or manual), description
  - Multiple lines: account, debit amount, credit amount, optional line description
  - Total debits must equal total credits (balanced entry)
  - Attach supporting documents (PDF, images)
  - Sequential verification numbering per fiscal year
  - Draft mode before posting
- **Status:** Not Started

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

---

### User Stories - Account Ledger Views

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

---

### User Stories - Financial Reports

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

---

### User Stories - Bank & Reconciliation

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

---

### User Stories - Fiscal Year Management

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

---

### User Stories - SIE Integration

**US-121: SIE File Export** (Enhanced from existing)
- As a **user with accounting needs**, in order to **transfer data to external accounting software**, I would like to **export data in SIE4/SIE5 format**.
- **Acceptance Criteria:**
  - SIE4 (text format) - Wide compatibility
  - SIE5 (XML format) - Modern format
  - Export options: chart of accounts, balances, transactions, complete
  - Date range selection
  - Schema validation
  - Compatible with Fortnox, Visma, Björn Lundén, etc.
- **Status:** Not Started

**US-122: SIE File Import** (Enhanced from existing)
- As a **user migrating to VisInv**, in order to **bring existing accounting data**, I would like to **import SIE files from other accounting software**.
- **Acceptance Criteria:**
  - Support SIE4 and SIE5 formats
  - Import wizard: upload → validate → preview → map → import
  - Import chart of accounts
  - Import opening balances
  - Import historical transactions (optional)
  - Conflict resolution for duplicates
- **Status:** Not Started

---

### User Stories - Supplier Invoices (Leverantörsfakturor)

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

---

## Module 2: INVOICING (Fakturering)

*Most functionality already exists. Enhancements needed for accounting integration.*

### User Stories - Invoicing Enhancements

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

## Module 3: TIME & PROJECTS (Tid & Projekt)

### User Stories - Time Tracking

**US-068: Basic Time Tracking** (Enhanced from existing)
- As a **service provider**, in order to **bill clients for time-based work**, I would like to **track time spent on projects and tasks**.
- **Acceptance Criteria:**
  - Timer: start/stop/pause with live counter
  - Manual entry: date, duration, description
  - Link to: client, project, task (optional)
  - Hourly rate (default, per-client, per-project)
  - Billable vs non-billable flag
- **Status:** Not Started

**US-301: Timesheet View**
- As a **team member**, in order to **see my weekly work**, I would like to **view and edit time entries in a weekly timesheet format**.
- **Acceptance Criteria:**
  - Week view with days as columns
  - Rows by project/client
  - Quick entry by clicking cells
  - Daily and weekly totals
  - Submit timesheet for approval (if enabled)
- **Status:** Not Started

**US-302: Time Entry Approval**
- As a **project manager**, in order to **verify time before billing**, I would like to **approve or reject submitted time entries**.
- **Acceptance Criteria:**
  - View pending time entries by team member
  - Approve/reject individual entries or bulk
  - Comments on rejection
  - Approved time ready for invoicing
- **Status:** Not Started

**US-303: Time to Invoice Conversion**
- As a **user**, in order to **bill for tracked time**, I would like to **convert approved time entries into invoice line items**.
- **Acceptance Criteria:**
  - Select unbilled time entries (by client, project, date range)
  - Preview invoice with time details
  - Options: detailed (one line per entry) or summary (totals by project/task)
  - Apply rate from time entry or override
  - Mark time as billed after invoicing
  - Link between invoice and time entries
- **Status:** Not Started

**US-304: Time Reports**
- As a **manager**, in order to **analyze time utilization**, I would like to **generate time tracking reports**.
- **Acceptance Criteria:**
  - By: team member, client, project, date range
  - Metrics: hours logged, billable vs non-billable, billable amount
  - Utilization rate (billable hours / total hours)
  - Charts and visualizations
  - Export to PDF/Excel
- **Status:** Not Started

---

### User Stories - Project Management

**US-071: Project Management** (Enhanced from existing)
- As a **service provider**, in order to **organize client work**, I would like to **create and manage projects with budgets and milestones**.
- **Acceptance Criteria:**
  - Create project: name, client, start/end date, description
  - Project budget: hours and/or amount
  - Billing type: fixed price, time & materials, retainer
  - Project status: active, completed, on hold
  - Assign team members with roles
- **Status:** Not Started

**US-311: Project Budget Tracking**
- As a **project manager**, in order to **stay within budget**, I would like to **track actual vs budgeted hours and costs**.
- **Acceptance Criteria:**
  - Budget: planned hours, planned cost
  - Actual: logged hours, billed amount
  - Variance calculation and alerts
  - Burndown chart
  - Profitability calculation
- **Status:** Not Started

**US-312: Project Tasks**
- As a **project manager**, in order to **break down work**, I would like to **create tasks within projects and track progress**.
- **Acceptance Criteria:**
  - Create tasks with: name, description, estimated hours, assignee
  - Task status: to do, in progress, done
  - Time entries linked to tasks
  - Task list and Kanban views
- **Status:** Not Started

**US-313: Project Billing**
- As a **user**, in order to **invoice project work**, I would like to **generate invoices from project data (time, expenses, fixed fees)**.
- **Acceptance Criteria:**
  - Bill entire project or milestone
  - Include time entries (detailed or summary)
  - Include expenses
  - Add fixed fees
  - Retainer deduction
  - Mark items as billed
- **Status:** Not Started

---

### User Stories - Expense Tracking

**US-069: Expense Tracking** (Enhanced from existing)
- As a **user**, in order to **track business expenses**, I would like to **record expenses and categorize them**.
- **Acceptance Criteria:**
  - Create expense: date, amount, category, description, vendor
  - Attach receipt (image/PDF)
  - Link to: client, project (optional)
  - Billable flag for client-reimbursable expenses
  - Payment method
- **Status:** Not Started

**US-321: Expense Categories**
- As an **organization owner**, in order to **organize expenses**, I would like to **define expense categories linked to chart of accounts**.
- **Acceptance Criteria:**
  - Default Swedish expense categories
  - Custom categories
  - Link to ledger accounts for accounting
  - Active/inactive status
- **Status:** Not Started

**US-322: Expense to Invoice Conversion**
- As a **user**, in order to **bill clients for expenses**, I would like to **add billable expenses to invoices**.
- **Acceptance Criteria:**
  - Select unbilled expenses for client
  - Add to invoice as line items
  - Include or exclude receipt images
  - Markup option (e.g., 10% handling fee)
  - Mark expenses as billed
- **Status:** Not Started

**US-323: Expense Reports**
- As a **manager**, in order to **analyze spending**, I would like to **generate expense reports by category, project, or employee**.
- **Acceptance Criteria:**
  - Filter by: date range, category, project, employee
  - Summary and detailed views
  - Charts by category
  - Export to PDF/Excel
- **Status:** Not Started

**US-070: Receipt Scanning (OCR)** (From existing)
- As a **user**, in order to **quickly capture expenses**, I would like to **scan receipts and auto-extract data**.
- **Status:** Not Started

---

## Module 4: NAVIGATION & UI ARCHITECTURE

### User Stories - Navigation

**US-401: Hierarchical Sidebar Navigation**
- As a **user**, in order to **navigate the expanded application**, I would like to **use a hierarchical sidebar with collapsible module sections**.
- **Acceptance Criteria:**
  - Three main sections: Accounting, Invoicing, Time & Projects
  - Sections are collapsible/expandable
  - Remember expanded state per user
  - Active item highlighting with breadcrumb context
  - Keyboard navigation support
  - Mobile responsive (hamburger menu)
- **Status:** Not Started

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

## Database Schema Additions

### New Tables for Accounting Module

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

-- Bank Accounts
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

### New Tables for Time & Projects Module

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',  -- active, completed, on_hold, cancelled
  billing_type VARCHAR(20) DEFAULT 'hourly',  -- hourly, fixed, retainer
  budget_hours DECIMAL(10,2),
  budget_amount DECIMAL(15,2),
  hourly_rate DECIMAL(10,2),
  fixed_price DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(50) DEFAULT 'member',  -- manager, member
  hourly_rate DECIMAL(10,2),  -- Override project rate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',  -- todo, in_progress, done
  estimated_hours DECIMAL(10,2),
  assignee_id UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  entry_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,  -- In minutes for precision
  description TEXT,
  hourly_rate DECIMAL(10,2),
  is_billable BOOLEAN DEFAULT true,
  is_billed BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES invoices(id),
  status VARCHAR(20) DEFAULT 'draft',  -- draft, submitted, approved, rejected
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  timer_started_at TIMESTAMPTZ,  -- For running timers
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  name_sv VARCHAR(100),
  account_id UUID REFERENCES accounts(id),  -- Link to chart of accounts
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID REFERENCES expense_categories(id),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  expense_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SEK',
  description TEXT,
  vendor VARCHAR(255),
  receipt_url TEXT,
  is_billable BOOLEAN DEFAULT false,
  is_billed BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES invoices(id),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, reimbursed
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)
1. **US-401**: Hierarchical sidebar navigation
2. **US-201-203**: Chart of accounts setup
3. **US-250**: Fiscal year setup
4. **US-210**: Manual journal entries
5. Database migrations for accounting tables

### Phase 2: Core Accounting (6-8 weeks)
1. **US-211**: Invoice → Journal entry integration
2. **US-220-222**: Ledger views and trial balance
3. **US-230-233**: Financial reports (basic versions)
4. **US-240-242**: Bank accounts and reconciliation
5. **US-121-122**: SIE import/export

### Phase 3: Time & Projects (4-6 weeks)
1. **US-068**: Time tracking with timer
2. **US-301-302**: Timesheet and approval
3. **US-071, US-311-312**: Project management
4. **US-303**: Time to invoice conversion
5. **US-069, US-321-323**: Expense tracking

### Phase 4: Advanced Features (4-6 weeks)
1. **US-260-262**: Supplier invoices
2. **US-243**: Open banking integration
3. **US-251-252**: Fiscal year closing and period locking
4. **US-402-404**: Dashboard, search, quick actions
5. Polish and optimization

---

## Success Metrics

- **Accounting Completeness**: Users can run full Swedish-compliant bookkeeping
- **Integration**: Seamless flow between time → invoice → accounting
- **Compliance**: SIE export validated by Swedish accounting software
- **User Adoption**: Time to first journal entry < 5 minutes
- **Data Accuracy**: Trial balance always balances

---

## Open Questions

1. **Pricing Model**: Should accounting be a separate tier, or included in premium?
2. **Multi-currency Accounting**: Full support for foreign currency transactions?
3. **Mobile App**: Priority for time tracking mobile app?
4. **Integrations**: Which Swedish banks to prioritize for Open Banking?
5. **Migration**: Tool to help users migrate from Fortnox/Visma?

---

## References

- [BAS Kontoplan 2024](https://www.bas.se/)
- [Bokföringslagen (BFL)](https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078)
- [Årsredovisningslagen (ÅRL)](https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554)
- [SIE File Format](https://sie.se/)
- [Skatteverket - Moms](https://www.skatteverket.se/foretagochorganisationer/moms.html)
