/**
 * Email Service
 * Handles sending emails via Supabase Edge Functions
 * US-008: Invoice Email Delivery
 * US-028: Payment Confirmation Emails
 */

import { supabase } from './supabase';

class EmailService {
  /**
   * Send invoice email to client
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async sendInvoiceEmail(invoiceId) {
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId }
      });

      if (error) {
        console.error('Email service error:', error);
        return { success: false, error: error.message || 'Failed to send email' };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to send email' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Email service exception:', err);
      return { success: false, error: err.message || 'Failed to send email' };
    }
  }

  /**
   * Send payment confirmation email to client
   * @param {string} paymentId - Payment ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async sendPaymentConfirmationEmail(paymentId, invoiceId) {
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { 
          invoiceId, 
          paymentId,
          emailType: 'payment'
        }
      });

      if (error) {
        console.error('Payment email service error:', error);
        return { success: false, error: error.message || 'Failed to send payment confirmation' };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to send payment confirmation' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Payment email service exception:', err);
      return { success: false, error: err.message || 'Failed to send payment confirmation' };
    }
  }
}

export const emailService = new EmailService();
