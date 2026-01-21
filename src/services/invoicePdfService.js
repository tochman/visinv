import { renderTemplate, exportToPDF } from './templateService';

/**
 * Generate PDF from invoice data and template
 * @param {Object} invoice - Invoice with client and invoice_rows
 * @param {Object} template - Template with content (Handlebars HTML)
 * @returns {Promise<void>}
 */
export async function generateInvoicePDF(invoice, template) {
  if (!invoice || !template) {
    throw new Error('Invoice and template are required');
  }

  // Build context from invoice data
  const context = {
    invoice_number: invoice.invoice_number,
    client_name: invoice.client?.name || '',
    client_email: invoice.client?.email || '',
    client_address: invoice.client?.address || '',
    client_city: invoice.client?.city || '',
    client_postal_code: invoice.client?.postal_code || '',
    client_country: invoice.client?.country || '',
    issue_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    status: invoice.status,
    reference: invoice.reference || '',
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    currency: invoice.currency || 'SEK',
    tax_rate: invoice.tax_rate || 0,
    subtotal: calculateSubtotal(invoice.invoice_rows || []),
    tax_amount: calculateTaxAmount(invoice.invoice_rows || [], invoice.tax_rate || 0),
    total: invoice.total_amount || 0,
    line_items: (invoice.invoice_rows || []).map(row => ({
      description: row.description,
      quantity: row.quantity,
      unit: row.unit || 'st',
      unit_price: row.unit_price,
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
