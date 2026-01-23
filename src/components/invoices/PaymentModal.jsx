import { useState, useEffect } from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Payment } from '../../services/resources';

export default function PaymentModal({ isOpen, onClose, invoice, onPaymentRecorded }) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remainingBalance, setRemainingBalance] = useState(0);

  // Calculate remaining balance when modal opens
  useEffect(() => {
    if (isOpen && invoice) {
      const calculateBalance = async () => {
        const { totalPaid } = await Payment.getTotalPaid(invoice.id);
        const balance = parseFloat(invoice.total_amount) - totalPaid;
        setRemainingBalance(balance);
        
        // Pre-fill amount with remaining balance
        setFormData(prev => ({
          ...prev,
          amount: balance.toFixed(2),
        }));
      };
      calculateBalance();
    }
  }, [isOpen, invoice]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference: '',
        notes: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate amount
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError(t('payment.errors.invalidAmount'));
        setLoading(false);
        return;
      }

      if (amount > remainingBalance) {
        setError(t('payment.errors.exceedsBalance'));
        setLoading(false);
        return;
      }

      // Create payment
      const { data, error: paymentError } = await Payment.create({
        invoice_id: invoice.id,
        amount: amount,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference: formData.reference || null,
        notes: formData.notes || null,
      });

      if (paymentError) {
        setError(paymentError.message);
        setLoading(false);
        return;
      }

      // Success - call callback and close
      if (onPaymentRecorded) {
        onPaymentRecorded(data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="payment-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('payment.recordPayment')}
            </h2>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-cy="close-payment-modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm" data-cy="payment-error">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Remaining Balance Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{t('payment.remainingBalance')}:</span>{' '}
                <span className="font-bold">{remainingBalance.toFixed(2)} {invoice?.currency || 'SEK'}</span>
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.amount')} *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                max={remainingBalance}
                required
                data-cy="payment-amount"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                data-cy="payment-date"
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
                data-cy="payment-method"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank_transfer">{t('payment.paymentMethods.bank_transfer')}</option>
                <option value="swish">{t('payment.paymentMethods.swish')}</option>
                <option value="card">{t('payment.paymentMethods.card')}</option>
                <option value="cash">{t('payment.paymentMethods.cash')}</option>
                <option value="check">{t('payment.paymentMethods.check')}</option>
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
                data-cy="payment-reference"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                data-cy="payment-notes"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                data-cy="cancel-payment"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50"
                data-cy="save-payment"
              >
                {loading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
