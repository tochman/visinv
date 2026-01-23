import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Invoice, Payment } from '../services/resources';
import PaymentModal from '../components/invoices/PaymentModal';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState(0);

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const loadInvoiceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load invoice
      const { data: invoiceData, error: invoiceError } = await Invoice.findById(id);
      if (invoiceError) throw new Error(invoiceError.message);
      
      if (!invoiceData) {
        setError('Invoice not found');
        setLoading(false);
        return;
      }
      
      setInvoice(invoiceData);
      
      // Load payments
      const { data: paymentsData, error: paymentsError } = await Payment.byInvoice(id);
      if (paymentsError) throw new Error(paymentsError.message);
      
      setPayments(paymentsData || []);
      
      // Calculate remaining balance
      const balance = await Invoice.getRemainingBalance(id);
      setRemainingBalance(balance);
      
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRecorded = async (payment) => {
    // Reload invoice and payments
    await loadInvoiceData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-sm">
        <p className="text-yellow-600 dark:text-yellow-400">{t('invoices.notFound')}</p>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const isPartiallyPaid = payments.length > 0 && remainingBalance > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('invoices.invoice')} #{invoice.invoice_number}
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.back')}
          </button>
          {!isPaid && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700"
              data-cy="record-payment-btn"
            >
              {t('payment.recordPayment')}
            </button>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('invoices.invoiceDetails')}
            </h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{t('invoices.status')}</dt>
                <dd className="text-sm font-medium">
                  <span className={`px-2 py-1 rounded-sm ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {t(`invoices.status_${invoice.status}`)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{t('invoices.issueDate')}</dt>
                <dd className="text-sm text-gray-900 dark:text-white">{invoice.issue_date}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{t('invoices.dueDate')}</dt>
                <dd className="text-sm text-gray-900 dark:text-white">{invoice.due_date}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{t('invoices.totalAmount')}</dt>
                <dd className="text-lg font-bold text-gray-900 dark:text-white">
                  {parseFloat(invoice.total_amount).toFixed(2)} {invoice.currency}
                </dd>
              </div>
            </dl>
          </div>

          {/* Payment Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('payment.paymentSummary')}
            </h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{t('payment.totalPaid')}</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {(parseFloat(invoice.total_amount) - remainingBalance).toFixed(2)} {invoice.currency}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">{t('payment.remainingBalance')}</dt>
                <dd className={`text-lg font-bold ${remainingBalance === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                  {remainingBalance.toFixed(2)} {invoice.currency}
                </dd>
              </div>
              {isPartiallyPaid && (
                <div className="pt-2">
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-sm">
                    {t('payment.partiallyPaid')}
                  </span>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('payment.paymentHistory')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full" data-cy="payment-history-table">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('payment.paymentDate')}
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('payment.amount')}
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('payment.paymentMethod')}
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('payment.reference')}
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('payment.notes')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="border-b border-gray-200 dark:border-gray-700 last:border-0"
                    data-cy="payment-row"
                  >
                    <td className="py-3 px-3 text-sm text-gray-900 dark:text-white">
                      {payment.payment_date}
                    </td>
                    <td className="py-3 px-3 text-sm font-medium text-gray-900 dark:text-white">
                      {parseFloat(payment.amount).toFixed(2)} {invoice.currency}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {t(`payment.paymentMethods.${payment.payment_method}`)}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {payment.reference || '-'}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {payment.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  );
}
