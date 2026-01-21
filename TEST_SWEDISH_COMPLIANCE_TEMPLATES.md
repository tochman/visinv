# Swedish Compliance Templates Test Plan

## Testing US-067, US-069, US-070, US-071

### Prerequisites
- Organization with complete Swedish compliance data:
  - name
  - organization_number
  - vat_number  
  - municipality
  - address, city, postal_code
  - email, phone
  - f_skatt_approved = true

- Invoice with:
  - Complete client information
  - delivery_date
  - Multiple line items with different VAT rates (0%, 12%, 25%)

### Test Cases

#### TC-1: F-skatt Display (US-067)
**Given** an organization with `f_skatt_approved = true`  
**When** generating a PDF invoice  
**Then** the template should display "✓ Godkänd för F-skatt" (Modern) or "GODKÄND FÖR F-SKATT" (Classic)

**Given** an organization with `f_skatt_approved = false`  
**When** generating a PDF invoice  
**Then** the F-skatt notice should NOT appear

#### TC-2: Organization Information Display (US-069)
**When** generating a PDF invoice  
**Then** the template must show:
- Organization name (prominently)
- Organization number with label "Org.nr:" or "Organisationsnummer:"
- VAT number (if present) with label "Moms nr:" or "Momsregistreringsnummer:"
- Full address: street, postal code, city
- Municipality with "kommun" label (if present)
- Email address (if present)
- Phone number (if present)

#### TC-3: Delivery Date Display (US-066 + US-070)
**When** generating a PDF invoice  
**Then** the template must show:
- Delivery date with label "Leveransdatum"
- Positioned clearly between issue date and due date
- Formatted as YYYY-MM-DD

#### TC-4: VAT Breakdown by Rate (US-070)
**Given** an invoice with line items at different VAT rates (e.g., 25%, 12%, 0%)  
**When** generating a PDF invoice  
**Then** the totals section should show:
- Subtotal (excl VAT)
- Separate row for each VAT rate showing: "Moms XX% (på YY SEK): ZZ SEK"
- Total including all VAT

Example:
```
Delsumma:                1000 SEK
Moms 25% (på 800 SEK):    200 SEK
Moms 12% (på 200 SEK):     24 SEK
Att betala:              1224 SEK
```

#### TC-5: Legal Compliance Footer (US-071)
**When** generating a PDF invoice  
**Then** the template footer must reference:
- Bokföringslagen (1999:1078)
- Mervärdesskattelagen (2023:200)

Modern template footer:
"Denna faktura är upprättad enligt Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)"

Classic template footer:
"Denna faktura är upprättad i enlighet med Bokföringslagen (1999:1078) och Mervärdesskattelagen (2023:200)"

#### TC-6: Client Information Complete (US-069)
**When** generating a PDF invoice  
**Then** the client section must show:
- Client name
- Full address: street, postal code, city
- Country (if present)
- Email (if present)

### Manual Testing Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Ensure organization has complete data:**
   - Go to Settings
   - Verify all mandatory fields are filled
   - Enable "F-skatt approved" checkbox
   - Save

3. **Create test invoice:**
   - Go to Invoices
   - Click "Create Invoice"
   - Select a client with complete address
   - Add items with different VAT rates:
     - Item 1: 1000 SEK @ 25% VAT
     - Item 2: 200 SEK @ 12% VAT  
     - Item 3: 100 SEK @ 0% VAT
   - Set delivery_date to a valid date
   - Save invoice

4. **Generate PDF:**
   - Click download PDF button
   - Open generated PDF
   - Verify all elements from test cases above

5. **Test both templates:**
   - Generate with Modern template
   - Generate with Classic template
   - Compare both meet all requirements

### Expected Results

✅ All mandatory Swedish fields visible on invoice  
✅ F-skatt approval prominently displayed (if approved)  
✅ Delivery date shown with proper label  
✅ VAT breakdown shows each rate separately  
✅ Legal references in footer  
✅ Organization information complete and accurate  
✅ Client information complete  
✅ Professional appearance maintained

### Code Changes Summary

**Files Modified:**
1. `src/services/invoicePdfService.js` - Added organization data to template context
2. `src/pages/Invoices.jsx` - Pass currentOrganization to PDF generator
3. `src/services/resources/InvoiceTemplate.js` - Updated Modern & Classic templates
4. `supabase/migrations/014_update_templates_swedish_compliance.sql` - Database template update

**New Template Variables:**
- `organization_name`
- `organization_number`
- `organization_vat_number`
- `organization_municipality`
- `organization_address`
- `organization_city`
- `organization_postal_code`
- `organization_email`
- `organization_phone`
- `organization_f_skatt_approved`
- `delivery_date`
- `vat_groups` (array of {rate, base, vat})

### Notes

- Templates use Handlebars syntax: `{{variable}}` and `{{#if condition}}...{{/if}}`
- VAT groups are calculated automatically in invoicePdfService.js
- Optional fields use conditional rendering to avoid empty rows
- Swedish language used for all labels (FAKTURA, Delsumma, Moms, etc.)
- Legal compliance text matches exact law references from requirements
