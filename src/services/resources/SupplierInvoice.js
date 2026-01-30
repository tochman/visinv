import { BaseResource } from './BaseResource';
import { JournalEntry } from './JournalEntry';

/**
 * SupplierInvoice Resource
 * Handles supplier invoices (incoming bills) with line items and journal entry creation
 * US-260: Supplier Invoice Registration
 */
class SupplierInvoiceResource extends BaseResource {
  constructor() {
    super('supplier_invoices');
  }

  /**
   * Get supplier invoices with related data (supplier, lines)
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        supplier:suppliers(id, name, organization_number),
        lines:supplier_invoice_lines(
          id,
          account_id,
          description,
          quantity,
          unit_price,
          amount,
          vat_rate,
          vat_amount,
          cost_center,
          project_code,
          line_order,
          account:accounts(id, account_number, name)
        ),
        journal_entry:journal_entries(id, verification_number, status)
      `)
      .order('invoice_date', { ascending: false });

    // Filter by organization
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter by status
    if (options.status) {
      query = query.eq('status', options.status);
    }

    // Filter by supplier
    if (options.supplierId) {
      query = query.eq('supplier_id', options.supplierId);
    }

    // Date range filters
    if (options.startDate) {
      query = query.gte('invoice_date', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('invoice_date', options.endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Sort lines by line_order
    const invoicesWithSortedLines = data.map(invoice => ({
      ...invoice,
      lines: invoice.lines?.sort((a, b) => a.line_order - b.line_order) || [],
    }));

    return { data: invoicesWithSortedLines, error: null };
  }

  /**
   * Get a single supplier invoice with all related data
   * @param {string} id - Supplier invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        supplier:suppliers(*),
        lines:supplier_invoice_lines(
          *,
          account:accounts(id, account_number, name)
        ),
        journal_entry:journal_entries(
          id,
          verification_number,
          status,
          entry_date,
          description,
          lines:journal_entry_lines(
            *,
            account:accounts(id, account_number, name)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Sort lines by line_order
    if (data.lines) {
      data.lines.sort((a, b) => a.line_order - b.line_order);
    }

    return { data, error: null };
  }

  /**
   * Create a new supplier invoice with lines
   * @param {Object} invoice - Supplier invoice data
   * @param {Array} invoice.lines - Line items
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(invoice) {
    const { lines, ...invoiceData } = invoice;

    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Validate required fields
    if (!invoiceData.supplier_id) {
      return { data: null, error: new Error('Supplier is required') };
    }
    if (!invoiceData.invoice_number) {
      return { data: null, error: new Error('Invoice number is required') };
    }
    if (!lines || lines.length === 0) {
      return { data: null, error: new Error('At least one line item is required') };
    }

    // Calculate totals
    const subtotal = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
    const vat = lines.reduce((sum, line) => sum + (parseFloat(line.vat_amount) || 0), 0);
    const total = subtotal + vat;

    // Create the supplier invoice
    const { data: createdInvoice, error: createError } = await this.supabase
      .from(this.tableName)
      .insert({
        ...invoiceData,
        subtotal_amount: subtotal,
        vat_amount: vat,
        total_amount: total,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      return { data: null, error: createError };
    }

    // Create the lines
    if (lines && lines.length > 0) {
      const linesWithInvoiceId = lines.map((line, index) => ({
        supplier_invoice_id: createdInvoice.id,
        account_id: line.account_id,
        description: line.description || null,
        quantity: parseFloat(line.quantity) || 1,
        unit_price: parseFloat(line.unit_price) || 0,
        amount: parseFloat(line.amount) || 0,
        vat_rate: parseFloat(line.vat_rate) || 0,
        vat_amount: parseFloat(line.vat_amount) || 0,
        cost_center: line.cost_center || null,
        project_code: line.project_code || null,
        line_order: line.line_order ?? index,
      }));

      const { error: linesError } = await this.supabase
        .from('supplier_invoice_lines')
        .insert(linesWithInvoiceId);

      if (linesError) {
        // Rollback: delete the created invoice
        await this.delete(createdInvoice.id);
        return { data: null, error: linesError };
      }
    }

    // Return the full invoice with lines
    return this.show(createdInvoice.id);
  }

  /**
   * Update a supplier invoice and its lines
   * Only draft invoices can be updated
   * @param {string} id - Supplier invoice ID
   * @param {Object} invoice - Updated invoice data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, invoice) {
    const { lines, ...invoiceData } = invoice;

    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get current invoice to check status
    const { data: currentInvoice, error: fetchError } = await this.show(id);
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (currentInvoice.status !== 'draft') {
      return { data: null, error: new Error('Only draft invoices can be updated') };
    }

    // Calculate totals if lines are provided
    let updateData = { ...invoiceData, updated_at: new Date().toISOString() };
    if (lines) {
      const subtotal = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
      const vat = lines.reduce((sum, line) => sum + (parseFloat(line.vat_amount) || 0), 0);
      updateData.subtotal_amount = subtotal;
      updateData.vat_amount = vat;
      updateData.total_amount = subtotal + vat;
    }

    // Update the invoice
    const { data: updatedInvoice, error: updateError } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Update lines if provided
    if (lines) {
      // Delete existing lines
      const { error: deleteError } = await this.supabase
        .from('supplier_invoice_lines')
        .delete()
        .eq('supplier_invoice_id', id);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      // Insert new lines
      const linesWithInvoiceId = lines.map((line, index) => ({
        supplier_invoice_id: id,
        account_id: line.account_id,
        description: line.description || null,
        quantity: parseFloat(line.quantity) || 1,
        unit_price: parseFloat(line.unit_price) || 0,
        amount: parseFloat(line.amount) || 0,
        vat_rate: parseFloat(line.vat_rate) || 0,
        vat_amount: parseFloat(line.vat_amount) || 0,
        cost_center: line.cost_center || null,
        project_code: line.project_code || null,
        line_order: line.line_order ?? index,
      }));

      const { error: linesError } = await this.supabase
        .from('supplier_invoice_lines')
        .insert(linesWithInvoiceId);

      if (linesError) {
        return { data: null, error: linesError };
      }
    }

    return this.show(id);
  }

  /**
   * Approve a supplier invoice and create journal entry
   * @param {string} id - Supplier invoice ID
   * @param {string} fiscalYearId - Fiscal year ID for the journal entry
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async approve(id, fiscalYearId) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get the supplier invoice with all details
    const { data: invoice, error: fetchError } = await this.show(id);
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (invoice.status !== 'draft') {
      return { data: null, error: new Error('Only draft invoices can be approved') };
    }

    if (!fiscalYearId) {
      return { data: null, error: new Error('Fiscal year is required for journal entry') };
    }

    // Create journal entry for the approved invoice
    // Debit: Expense accounts (from invoice lines)
    // Credit: Accounts Payable (supplier's default payable account)
    
    const journalLines = [];

    // Add debit lines for each invoice line (expenses)
    invoice.lines.forEach(line => {
      journalLines.push({
        account_id: line.account_id,
        debit_amount: parseFloat(line.amount) + parseFloat(line.vat_amount),
        credit_amount: 0,
        description: line.description || `${invoice.supplier.name} - ${invoice.invoice_number}`,
      });
    });

    // Add credit line for accounts payable
    // Use supplier's default payable account or fallback to 2440
    let payableAccountId = invoice.supplier.default_payable_account_id;
    
    // If supplier doesn't have a default payable account, try to find account 2440
    if (!payableAccountId) {
      const { data: defaultAccount } = await this.supabase
        .from('accounts')
        .select('id')
        .eq('organization_id', invoice.organization_id)
        .eq('account_number', '2440')
        .single();
      
      if (defaultAccount) {
        payableAccountId = defaultAccount.id;
      } else {
        return { data: null, error: new Error('No payable account found. Please set up account 2440 (Leverantörsskulder) or assign a default payable account to the supplier.') };
      }
    }

    journalLines.push({
      account_id: payableAccountId,
      debit_amount: 0,
      credit_amount: parseFloat(invoice.total_amount),
      description: `${invoice.supplier.name} - ${invoice.invoice_number}`,
    });

    // Create the journal entry
    const journalEntryData = {
      organization_id: invoice.organization_id,
      fiscal_year_id: fiscalYearId,
      entry_date: invoice.invoice_date,
      description: `Supplier Invoice: ${invoice.supplier.name} - ${invoice.invoice_number}`,
      status: 'posted', // Auto-post supplier invoice entries
      source_type: 'invoice',
      source_id: invoice.id,
      lines: journalLines,
    };

    const { data: journalEntry, error: journalError } = await JournalEntry.create(journalEntryData);
    if (journalError) {
      return { data: null, error: journalError };
    }

    // Update invoice status to approved
    const { data: approvedInvoice, error: approveError } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        journal_entry_id: journalEntry.id,
        fiscal_year_id: fiscalYearId,
      })
      .eq('id', id)
      .select()
      .single();

    if (approveError) {
      return { data: null, error: approveError };
    }

    return this.show(id);
  }

  /**
   * Mark a supplier invoice as paid
   * @param {string} id - Supplier invoice ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async markPaid(id, paymentData = {}) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data: invoice, error: fetchError } = await this.show(id);
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (invoice.status !== 'approved') {
      return { data: null, error: new Error('Only approved invoices can be marked as paid') };
    }

    const { data: updatedInvoice, error: updateError } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: user.id,
        payment_reference: paymentData.payment_reference || null,
        payment_method: paymentData.payment_method || invoice.payment_method,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    return this.show(id);
  }

  /**
   * Cancel a supplier invoice
   * @param {string} id - Supplier invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async cancel(id) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data: invoice, error: fetchError } = await this.show(id);
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (invoice.status === 'paid') {
      return { data: null, error: new Error('Paid invoices cannot be cancelled') };
    }

    const { data: cancelledInvoice, error: cancelError } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (cancelError) {
      return { data: null, error: cancelError };
    }

    return this.show(id);
  }
}

export const SupplierInvoice = new SupplierInvoiceResource();
