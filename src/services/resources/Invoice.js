import { BaseResource } from './BaseResource';

/**
 * Invoice Resource
 * Handles all invoice-related data operations
 */
class InvoiceResource extends BaseResource {
  constructor() {
    super('invoices');
  }

  /**
   * Get all invoices for the current user
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    return super.index({
      select: `
        *,
        client:clients(id, name, email),
        invoice_rows(*)
      `,
      order: 'created_at',
      ascending: false,
      ...options,
    });
  }

  /**
   * Get a single invoice with all related data
   * @param {string} id - Invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        client:clients(*),
        invoice_rows(*),
        template:templates(*)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  /**
   * Create a new invoice with line items
   * @param {Object} invoiceData - Invoice data
   * @param {Array} invoiceData.rows - Invoice line items
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(invoiceData) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { rows, ...invoiceFields } = invoiceData;

    // Generate invoice number if not provided
    if (!invoiceFields.invoice_number) {
      const number = await this.generateInvoiceNumber();
      invoiceFields.invoice_number = number;
    }

    // Generate OCR payment reference if not provided
    if (!invoiceFields.payment_reference) {
      invoiceFields.payment_reference = this.generateOCR(invoiceFields.invoice_number);
    }

    // Calculate totals
    const calculatedFields = this.calculateTotals(rows || [], invoiceFields.tax_rate || 25);

    // Create invoice
    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .insert({
        ...invoiceFields,
        ...calculatedFields,
        user_id: user.id,
      })
      .select()
      .single();

    if (invoiceError) return { data: null, error: invoiceError };

    // Create invoice rows if provided
    if (rows && rows.length > 0) {
      const rowsWithInvoiceId = rows.map((row, index) => ({
        ...row,
        invoice_id: invoice.id,
        sort_order: index,
        amount: (parseFloat(row.quantity) * parseFloat(row.unit_price)).toFixed(2),
      }));

      const { error: rowsError } = await this.supabase
        .from('invoice_rows')
        .insert(rowsWithInvoiceId);

      if (rowsError) {
        // Rollback: delete the invoice if rows fail
        await this.supabase.from(this.tableName).delete().eq('id', invoice.id);
        return { data: null, error: rowsError };
      }
    }

    // Fetch complete invoice with relations
    return this.show(invoice.id);
  }

  /**
   * Update an invoice and its line items
   * @param {string} id - Invoice ID
   * @param {Object} updates - Invoice updates
   * @param {Array} updates.rows - Invoice line items (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    const { rows, ...invoiceFields } = updates;

    // Recalculate totals if rows are provided
    if (rows) {
      const calculatedFields = this.calculateTotals(rows, invoiceFields.tax_rate || 25);
      Object.assign(invoiceFields, calculatedFields);
    }

    // Update invoice
    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .update(invoiceFields)
      .eq('id', id)
      .select()
      .single();

    if (invoiceError) return { data: null, error: invoiceError };

    // Update rows if provided
    if (rows) {
      // Delete existing rows
      await this.supabase
        .from('invoice_rows')
        .delete()
        .eq('invoice_id', id);

      // Insert new rows
      if (rows.length > 0) {
        const rowsWithInvoiceId = rows.map((row, index) => ({
          ...row,
          invoice_id: id,
          sort_order: index,
          amount: (parseFloat(row.quantity) * parseFloat(row.unit_price)).toFixed(2),
        }));

        const { error: rowsError } = await this.supabase
          .from('invoice_rows')
          .insert(rowsWithInvoiceId);

        if (rowsError) return { data: null, error: rowsError };
      }
    }

    // Fetch complete invoice with relations
    return this.show(id);
  }

  /**
   * Get invoices by client
   * @param {string} clientId - Client ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byClient(clientId) {
    return this.index({
      filters: [{ column: 'client_id', value: clientId }],
    });
  }

  /**
   * Get invoices by status
   * @param {string} status - Invoice status (draft, sent, paid, overdue, cancelled)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byStatus(status) {
    return this.index({
      filters: [{ column: 'status', value: status }],
    });
  }

  /**
   * Get overdue invoices
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async overdue() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, client:clients(id, name, email), invoice_rows(*)')
      .eq('status', 'sent')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date');

    return { data, error };
  }

  /**
   * Mark invoice as sent
   * @param {string} id - Invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markAsSent(id) {
    return this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  }

  /**
   * Mark invoice as paid
   * @param {string} id - Invoice ID
   * @param {Date} paidAt - Payment date (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markAsPaid(id, paidAt = null) {
    return this.update(id, {
      status: 'paid',
      paid_at: paidAt || new Date().toISOString(),
    });
  }

  /**
   * Generate next invoice number
   * @returns {Promise<string>}
   */
  async generateInvoiceNumber() {
    const { user } = await this.getCurrentUser();
    if (!user) return 'INV-0001';

    const { data } = await this.supabase
      .from(this.tableName)
      .select('invoice_number')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return 'INV-0001';
    }

    // Extract number from last invoice (e.g., "INV-0042" -> 42)
    const lastNumber = data[0].invoice_number.match(/\d+$/);
    const nextNumber = lastNumber ? parseInt(lastNumber[0]) + 1 : 1;
    
    return `INV-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Generate OCR payment reference with Modulo 10 checksum
   * @param {string} invoiceNumber - Invoice number (e.g., "INV-0042")
   * @returns {string} OCR number with checksum
   * 
   * Swedish Bankgirot OCR format with Modulo 10 checksum (Luhn algorithm)
   * Example: INV-0001 -> 1 -> 17 (1 + checksum 7)
   * Example: INV-0042 -> 42 -> 424 (42 + checksum 4)
   */
  generateOCR(invoiceNumber) {
    // Extract numeric part from invoice number and convert to integer to remove leading zeros
    const numericPart = invoiceNumber.replace(/\D/g, '');
    const baseNumber = parseInt(numericPart, 10).toString();
    
    // Pad to at least 2 digits for consistent formatting
    const paddedBase = baseNumber.padStart(2, '0');
    
    // Calculate Modulo 10 checksum (Luhn algorithm)
    const checksum = this.calculateModulo10(paddedBase);
    
    // Return OCR with checksum appended
    return paddedBase + checksum;
  }

  /**
   * Calculate Modulo 10 checksum (Luhn algorithm) for OCR
   * @param {string} number - Number string to calculate checksum for
   * @returns {number} Checksum digit (0-9)
   */
  calculateModulo10(number) {
    const digits = number.split('').map(Number).reverse();
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      
      // Double every second digit (from the right, starting at index 0)
      if (i % 2 === 0) {
        digit *= 2;
        // If doubling results in two digits, add them together
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      
      sum += digit;
    }
    
    // Checksum is what we need to add to make sum divisible by 10
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Calculate invoice totals from line items
   * @param {Array} rows - Invoice line items
   * @param {number} taxRate - Tax rate percentage
   * @returns {Object} Calculated totals
   */
  calculateTotals(rows, taxRate = 25) {
    const subtotal = rows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity) * parseFloat(row.unit_price));
    }, 0);

    const taxAmount = (subtotal * parseFloat(taxRate)) / 100;
    const total = subtotal + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      tax_rate: parseFloat(taxRate),
      tax_amount: taxAmount.toFixed(2),
      total_amount: total.toFixed(2),
    };
  }
}

// Export singleton instance
export const Invoice = new InvoiceResource();
