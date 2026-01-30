/**
 * Email Service
 * Handles sending emails via Supabase Edge Functions
 * US-008: Invoice Email Delivery
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
}

export const emailService = new EmailService();
