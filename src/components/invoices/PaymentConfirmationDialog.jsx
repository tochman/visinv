import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * PaymentConfirmationDialog - Quick payment recording dialog for marking invoices as paid
 * Used in list views for fast payment recording with minimal fields
 * For full payment recording with partial payments, use PaymentModal
 */
export default function PaymentConfirmationDialog({ isOpen, onClose, invoice, onConfirm }) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bankgiro',
    reference: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onConfirm({
        amount: parseFloat(invoice.total_amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference: formData.reference || null,
        notes: null,
      });
      
      // Reset form
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bankgiro',
        reference: '',
      });
      
      onClose();
    } catch (error) {
      console.error('Payment confirmation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="payment-confirmation-dialog">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('payment.confirmDialog.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {invoice.invoice_number}
            </p>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-cy="close-payment-dialog"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Amount Display (read-only) */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{t('payment.amount')}:</span>{' '}
                <span className="font-bold">{parseFloat(invoice.total_amount).toFixed(2)} {invoice.currency || 'SEK'}</span>
              </p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.paymentDate')} *
              </label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                data-cy="payment-dialog-date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.paymentMethod')} *
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                required
                data-cy="payment-dialog-method"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bankgiro">{t('payment.paymentMethods.bankgiro')}</option>
                <option value="plusgiro">{t('payment.paymentMethods.plusgiro')}</option>
                <option value="bank_transfer">{t('payment.paymentMethods.bank_transfer')}</option>
                <option value="swish">{t('payment.paymentMethods.swish')}</option>
                <option value="cash">{t('payment.paymentMethods.cash')}</option>
                <option value="card">{t('payment.paymentMethods.card')}</option>
                <option value="autogiro">{t('payment.paymentMethods.autogiro')}</option>
                <option value="other">{t('payment.paymentMethods.other')}</option>
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.reference')}
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder={t('payment.reference')}
                data-cy="payment-dialog-reference"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                data-cy="cancel-payment-dialog"
              >
                {t('payment.confirmDialog.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50"
                data-cy="confirm-payment-dialog"
              >
                {loading ? t('common.saving') : t('payment.confirmDialog.confirm')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
