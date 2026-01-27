import { BaseResource } from './BaseResource';

/**
 * InvoiceEvent Resource
 * Handles audit trail for invoice lifecycle events
 * US-022-E: Audit Trail for Invoice Lifecycle
 */
class InvoiceEventResource extends BaseResource {
  constructor() {
    super('invoice_events');
  }

  /**
   * Get all events for a specific invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byInvoice(invoiceId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Create an event for an invoice
   * @param {Object} eventData - Event data
   * @param {string} eventData.invoice_id - Invoice ID
   * @param {string} eventData.event_type - Event type (created, sent, viewed, etc.)
   * @param {Object} eventData.event_data - Event-specific data (optional)
   * @param {string} eventData.description - Human-readable description (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async createEvent(eventData) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        ...eventData,
        user_id: user.id,
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Helper: Create "created" event
   */
  async logCreated(invoiceId, invoiceNumber) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'created',
      description: `Invoice ${invoiceNumber} created`,
      event_data: { invoice_number: invoiceNumber },
    });
  }

  /**
   * Helper: Create "sent" event
   */
  async logSent(invoiceId, invoiceNumber) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'sent',
      description: `Invoice ${invoiceNumber} sent to client`,
      event_data: { invoice_number: invoiceNumber },
    });
  }

  /**
   * Helper: Create "payment_recorded" event
   */
  async logPayment(invoiceId, invoiceNumber, paymentData) {
    const { amount, payment_method, payment_date } = paymentData;
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'payment_recorded',
      description: `Payment of ${amount} recorded`,
      event_data: {
        invoice_number: invoiceNumber,
        amount,
        payment_method,
        payment_date,
      },
    });
  }

  /**
   * Helper: Create "status_changed" event
   */
  async logStatusChange(invoiceId, invoiceNumber, oldStatus, newStatus) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'status_changed',
      description: `Status changed from ${oldStatus} to ${newStatus}`,
      event_data: {
        invoice_number: invoiceNumber,
        old_status: oldStatus,
        new_status: newStatus,
      },
    });
  }

  /**
   * Helper: Create "reminder_sent" event
   */
  async logReminderSent(invoiceId, invoiceNumber, reminderCount) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'reminder_sent',
      description: `Reminder #${reminderCount} sent`,
      event_data: {
        invoice_number: invoiceNumber,
        reminder_count: reminderCount,
      },
    });
  }

  /**
   * Helper: Create "credit_created" event
   */
  async logCreditCreated(invoiceId, invoiceNumber, creditInvoiceId, creditInvoiceNumber) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'credit_created',
      description: `Credit invoice ${creditInvoiceNumber} created`,
      event_data: {
        invoice_number: invoiceNumber,
        credit_invoice_id: creditInvoiceId,
        credit_invoice_number: creditInvoiceNumber,
      },
    });
  }

  /**
   * Helper: Create "copied" event
   */
  async logCopied(invoiceId, invoiceNumber, newInvoiceId, newInvoiceNumber) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'copied',
      description: `Invoice copied to ${newInvoiceNumber}`,
      event_data: {
        invoice_number: invoiceNumber,
        new_invoice_id: newInvoiceId,
        new_invoice_number: newInvoiceNumber,
      },
    });
  }

  /**
   * Helper: Create "viewed" event
   */
  async logViewed(invoiceId, invoiceNumber) {
    return this.createEvent({
      invoice_id: invoiceId,
      event_type: 'viewed',
      description: `Invoice ${invoiceNumber} viewed by client`,
      event_data: { invoice_number: invoiceNumber },
    });
  }
}

// Export singleton instance
export const InvoiceEvent = new InvoiceEventResource();
