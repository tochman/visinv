# Invoice SaaS - Feature Documentation

## User Stories

### Authentication & User Management

**US-001: Email Authentication** ✅
- As a **user**, in order to **securely access my account**, I would like to **register and login using my email address and password**.
- **Status:** Implemented - Email/password auth with sign up/sign in pages, protected routes, profile management

**US-002: Google OAuth Authentication** ✅
- As a **user**, in order to **quickly access the platform without creating a new password**, I would like to **sign in using my Google account**.
- **Status:** Implemented - OAuth integration with redirect handling, configured in authService

**US-003: User Profile Management**
- As a **user**, in order to **personalize my account and invoices**, I would like to **upload my avatar and company logo to Supabase storage**.
- **Status:** Partial - Profile table exists, storage buckets configured, UI needs implementation

---

### Free Tier Features

**US-004: Free Invoice Limit**
- As a **free user**, in order to **try the platform before committing**, I would like to **create and send up to 10 invoices for free**.

**US-005: Client Management** ✅
- As a **free user**, in order to **organize my customer information**, I would like to **create, edit, and manage client profiles with contact details**.
- **Status:** Implemented - Full CRUD operations with search, modal forms, and i18n support

**US-006: Invoice Creation**
- As a **free user**, in order to **bill my clients**, I would like to **create invoices with multiple line items, tax calculations, and client information**.

**US-007: Product Catalog (Optional)**
- As a **free user**, in order to **speed up invoice creation**, I would like to **maintain a product/service catalog that I can add to invoices**.

**US-008: Invoice Email Delivery**
- As a **free user**, in order to **send invoices to my clients**, I would like to **email invoices using Resend integration**.

**US-009: Invoice Printing**
- As a **free user**, in order to **provide physical copies**, I would like to **print invoices in a professional format**.

**US-010: PDF Generation**
- As a **free user**, in order to **share invoices in a standard format**, I would like to **download invoices as PDF files**.

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

**US-016: Team Creation**
- As a **premium user**, in order to **collaborate with my team**, I would like to **create teams and invite team members**.

**US-017: Team Collaboration**
- As a **premium team member**, in order to **work efficiently with colleagues**, I would like to **share access to clients, invoices, and templates within my team**.

**US-018: Team Role Management**
- As a **premium team owner**, in order to **control access levels**, I would like to **assign roles and permissions to team members**.

---

### Invoice Management

**US-019: Invoice Status Tracking**
- As a **user**, in order to **monitor payment progress**, I would like to **track invoice statuses (draft, sent, paid, overdue, cancelled)**.

**US-020: Payment Recording**
- As a **user**, in order to **keep accurate financial records**, I would like to **record payments received against invoices**.

**US-021: Invoice Numbering System**
- As a **user**, in order to **maintain professional record-keeping**, I would like to **automatically generate sequential invoice numbers with custom formats**.

**US-022: Per-Client Invoice Sequences**
- As a **user**, in order to **organize invoices by client**, I would like to **maintain separate invoice number sequences for different clients** (optional).

**US-023: Tax/VAT Calculations**
- As a **user**, in order to **comply with tax regulations**, I would like to **automatically calculate and display taxes (including Swedish moms)**.

**US-024: Multi-Currency Support**
- As a **premium user**, in order to **invoice international clients**, I would like to **create invoices in different currencies**.

**US-025: Recurring Invoices**
- As a **premium user**, in order to **automate subscription billing**, I would like to **set up recurring invoices with custom intervals**.

---

### Notifications & Reminders

**US-026: Email Notifications**
- As a **user**, in order to **stay informed about invoice activity**, I would like to **receive email notifications when invoices are viewed or paid**.

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

**US-031: Outstanding Invoice Summary**
- As a **user**, in order to **manage cash flow**, I would like to **see a summary of all outstanding and overdue invoices**.

**US-032: Client Revenue Breakdown**
- As a **premium user**, in order to **identify top clients**, I would like to **view revenue breakdowns by client**.

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

**US-036: Admin Dashboard Access**
- As an **admin (thomas@communitaslabs.io)**, in order to **manage the platform**, I would like to **access a dedicated admin dashboard with full system access**.

**US-037: User Management**
- As an **admin**, in order to **support users**, I would like to **view and manage all user accounts, teams, and subscriptions**.

**US-038: Platform Analytics**
- As an **admin**, in order to **monitor platform health**, I would like to **view metrics on user signups, active subscriptions, and invoice volumes**.

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
