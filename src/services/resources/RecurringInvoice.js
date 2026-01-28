import { BaseResource } from './BaseResource';
import { Invoice } from './Invoice';

/**
 * Recurring Invoice Resource
 * Handles recurring invoice schedule operations (US-025)
 */
class RecurringInvoiceResource extends BaseResource {
  constructor() {
    super('recurring_invoices');
  }

  /**
   * Frequency options with their display keys and calculation
   */
  static FREQUENCIES = {
    weekly: { days: 7, i18nKey: 'recurringInvoices.frequencies.weekly' },
    biweekly: { days: 14, i18nKey: 'recurringInvoices.frequencies.biweekly' },
    monthly: { months: 1, i18nKey: 'recurringInvoices.frequencies.monthly' },
    quarterly: { months: 3, i18nKey: 'recurringInvoices.frequencies.quarterly' },
    yearly: { months: 12, i18nKey: 'recurringInvoices.frequencies.yearly' },
  };

  /**
   * Status options
   */
  static STATUSES = {
    active: 'recurringInvoices.statuses.active',
    paused: 'recurringInvoices.statuses.paused',
    completed: 'recurringInvoices.statuses.completed',
    cancelled: 'recurringInvoices.statuses.cancelled',
  };

  /**
   * Get all recurring invoices for the current organization
   * @param {Object} options - Query options (must include organizationId)
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    const { organizationId, ...restOptions } = options;
    
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    return super.index({
      select: `
        *,
        client:clients(id, name, email),
        invoice_template:invoice_templates(id, name)
      `,
      filters: [{ column: 'organization_id', value: organizationId }],
      order: 'created_at',
      ascending: false,
      ...restOptions,
    });
  }

  /**
   * Get a single recurring invoice with related data
   * @param {string} id - Recurring invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        client:clients(*),
        invoice_template:invoice_templates(*)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  /**
   * Create a new recurring invoice schedule
   * @param {Object} data - Recurring invoice data (must include organizationId)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(data) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { organizationId, ...restData } = data;
    
    if (!organizationId) {
      return { data: null, error: new Error('Organization ID is required') };
    }

    // Calculate initial next_invoice_date from start_date
    const startDate = new Date(restData.start_date);
    const nextInvoiceDate = restData.next_invoice_date || restData.start_date;

    const recurringData = {
      ...restData,
      user_id: user.id,
      organization_id: organizationId,
      next_invoice_date: nextInvoiceDate,
      invoice_count: 0,
      status: restData.status || 'active',
      rows_template: JSON.stringify(restData.rows_template || []),
    };

    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(recurringData)
      .select(`
        *,
        client:clients(id, name, email),
        invoice_template:invoice_templates(id, name)
      `)
      .single();

    return { data: created, error };
  }

  /**
   * Update a recurring invoice schedule
   * @param {string} id - Recurring invoice ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    const updateData = { ...updates };
    
    // Stringify rows_template if provided
    if (updates.rows_template) {
      updateData.rows_template = JSON.stringify(updates.rows_template);
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        client:clients(id, name, email),
        invoice_template:invoice_templates(id, name)
      `)
      .single();

    return { data, error };
  }

  /**
   * Pause a recurring invoice schedule
   * @param {string} id - Recurring invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async pause(id) {
    return this.update(id, { status: 'paused' });
  }

  /**
   * Resume a paused recurring invoice schedule
   * @param {string} id - Recurring invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async resume(id) {
    // Recalculate next_invoice_date when resuming
    const { data: schedule, error: fetchError } = await this.show(id);
    if (fetchError) return { data: null, error: fetchError };

    const today = new Date();
    let nextDate = new Date(schedule.next_invoice_date);

    // If next_invoice_date is in the past, calculate a new one from today
    if (nextDate < today) {
      nextDate = this.calculateNextDate(schedule.frequency, today);
    }

    return this.update(id, { 
      status: 'active',
      next_invoice_date: nextDate.toISOString().split('T')[0]
    });
  }

  /**
   * Cancel a recurring invoice schedule
   * @param {string} id - Recurring invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async cancel(id) {
    return this.update(id, { status: 'cancelled' });
  }

  /**
   * Generate an invoice from a recurring schedule
   * @param {string} id - Recurring invoice ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async generateInvoice(id) {
    // Fetch the recurring schedule
    const { data: schedule, error: fetchError } = await this.show(id);
    if (fetchError) return { data: null, error: fetchError };

    // Check if schedule is active
    if (schedule.status !== 'active') {
      return { data: null, error: new Error('Recurring schedule is not active') };
    }

    // Check if max invoices reached
    if (schedule.max_invoices && schedule.invoice_count >= schedule.max_invoices) {
      // Mark as completed
      await this.update(id, { status: 'completed' });
      return { data: null, error: new Error('Maximum invoice limit reached') };
    }

    // Check if end_date passed
    if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
      await this.update(id, { status: 'completed' });
      return { data: null, error: new Error('Recurring schedule has ended') };
    }

    // Parse rows_template
    let rows = [];
    try {
      rows = typeof schedule.rows_template === 'string' 
        ? JSON.parse(schedule.rows_template) 
        : schedule.rows_template;
    } catch (e) {
      rows = [];
    }

    // Create the invoice
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30); // Default 30-day terms

    const invoiceData = {
      client_id: schedule.client_id,
      invoice_template_id: schedule.invoice_template_id,
      issue_date: today.toISOString().split('T')[0],
      delivery_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: schedule.currency,
      tax_rate: schedule.tax_rate,
      notes: schedule.notes,
      terms: schedule.terms,
      reference: schedule.reference,
      recurring_invoice_id: schedule.id,
      rows: rows,
    };

    const { data: invoice, error: invoiceError } = await Invoice.create(invoiceData);
    if (invoiceError) return { data: null, error: invoiceError };

    // Update the recurring schedule
    const nextDate = this.calculateNextDate(schedule.frequency, new Date(schedule.next_invoice_date));
    const newCount = schedule.invoice_count + 1;

    // Check if this was the last invoice
    let newStatus = schedule.status;
    if (schedule.max_invoices && newCount >= schedule.max_invoices) {
      newStatus = 'completed';
    } else if (schedule.end_date && nextDate > new Date(schedule.end_date)) {
      newStatus = 'completed';
    }

    await this.update(id, {
      last_invoice_date: today.toISOString().split('T')[0],
      next_invoice_date: nextDate.toISOString().split('T')[0],
      invoice_count: newCount,
      status: newStatus,
    });

    return { data: invoice, error: null };
  }

  /**
   * Get all invoices generated from a recurring schedule
   * @param {string} recurringInvoiceId - Recurring invoice ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getGeneratedInvoices(recurringInvoiceId) {
    const { data, error } = await this.supabase
      .from('invoices')
      .select(`
        *,
        client:clients(id, name, email)
      `)
      .eq('recurring_invoice_id', recurringInvoiceId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Calculate the next invoice date based on frequency
   * @param {string} frequency - Frequency type (weekly, biweekly, monthly, quarterly, yearly)
   * @param {Date} fromDate - Date to calculate from
   * @returns {Date} - Next invoice date
   */
  calculateNextDate(frequency, fromDate) {
    const date = new Date(fromDate);
    const freq = RecurringInvoiceResource.FREQUENCIES[frequency];

    if (freq.days) {
      date.setDate(date.getDate() + freq.days);
    } else if (freq.months) {
      date.setMonth(date.getMonth() + freq.months);
    }

    return date;
  }

  /**
   * Get frequency options for dropdowns
   * @returns {Array} - Array of frequency options
   */
  static getFrequencyOptions() {
    return Object.keys(RecurringInvoiceResource.FREQUENCIES);
  }

  /**
   * Get status options for filters
   * @returns {Array} - Array of status options
   */
  static getStatusOptions() {
    return Object.keys(RecurringInvoiceResource.STATUSES);
  }
}

export const RecurringInvoice = new RecurringInvoiceResource();
