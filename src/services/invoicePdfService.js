import { renderTemplate, exportToPDF } from './templateService';

/**
 * Generate PDF from invoice data and template
 * @param {Object} invoice - Invoice with client and invoice_rows
 * @param {Object} template - Template with content (Handlebars HTML)
 * @param {Object} organization - Organization data for Swedish compliance
 * @returns {Promise<void>}
 */
export async function generateInvoicePDF(invoice, template, organization) {
  if (!invoice || !template) {
    throw new Error('Invoice and template are required');
  }

  const lineItems = invoice.invoice_rows || [];
  const subtotal = calculateSubtotal(lineItems);
  const vatGroups = calculateVATGroups(lineItems, invoice.tax_rate);
  const totalVAT = vatGroups.reduce((sum, group) => sum + group.vat, 0);

  // Build context from invoice data
  const context = {
    // Invoice details
    invoice_number: invoice.invoice_number,
    issue_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    delivery_date: formatDate(invoice.delivery_date),
    status: invoice.status,
    reference: invoice.reference || '',
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    currency: invoice.currency || 'SEK',
    
    // Client information
    client_name: invoice.client?.name || '',
    client_email: invoice.client?.email || '',
    client_address: invoice.client?.address || '',
    client_city: invoice.client?.city || '',
    client_postal_code: invoice.client?.postal_code || '',
    client_country: invoice.client?.country || '',
    
    // Organization information (Swedish compliance)
    organization_name: organization?.name || '',
    organization_number: organization?.organization_number || '',
    organization_vat_number: organization?.vat_number || '',
    organization_municipality: organization?.municipality || '',
    organization_address: organization?.address || '',
    organization_city: organization?.city || '',
    organization_postal_code: organization?.postal_code || '',
    organization_country: organization?.country || 'Sweden',
    organization_email: organization?.email || '',
    organization_phone: organization?.phone || '',
    organization_website: organization?.website || '',
    organization_f_skatt_approved: organization?.f_skatt_approved || false,
    
    // Financial calculations
    tax_rate: invoice.tax_rate || 0,
    subtotal: subtotal,
    tax_amount: totalVAT,
    vat_groups: vatGroups,
    total: subtotal + totalVAT,
    line_items: lineItems.map(row => ({
      description: row.description,
      quantity: row.quantity,
      unit: row.unit || 'st',
      unit_price: row.unit_price,
      tax_rate: row.tax_rate || invoice.tax_rate || 0,
      amount: row.amount || (row.quantity * row.unit_price)
    }))
  };

  // Render template with invoice data
  const rendered = renderTemplate(template.content, context);

  // Generate filename
  const filename = `${invoice.invoice_number.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

  // Export to PDF
  await exportToPDF(rendered, filename);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate subtotal from line items
 */
function calculateSubtotal(lineItems) {
  return lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0));
  }, 0);
}

/**
 * Calculate tax amount
 */
function calculateTaxAmount(lineItems, taxRate) {
  const subtotal = calculateSubtotal(lineItems);
  return (subtotal * parseFloat(taxRate || 0)) / 100;
}

/**
 * Calculate VAT groups by tax rate
 */
function calculateVATGroups(lineItems, defaultTaxRate) {
  const groups = {};
  
  lineItems.forEach(item => {
    const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
    const taxRate = parseFloat(item.tax_rate || defaultTaxRate || 0);
    
    if (!groups[taxRate]) {
      groups[taxRate] = { rate: taxRate, base: 0, vat: 0 };
    }
    
    groups[taxRate].base += itemTotal;
    groups[taxRate].vat += (itemTotal * taxRate) / 100;
  });
  
  return Object.values(groups).sort((a, b) => b.rate - a.rate);
}
