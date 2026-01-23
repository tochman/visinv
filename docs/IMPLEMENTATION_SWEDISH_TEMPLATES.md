# Swedish Invoice Template Compliance - Implementation Summary

## Completed User Stories

### US-067: F-skatt Approval Display ✅
Display "Godkänd för F-skatt" on invoices when organization is F-skatt approved.

**Implementation:**
- Modern template: Blue highlighted box with checkmark "✓ Godkänd för F-skatt"
- Classic template: Bordered box with "GODKÄND FÖR F-SKATT"
- Conditional display using `{{#if organization_f_skatt_approved}}`
- Toggle available in Settings page

### US-069: Classic Template Compliance ✅
Updated Classic template to include all Swedish mandatory invoice fields.

**Key Features:**
- Traditional serif font (Times New Roman)
- Centered header with full organization details
- Prominent F-skatt display (if approved)
- Two-column layout for client and invoice information
- Full-width bordered table for line items
- VAT breakdown by rate in totals section
- Legal compliance footer

### US-070: Modern Template Compliance ✅
Updated Modern template to include all Swedish mandatory invoice fields.

**Key Features:**
- Clean sans-serif font (Arial)
- Split header layout (title left, organization right)
- Blue accent color theme (#3b82f6)
- Stylish F-skatt badge (if approved)
- Grid layout for information sections
- Minimal table design with hover effects
- VAT breakdown by rate
- Legal compliance footer

### US-071: Minimalist Template ⏳
Status: Pending (template doesn't exist yet in the system)

## Technical Implementation

### 1. Invoice PDF Service Enhancement
**File:** `src/services/invoicePdfService.js`

Added organization data to template context:
```javascript
export async function generateInvoicePDF(invoice, template, organization) {
  const context = {
    // Organization data (Swedish compliance)
    organization_name: organization?.name || '',
    organization_number: organization?.organization_number || '',
    organization_vat_number: organization?.vat_number || '',
    organization_municipality: organization?.municipality || '',
    organization_address: organization?.address || '',
    organization_city: organization?.city || '',
    organization_postal_code: organization?.postal_code || '',
    organization_email: organization?.email || '',
    organization_phone: organization?.phone || '',
    organization_f_skatt_approved: organization?.f_skatt_approved || false,
    
    // Invoice data
    delivery_date: formatDate(invoice.delivery_date),
    // ... other fields
    
    // VAT calculations
    vat_groups: vatGroups, // Array of {rate, base, vat}
    // ...
  };
}
```

### 2. Invoices Page Update
**File:** `src/pages/Invoices.jsx`

Pass organization to PDF generator:
```javascript
import { useOrganization } from '../contexts/OrganizationContext';

const { currentOrganization } = useOrganization();

await generateInvoicePDF(invoice, template, currentOrganization);
```

### 3. Template Updates
**File:** `src/services/resources/InvoiceTemplate.js`

Updated both Modern and Classic template HTML to include:

**Organization Section:**
- Company name (prominent)
- Organization number (Org.nr / Organisationsnummer)
- VAT number (Moms nr / Momsregistreringsnummer)
- Full address (street, postal code, city)
- Municipality with "kommun" suffix
- Email and phone (if available)

**F-skatt Display:**
```html
{{#if organization_f_skatt_approved}}
<div class="f-skatt">
  ✓ Godkänd för F-skatt
</div>
{{/if}}
```

**Invoice Information:**
- Invoice number (Fakturanummer)
- Issue date (Fakturadatum)
- **Delivery date** (Leveransdatum) - NEW!
- Due date (Förfallodatum)
- Reference (Er referens)

**Line Items Table:**
- Description (Beskrivning)
- Quantity (Antal)
- Unit (Enhet) - e.g., "st", "timmar"
- Unit price (Á-pris)
- **VAT rate** (Moms %) - per item
- Amount (Belopp)

**Totals Section with VAT Breakdown:**
```html
<tr>
  <td class="label">Delsumma:</td>
  <td class="amount">{{subtotal}} {{currency}}</td>
</tr>
{{#each vat_groups}}
<tr>
  <td class="label">Moms {{rate}}% ({{base}} {{../currency}}):</td>
  <td class="amount">{{vat}} {{../currency}}</td>
</tr>
{{/each}}
<tr class="total-row">
  <td class="label">Att betala:</td>
  <td class="amount">{{total}} {{currency}}</td>
</tr>
```

**Legal Compliance Footer:**
- Modern: "Denna faktura är upprättad enligt Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)"
- Classic: "Denna faktura är upprättad i enlighet med Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)"

### 4. Database Migration
**File:** `supabase/migrations/014_update_templates_swedish_compliance.sql`

- Deletes old system templates
- Inserts updated Modern template with full Swedish compliance
- Inserts updated Classic template with full Swedish compliance
- Updates template variables array to include all new fields

## Swedish Legal Compliance Coverage

### Bokföringslagen (1999:1078) Requirements ✅
- ✅ Seller's name and address
- ✅ Buyer's name and address  
- ✅ Invoice date
- ✅ Delivery date (when goods/services delivered)
- ✅ Description of goods/services
- ✅ Quantity and unit price
- ✅ Total amount

### Mervärdesskattelagen (2023:200) Requirements ✅
- ✅ Seller's VAT number
- ✅ Invoice number (sequential)
- ✅ Issue date
- ✅ Delivery date
- ✅ VAT rate per item
- ✅ VAT amount per rate
- ✅ Total amount including VAT
- ✅ Breakdown of amounts by VAT rate

### Aktiebolagslagen (2005:551) Requirements ✅
- ✅ Organization number (organisationsnummer)
- ✅ Municipality (kommun)
- ✅ Registered address

### F-skatt Display (Tax Regulation) ✅
- ✅ F-skatt approval status clearly visible when applicable
- ✅ Helps clients avoid withholding preliminary tax

## Template Variables Available

All Handlebars templates have access to:

**Invoice Data:**
- `invoice_number`
- `issue_date`
- `delivery_date`
- `due_date`
- `reference`
- `notes`
- `terms`
- `currency`
- `status`

**Client Data:**
- `client_name`
- `client_address`
- `client_city`
- `client_postal_code`
- `client_country`
- `client_email`

**Organization Data:**
- `organization_name`
- `organization_number`
- `organization_vat_number`
- `organization_municipality`
- `organization_address`
- `organization_city`
- `organization_postal_code`
- `organization_country`
- `organization_email`
- `organization_phone`
- `organization_website`
- `organization_f_skatt_approved`

**Financial Data:**
- `subtotal` (excluding VAT)
- `tax_rate` (default rate)
- `tax_amount` (total VAT)
- `total` (including VAT)
- `vat_groups` (array): `[{rate: 25, base: 1000, vat: 250}, ...]`
- `line_items` (array): `[{description, quantity, unit, unit_price, tax_rate, amount}, ...]`

## Testing

See `TEST_SWEDISH_COMPLIANCE_TEMPLATES.md` for complete test plan.

**Key Test Cases:**
1. F-skatt display toggles correctly
2. All organization fields appear on invoice
3. Delivery date displayed
4. VAT breakdown shows multiple rates correctly
5. Legal references in footer
6. Both Modern and Classic templates render properly

## Migration Instructions

1. **Apply migration:**
   ```bash
   npx supabase db reset --local
   # Or in production:
   npx supabase db push
   ```

2. **Verify templates:**
   - Check Templates page shows Modern and Classic
   - Templates marked as "System Template"

3. **Test PDF generation:**
   - Create invoice with complete data
   - Enable F-skatt in organization settings
   - Download PDF with both templates
   - Verify all fields appear correctly

## Next Steps (Future User Stories)

- **US-068:** OCR payment reference numbers (Bankgirot format)
- **US-065:** Late payment interest calculations
- **US-073:** Swedish error messages for validation
- **Banking information:** Bank Giro, Plus Giro display on invoices
- **Payment terms:** Standardized Swedish payment terms

## Summary

✅ **Completed:** US-067, US-069, US-070  
⏳ **Pending:** US-071 (Minimalist template doesn't exist)  
📄 **Files Modified:** 4  
🔄 **Migration:** 014_update_templates_swedish_compliance.sql  
✅ **Legal Compliance:** Full Bokföringslagen, Mervärdesskattelagen, Aktiebolagslagen coverage  
🎨 **Templates:** Modern (blue theme), Classic (traditional serif)  
🇸🇪 **Language:** All labels in Swedish

Both invoice templates now meet all Swedish legal requirements for business invoicing and display F-skatt approval status prominently when applicable.
