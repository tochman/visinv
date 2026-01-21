# User Stories: Swedish Invoice Compliance

Based on Swedish legal requirements (Mervärdesskattelagen, Bokföringslagen, Aktiebolagslagen)

## Epic: Mandatory Invoice Information (Mervärdesskattelagen 2023:200)

### US-061: Organization Mandatory Fields
**As a** Swedish business owner  
**I want** the system to require all legally mandatory organization information  
**So that** my invoices are legally valid and compliant with Swedish law

**Acceptance Criteria:**
- Organization name is mandatory (required for Aktiebolagslagen)
- Organization number is mandatory (required for Aktiebolagslagen)
- Municipality is mandatory (required for Aktiebolagslagen)
- VAT registration number is mandatory (required for Mervärdesskattelagen)
- Address is mandatory (required for Mervärdesskattelagen)
- City is mandatory
- Postal code is mandatory
- Email is mandatory for contact
- Database has NOT NULL constraints on these fields
- UI shows clear validation errors if fields are missing
- Cannot save organization without completing all mandatory fields
- Wizard prevents proceeding to next step if mandatory fields are empty

**Implementation Notes:**
- Update migration to add NOT NULL constraints
- Update OrganizationSetupWizard with validation
- Update Settings page organization form with validation
- Add Swedish-specific help text explaining why fields are required

---

### US-062: Client Mandatory Fields
**As a** user creating invoices  
**I want** the system to require complete client information  
**So that** invoices contain all legally required recipient data

**Acceptance Criteria:**
- Client name is mandatory
- Client address is mandatory (required for Mervärdesskattelagen)
- Client postal code is mandatory
- Client city is mandatory
- Client country is mandatory (defaults to Sweden)
- VAT number is optional but validated if provided
- Database has NOT NULL constraints on required fields
- UI shows validation errors
- Cannot create/save client without mandatory fields

**Implementation Notes:**
- Update clients table schema
- Update ClientForm component
- Add validation to clientService

---

### US-063: Invoice Mandatory Fields Validation
**As a** user creating invoices  
**I want** the system to ensure all legally required information is present  
**So that** my invoices are legally valid

**Acceptance Criteria:**
- Invoice date is mandatory (fakturadatum)
- Invoice number is mandatory and unique (fakturanummer)
- Due date is mandatory (förfallodatum)
- At least one invoice item is required
- Each item must have:
  - Description (specifikation)
  - Quantity > 0
  - Unit price (pris exklusive moms)
  - VAT rate (momssats: 25%, 12%, 6%, or 0%)
- Cannot save invoice without all mandatory fields
- Cannot mark invoice as sent without validation passing
- Clear error messages for each missing field

**Implementation Notes:**
- Add validation to invoiceService
- Update InvoiceForm component
- Add pre-send validation check

---

### US-064: Invoice Item VAT Rate Required
**As a** user adding items to an invoice  
**I want** to always specify a VAT rate for each item  
**So that** invoices comply with Swedish VAT reporting requirements

**Acceptance Criteria:**
- VAT rate is mandatory for each invoice item
- Available rates: 25% (standard), 12% (reduced), 6% (reduced), 0% (exempt)
- Default rate is 25% (Swedish standard rate)
- If 0% selected, user can optionally add VAT exemption reference
- Database enforces NOT NULL on tax_rate column
- UI shows dropdown with standard Swedish VAT rates

**Implementation Notes:**
- Update invoice_rows table
- Update InvoiceItemRow component
- Add Swedish VAT rate constants

---

## Epic: Additional Required Information

### US-065: Late Payment Interest Terms
**As a** business owner  
**I want** to specify late payment interest terms on invoices  
**So that** clients know the consequences of late payment

**Acceptance Criteria:**
- Organization settings include default late payment interest rate
- Default value is Swedish legal default (Räntelagen: referensräntan + 8%)
- Can be customized per organization
- Displayed on invoice template
- Optional field to override per invoice

**Implementation Notes:**
- Add `late_payment_interest_rate` to organizations table
- Add to organization settings UI
- Update invoice templates to show terms

---

### US-066: Delivery/Service Date
**As a** user creating invoices  
**I want** to record when goods were delivered or services performed  
**So that** invoices comply with requirement "datum då varorna såldes eller tjänsterna utfördes"

**Acceptance Criteria:**
- Invoice has delivery_date field
- Defaults to invoice_date
- Can be set to different date if needed
- Displayed on invoice template as "Leveransdatum"
- Validated to not be in future

**Implementation Notes:**
- Add `delivery_date` to invoices table
- Add field to InvoiceForm
- Update all invoice templates

---

### US-067: F-Skatt Approval Display
**Status:** ✅ COMPLETED  
**Completed:** 2024  
**Implementation:** Migration 014, Modern & Classic templates updated

**As a** business owner with F-skatt approval  
**I want** this clearly displayed on my invoices  
**So that** clients know they don't need to deduct preliminary tax

**Acceptance Criteria:**
- ✅ Organization has f_skatt_approved boolean field (already exists)
- ✅ When true, invoices show "Godkänd för F-skatt" (Modern) / "GODKÄND FÖR F-SKATT" (Classic)
- ✅ Templates display F-skatt approval prominently with visual styling
- ✅ Settings page allows toggling this setting (data-cy="org-f-skatt-approved")

**Implementation Notes:**
- ✅ Field exists in organizations table
- ✅ Modern template: blue box with checkmark "✓ Godkänd för F-skatt"
- ✅ Classic template: bordered box "GODKÄND FÖR F-SKATT"
- ✅ Templates use Handlebars conditional: `{{#if organization_f_skatt_approved}}`
- ✅ Organization data passed to PDF generator via currentOrganization

**Files Changed:**
- `src/services/invoicePdfService.js`
- `src/pages/Invoices.jsx`
- `src/services/resources/InvoiceTemplate.js`
- `supabase/migrations/014_update_templates_swedish_compliance.sql`

---

### US-068: Payment Reference Number (OCR)
**As a** user sending invoices  
**I want** each invoice to have a unique payment reference (OCR number)  
**So that** payments are automatically matched to invoices

**Acceptance Criteria:**
- System generates OCR number for each invoice
- OCR follows Swedish standard (Bankgirot OCR format)
- Checksum validation (Modulo 10 or Modulo 11)
- Displayed on invoice template
- Used in payment reconciliation

**Implementation Notes:**
- Add `payment_reference` (OCR) to invoices table
- Create OCR generation function
- Update invoice templates
- This is important for Swedish business automation

---

## Epic: Template Compliance

### US-069: Update Classic Template for Compliance
**Status:** ✅ COMPLETED  
**Completed:** 2024  
**Implementation:** Migration 014, Classic template fully compliant

**As a** user using the Classic template  
**I want** it to display all legally required information  
**So that** my invoices are compliant without customization

**Acceptance Criteria:**
- ✅ Shows organization name, organization number, municipality
- ✅ Shows organization VAT number
- ✅ Shows organization full address
- ✅ Shows client full address
- ✅ Shows invoice date (fakturadatum)
- ✅ Shows delivery date (leveransdatum)
- ✅ Shows due date (förfallodatum)
- ✅ Shows payment terms (if provided)
- ✅ Shows notes (if provided)
- ✅ Shows F-skatt approval status (if applicable) - "GODKÄND FÖR F-SKATT"
- ✅ Each line item shows:
  - Description
  - Quantity
  - Unit (st, timmar, etc.)
  - Unit price (á-pris)
  - VAT rate (Moms %)
  - Line total (Belopp)
- ✅ Shows subtotal (Delsumma) excluding VAT
- ✅ Shows VAT amount per rate: "Moms XX% (på YY SEK): ZZ SEK"
- ✅ Shows total amount (ATT BETALA) including VAT
- ✅ Legal compliance footer references Bokföringslagen and Mervärdesskattelagen

**Implementation Notes:**
- ✅ Updated Classic template with Times New Roman serif font
- ✅ Traditional centered header with organization details
- ✅ Two-column info grid for client and invoice dates
- ✅ Full-width table with borders
- ✅ F-skatt box: bordered, centered, bold
- ✅ Totals table right-aligned
- ✅ Legal references in footer
- ✅ All fields use Handlebars variables from invoicePdfService context

**Files Changed:**
- `src/services/resources/InvoiceTemplate.js` - Classic template HTML
- `supabase/migrations/014_update_templates_swedish_compliance.sql`

---

### US-070: Update Modern Template for Compliance
**Status:** ✅ COMPLETED  
**Completed:** 2024  
**Implementation:** Migration 014, Modern template fully compliant

**As a** user using the Modern template  
**I want** it to display all legally required information  
**So that** my invoices meet Swedish legal requirements

**Acceptance Criteria:**
- ✅ Same mandatory fields as US-069 for Classic template
- ✅ Modern visual design while maintaining compliance
- ✅ All legally required information clearly visible
- ✅ Professional blue accent color scheme
- ✅ Clean typography and spacing

**Implementation Notes:**
- ✅ Updated Modern template with Arial sans-serif font
- ✅ Split header: invoice title left, organization details right
- ✅ F-skatt box: blue background with border, checkmark icon
- ✅ Two-column grid for client and dates
- ✅ Minimalist table with hover effects
- ✅ Right-aligned totals section
- ✅ Color-coded total row in blue (#3b82f6)
- ✅ Legal footer with references
- ✅ Uses same Handlebars variables as Classic

**Files Changed:**
- `src/services/resources/InvoiceTemplate.js` - Modern template HTML
- `supabase/migrations/014_update_templates_swedish_compliance.sql`

---

### US-071: Update Minimalist Template for Compliance
**Status:** ⏳ PENDING (No Minimalist template exists yet)  
**Note:** Only Modern and Classic templates currently exist in the system

**As a** user using the Minimalist template  
**I want** it to include all legally required information  
**So that** despite being "minimalist", invoices are legally valid

**Acceptance Criteria:**
- Same mandatory fields as US-069
- Clean, minimal design
- All legal requirements met
- No optional decorative elements, but all required data present

**Implementation Notes:**
- Update Minimalist.jsx template
- Balance minimalism with legal compliance

---

## Epic: Validation & Error Handling

### US-072: Pre-Send Invoice Validation
**As a** user about to send an invoice  
**I want** the system to validate completeness before sending  
**So that** I don't send non-compliant invoices

**Acceptance Criteria:**
- "Send Invoice" button triggers validation check
- Validates all mandatory organization fields present
- Validates all mandatory client fields present
- Validates all mandatory invoice fields present
- Validates at least one invoice item exists
- Validates all items have description, quantity, price, VAT rate
- Shows detailed error message listing all missing fields
- Prevents sending until all errors resolved
- Shows green checkmark/confirmation when validation passes

**Implementation Notes:**
- Create validateInvoiceCompliance() function
- Add to InvoiceDetail page before send action
- Show validation modal with checklist

---

### US-073: Validation Error Messages in Swedish
**As a** Swedish user  
**I want** validation errors in Swedish  
**So that** I understand what's required

**Acceptance Criteria:**
- All validation messages available in Swedish
- Clear explanation of why field is required (which law)
- Helpful guidance on how to fix the issue
- Link to settings/forms where data can be completed

**Implementation Notes:**
- Add Swedish translations for all validation messages
- Include legal references in help text
- Add i18n support if not already present

---

## Epic: Database Schema Updates

### US-074: Add Database Constraints for Mandatory Fields
**As a** system administrator  
**I want** the database to enforce mandatory fields  
**So that** data integrity is maintained at the lowest level

**Acceptance Criteria:**
- Organizations table:
  - `name` NOT NULL
  - `organization_number` NOT NULL
  - `municipality` NOT NULL
  - `vat_number` NOT NULL
  - `address` NOT NULL
  - `city` NOT NULL
  - `postal_code` NOT NULL
  - `email` NOT NULL
- Clients table:
  - `name` NOT NULL
  - `address` NOT NULL
  - `postal_code` NOT NULL
  - `city` NOT NULL
  - `country` NOT NULL DEFAULT 'Sweden'
- Invoices table:
  - `invoice_date` NOT NULL
  - `due_date` NOT NULL
  - `delivery_date` NOT NULL
- Invoice_rows table:
  - `description` NOT NULL
  - `quantity` NOT NULL CHECK (quantity > 0)
  - `unit_price` NOT NULL
  - `tax_rate` NOT NULL
- Migration is reversible
- Existing data is handled (set defaults or require manual update)

**Implementation Notes:**
- Create migration 013_add_mandatory_constraints.sql
- Handle existing NULL values before adding constraints
- Test migration on copy of production data

---

## Epic: Reporting & Compliance Checks

### US-075: Invoice Compliance Report
**As a** business owner  
**I want** to see which of my invoices are missing required information  
**So that** I can fix them before tax audit

**Acceptance Criteria:**
- Dashboard shows count of non-compliant invoices
- Can view list of all invoices with compliance status
- Each invoice shows which fields are missing
- Can filter to show only non-compliant invoices
- Can export compliance report for accountant

**Implementation Notes:**
- Add compliance check service function
- Add dashboard widget
- Create compliance report page

---

## Priority Order

**Phase 1 - Critical (Must Have):**
1. US-074: Database constraints
2. US-061: Organization mandatory fields
3. US-062: Client mandatory fields
4. US-063: Invoice mandatory fields validation
5. US-064: VAT rate required
6. US-067: F-skatt display (LEGAL REQUIREMENT)

**Phase 2 - Important (Should Have):**
7. US-066: Delivery/Service date
8. US-069: Update Classic template
9. US-070: Update Modern template
10. US-071: Update Minimalist template
11. US-072: Pre-send validation

**Phase 3 - Nice to Have (Could Have):**
12. US-065: Late payment interest terms
13. US-068: OCR payment reference
14. US-073: Swedish error messages
15. US-075: Compliance report

---

## Technical Notes

### Swedish VAT Rates (2024)
- 25%: Standard rate (normal moms)
- 12%: Reduced rate (livsmedel, restaurang)
- 6%: Reduced rate (böcker, tidningar, kulturella tjänster)
- 0%: Exempt (momsfria tjänster)

### OCR Standards
- Bankgirot OCR: Length-based with checksum
- Modulo 10 (most common for invoices)
- Format: 2-25 digits

### Legal References
- Mervärdesskattelagen (2023:200) - Chapter 11, §1
- Bokföringslagen (1999:1078) - Chapter 5, §1-2
- Aktiebolagslagen (2005:551) - Chapter 2, §5

