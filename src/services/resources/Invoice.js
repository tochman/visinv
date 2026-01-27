import { BaseResource } from './BaseResource';
import { Organization } from './Organization';
import { InvoiceEvent } from './InvoiceEvent';
import { getCurrency, getExchangeRate } from '../../config/currencies';

/**
 * Invoice Resource
 * Handles all invoice-related data operations
 */
class InvoiceResource extends BaseResource {
  constructor() {
    super('invoices');
  }

  /**
   * Check if an invoice number already exists in the organization
   * @param {string} invoiceNumber - The invoice number to check
   * @param {string} organizationId - The organization ID
   * @returns {Promise<{exists: boolean, error: Error|null}>}
   */
  async checkDuplicateNumber(invoiceNumber, organizationId) {
    if (!invoiceNumber || !organizationId) {
      return { exists: false, error: null };
    }

    const { data: existing, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('invoice_number', invoiceNumber)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      return { exists: false, error };
    }

    return { exists: !!existing, error: null };
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
        invoice_rows(*),
        invoice_template:invoice_templates(id, name, is_system)
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
        invoice_template:invoice_templates(*)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  /**
   * Create a new invoice with line items
   * @param {Object} invoiceData - Invoice data
   * @param {Object} invoiceData.organization - Organization data passed from Redux
   * @param {Array} invoiceData.rows - Invoice line items
   * @param {boolean} invoiceData.is_recurring - Whether to create a recurring schedule
   * @param {string} invoiceData.recurring_frequency - Frequency (weekly, biweekly, monthly, quarterly, yearly)
   * @param {string} invoiceData.recurring_end_date - Optional end date for recurrence
   * @param {number} invoiceData.recurring_max_invoices - Optional max number of invoices
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(invoiceData) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Use organization passed from Redux (via thunk) - following architecture pattern
    // This avoids Resources calling other Resources directly
    const { organization: currentOrg } = invoiceData;
    if (!currentOrg) {
      return { data: null, error: new Error('No organization found') };
    }

    const { 
      rows, 
      is_recurring, 
      recurring_frequency, 
      recurring_end_date, 
      recurring_max_invoices,
      recurring_max_count, // Extract to handle separately (form uses this name)
      organization, // Extract to not include in invoiceFields
      ...invoiceFields 
    } = invoiceData;

    // Use recurring_max_count from form or recurring_max_invoices (legacy support)
    const maxInvoices = recurring_max_count || recurring_max_invoices;

    // Handle invoice numbering based on organization settings
    const isManualMode = currentOrg.invoice_numbering_mode === 'manual';
    
    if (isManualMode) {
      // Manual mode: Validate that invoice_number is provided
      if (!invoiceFields.invoice_number || !invoiceFields.invoice_number.trim()) {
        return { 
          data: null, 
          error: new Error('Invoice number is required when manual numbering is enabled') 
        };
      }

      // Check for duplicate invoice numbers within the organization
      // Use maybeSingle() to return null without error when no match found
      const { data: existing } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('invoice_number', invoiceFields.invoice_number)
        .eq('organization_id', currentOrg.id)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: new Error('Invoice number already exists in this organization')
        };
      }
    } else {
      // Automatic mode: Generate invoice number
      if (!invoiceFields.invoice_number) {
        const number = await this.generateInvoiceNumber(currentOrg.id);
        invoiceFields.invoice_number = number;
      }
    }

    // Generate OCR payment reference if not provided
    if (!invoiceFields.payment_reference) {
      invoiceFields.payment_reference = this.generateOCR(invoiceFields.invoice_number);
    }

    // Set currency and exchange rate
    const currency = invoiceFields.currency || 'SEK';
    const exchangeRate = getExchangeRate(currency, 'SEK');
    invoiceFields.currency = currency;
    invoiceFields.exchange_rate = exchangeRate;

    // Calculate totals
    const calculatedFields = this.calculateTotals(rows || [], invoiceFields.tax_rate || 25);

    // Create recurring schedule if this is a recurring invoice
    if (is_recurring && recurring_frequency) {
      // Set recurring fields directly on the invoice
      invoiceFields.is_recurring = true;
      invoiceFields.recurring_frequency = recurring_frequency;
      invoiceFields.recurring_start_date = invoiceFields.issue_date || new Date().toISOString().split('T')[0];
      invoiceFields.recurring_end_date = recurring_end_date || null;
      invoiceFields.recurring_next_date = this.calculateNextRecurringDate(
        invoiceFields.recurring_start_date,
        recurring_frequency
      );
      invoiceFields.recurring_max_count = maxInvoices ? parseInt(maxInvoices, 10) : null;
      invoiceFields.recurring_current_count = 0;
      invoiceFields.recurring_status = 'active';
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .insert({
        ...invoiceFields,
        ...calculatedFields,
        user_id: user.id,
        organization_id: currentOrg.id,
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

    // Log creation event for audit trail (US-022-E)
    await InvoiceEvent.logCreated(invoice.id, invoice.invoice_number);

    // Fetch complete invoice with relations
    return this.show(invoice.id);
  }

  /**
   * Calculate next recurring date based on frequency
   */
  calculateNextRecurringDate(startDate, frequency) {
    const date = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Update an invoice and its line items
   * @param {string} id - Invoice ID
   * @param {Object} updates - Invoice updates
   * @param {Array} updates.rows - Invoice line items (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates, options = {}) {
    const { bypassDraftCheck = false } = options;

    // Check if invoice can be edited (only drafts can be edited)
    // Unless bypassDraftCheck is true (used for status transitions like markAsSent, markAsPaid)
    if (!bypassDraftCheck) {
      const { data: existingInvoice, error: fetchError } = await this.supabase
        .from(this.tableName)
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError) return { data: null, error: fetchError };

      if (existingInvoice.status !== 'draft') {
        return {
          data: null,
          error: new Error('Sent invoices cannot be edited. Create a credit invoice instead.')
        };
      }
    }

    const { rows, recurring_max_count, ...invoiceFields } = updates;

    // Convert empty recurring_max_count to null for INTEGER field
    if (recurring_max_count !== undefined) {
      invoiceFields.recurring_max_count = recurring_max_count ? parseInt(recurring_max_count, 10) : null;
    }

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
   * Delete an invoice (only drafts can be deleted)
   * @param {string} id - Invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async delete(id) {
    // Check if invoice can be deleted (only drafts can be deleted)
    const { data: existingInvoice, error: fetchError } = await this.supabase
      .from(this.tableName)
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    if (existingInvoice.status !== 'draft') {
      return {
        data: null,
        error: new Error('Sent invoices cannot be deleted. Create a credit invoice instead.')
      };
    }

    // Call parent delete method
    return super.delete(id);
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
   * Get overdue invoices grouped by age
   * @returns {Promise<{data: Object, error: Error|null}>}
   * Returns: { recent: [], moderate: [], old: [] }
   */
  async getOverdueByAge() {
    const { data: overdueInvoices, error } = await this.overdue();
    
    if (error) {
      return { data: { recent: [], moderate: [], old: [] }, error };
    }

    const today = new Date();
    const grouped = {
      recent: [],    // 1-7 days overdue
      moderate: [],  // 8-30 days overdue
      old: []        // 30+ days overdue
    };

    overdueInvoices.forEach(invoice => {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 7) {
        grouped.recent.push(invoice);
      } else if (daysOverdue <= 30) {
        grouped.moderate.push(invoice);
      } else {
        grouped.old.push(invoice);
      }
    });

    return { data: grouped, error: null };
  }

  /**
   * Mark invoice as sent
   * @param {string} id - Invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markAsSent(id) {
    const result = await this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    }, { bypassDraftCheck: true });

    // Log sent event for audit trail (US-022-E)
    if (result.data) {
      await InvoiceEvent.logSent(id, result.data.invoice_number);
    }

    return result;
  }

  /**
   * Mark reminder as sent for an invoice
   * @param {string} id - Invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markReminderSent(id) {
    // Get current reminder count and invoice number
    const { data: invoice, error: fetchError } = await this.supabase
      .from(this.tableName)
      .select('reminder_count, invoice_number')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return { data: null, error: fetchError || new Error('Invoice not found') };
    }

    const newReminderCount = (invoice.reminder_count || 0) + 1;

    const result = await this.update(id, {
      reminder_sent_at: new Date().toISOString(),
      reminder_count: newReminderCount,
    }, { bypassDraftCheck: true });

    // Log reminder event for audit trail (US-022-E)
    if (result.data) {
      await InvoiceEvent.logReminderSent(id, invoice.invoice_number, newReminderCount);
    }

    return result;
  }

  /**
   * Mark invoice as paid
   * @param {string} id - Invoice ID
   * @param {Date} paidAt - Payment date (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markAsPaid(id, paidAt = null) {
    const result = await this.update(id, {
      status: 'paid',
      paid_at: paidAt || new Date().toISOString(),
    }, { bypassDraftCheck: true });

    // Log status change event for audit trail (US-022-E)
    if (result.data) {
      await InvoiceEvent.logStatusChange(id, result.data.invoice_number, 'sent', 'paid');
    }

    return result;
  }

  /**
   * Create a credit invoice for an existing invoice
   * @param {string} originalInvoiceId - ID of the invoice to credit
   * @param {Object} creditData - Credit invoice data
   * @param {Array} creditData.rows - Line items to credit (if partial), or omit for full credit
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async createCredit(originalInvoiceId, creditData = {}) {
    // Fetch original invoice
    const { data: originalInvoice, error: fetchError } = await this.show(originalInvoiceId);
    if (fetchError || !originalInvoice) {
      return { data: null, error: fetchError || new Error('Original invoice not found') };
    }

    // Prepare credit invoice data
    const creditInvoiceData = {
      client_id: originalInvoice.client_id,
      invoice_template_id: originalInvoice.invoice_template_id,
      issue_date: creditData.issue_date || new Date().toISOString().split('T')[0],
      due_date: creditData.due_date || new Date().toISOString().split('T')[0],
      tax_rate: originalInvoice.tax_rate,
      status: creditData.status || 'draft',
      invoice_type: 'CREDIT',
      credited_invoice_id: originalInvoiceId,
      notes: creditData.notes || `Credit for invoice ${originalInvoice.invoice_number}`,
      ...creditData,
    };

    // If rows not provided, credit all items from original invoice
    if (!creditData.rows) {
      creditInvoiceData.rows = originalInvoice.invoice_rows.map(row => ({
        ...row,
        quantity: -Math.abs(parseFloat(row.quantity)), // Negative quantity for credit
        id: undefined,
        invoice_id: undefined,
        created_at: undefined,
        updated_at: undefined,
      }));
    } else {
      // Use provided rows (should have negative quantities)
      creditInvoiceData.rows = creditData.rows.map(row => ({
        ...row,
        quantity: -Math.abs(parseFloat(row.quantity)), // Ensure negative
      }));
    }

    // Create the credit invoice
    const result = await this.create(creditInvoiceData);

    // Log credit created event for audit trail (US-022-E)
    if (result.data) {
      await InvoiceEvent.logCreditCreated(
        originalInvoiceId,
        originalInvoice.invoice_number,
        result.data.id,
        result.data.invoice_number
      );
    }

    return result;
  }

  /**
   * Get all credit invoices for a given invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getCredits(invoiceId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        client:clients(id, name, email),
        invoice_rows(*)
      `)
      .eq('credited_invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Calculate total credited amount for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{amount: number, error: Error|null}>}
   */
  async getCreditedAmount(invoiceId) {
    const { data: credits, error } = await this.getCredits(invoiceId);
    if (error) return { amount: 0, error };

    const totalCredited = credits.reduce((sum, credit) => {
      return sum + Math.abs(parseFloat(credit.total_amount || 0));
    }, 0);

    return { amount: totalCredited, error: null };
  }

  /**
   * Get remaining balance for an invoice (total - payments)
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{balance: number, totalPaid: number, error: Error|null}>}
   */
  async getRemainingBalance(invoiceId) {
    // Get invoice total
    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .select('total_amount')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { balance: 0, totalPaid: 0, error: invoiceError || new Error('Invoice not found') };
    }

    // Get total payments
    const { data: payments, error: paymentsError } = await this.supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoiceId);

    if (paymentsError) {
      return { balance: 0, totalPaid: 0, error: paymentsError };
    }

    const totalPaid = (payments || []).reduce((sum, payment) => {
      return sum + parseFloat(payment.amount || 0);
    }, 0);

    const balance = parseFloat(invoice.total_amount) - totalPaid;

    return { balance, totalPaid, error: null };
  }

  /**
   * Update invoice status based on payment status
   * Automatically marks invoice as paid when fully paid
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateStatusBasedOnPayments(invoiceId) {
    const { balance, totalPaid, error } = await this.getRemainingBalance(invoiceId);
    
    if (error) {
      return { data: null, error };
    }

    // Get current invoice status
    const { data: invoice, error: invoiceError } = await this.supabase
      .from(this.tableName)
      .select('status, total_amount')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { data: null, error: invoiceError || new Error('Invoice not found') };
    }

    // Update status if fully paid
    if (balance <= 0.01 && invoice.status !== 'paid') {
      return this.markAsPaid(invoiceId);
    }

    // If partially paid but was marked as paid, revert to sent
    if (balance > 0.01 && invoice.status === 'paid') {
      return this.update(invoiceId, { status: 'sent', paid_at: null });
    }

    return { data: invoice, error: null };
  }

  /**
   * Generate next invoice number for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<string>}
   */
  async generateInvoiceNumber(organizationId) {
    if (!organizationId) return 'INV-0001';

    const { data } = await this.supabase
      .from(this.tableName)
      .select('invoice_number')
      .eq('organization_id', organizationId)
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
