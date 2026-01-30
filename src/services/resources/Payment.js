import { BaseResource } from './BaseResource';
import { InvoiceEvent } from './InvoiceEvent';
import { emailService } from '../emailService';

/**
 * Payment Resource
 * Handles payment records against invoices
 */
class PaymentResource extends BaseResource {
  constructor() {
    super('payments');
  }

  /**
   * Get all payments for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byInvoice(invoiceId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    return { data, error };
  }

  /**
   * Create a payment record
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.invoice_id - Invoice ID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.payment_date - Payment date (YYYY-MM-DD)
   * @param {string} paymentData.payment_method - Payment method
   * @param {string} paymentData.reference - Payment reference (optional)
   * @param {string} paymentData.notes - Payment notes (optional)
   * @returns {Promise<{data: Object|null, error: Error|null, emailSent: boolean}>}
   */
  async create(paymentData) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated'), emailSent: false };
    }

    // Get invoice to retrieve organization_id and invoice_number
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .select('organization_id, total_amount, invoice_number')
      .eq('id', paymentData.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return { data: null, error: invoiceError || new Error('Invoice not found'), emailSent: false };
    }

    // Validate payment amount doesn't exceed remaining balance
    const { totalPaid } = await this.getTotalPaid(paymentData.invoice_id);
    const remainingBalance = parseFloat(invoice.total_amount) - totalPaid;
    
    if (parseFloat(paymentData.amount) > remainingBalance) {
      return { 
        data: null, 
        error: new Error(`Payment amount exceeds remaining balance of ${remainingBalance.toFixed(2)}`),
        emailSent: false
      };
    }

    // Create payment record
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        ...paymentData,
        user_id: user.id,
        organization_id: invoice.organization_id,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error, emailSent: false };
    }

    // Log payment event for audit trail (US-022-E)
    if (data) {
      await InvoiceEvent.logPayment(paymentData.invoice_id, invoice.invoice_number, {
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
      });

      // Send payment confirmation email (US-028)
      const emailResult = await emailService.sendPaymentConfirmationEmail(data.id, paymentData.invoice_id);
      
      return { 
        data, 
        error: null, 
        emailSent: emailResult.success,
        emailError: emailResult.error 
      };
    }

    return { data, error: null, emailSent: false };
  }

  /**
   * Calculate total amount paid for an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{totalPaid: number, error: Error|null}>}
   */
  async getTotalPaid(invoiceId) {
    const { data, error } = await this.byInvoice(invoiceId);
    
    if (error) {
      return { totalPaid: 0, error };
    }

    const totalPaid = (data || []).reduce((sum, payment) => {
      return sum + parseFloat(payment.amount || 0);
    }, 0);

    return { totalPaid, error: null };
  }

  /**
   * Delete a payment record
   * @param {string} id - Payment ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return { data: { id }, error };
  }

  /**
   * Update a payment record
   * @param {string} id - Payment ID
   * @param {Object} updates - Payment updates
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    // If amount is being updated, validate against remaining balance
    if (updates.amount) {
      // Get the payment to find invoice_id
      const { data: payment, error: paymentError } = await this.supabase
        .from(this.tableName)
        .select('invoice_id, amount')
        .eq('id', id)
        .single();

      if (paymentError || !payment) {
        return { data: null, error: paymentError || new Error('Payment not found') };
      }

      // Get invoice total
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', payment.invoice_id)
        .single();

      if (invoiceError || !invoice) {
        return { data: null, error: invoiceError || new Error('Invoice not found') };
      }

      // Calculate remaining balance (excluding this payment)
      const { totalPaid } = await this.getTotalPaid(payment.invoice_id);
      const remainingBalance = parseFloat(invoice.total_amount) - (totalPaid - parseFloat(payment.amount));
      
      if (parseFloat(updates.amount) > remainingBalance) {
        return { 
          data: null, 
          error: new Error(`Payment amount exceeds remaining balance of ${remainingBalance.toFixed(2)}`) 
        };
      }
    }

    return super.update(id, updates);
  }
}

// Export singleton instance
export const Payment = new PaymentResource();
