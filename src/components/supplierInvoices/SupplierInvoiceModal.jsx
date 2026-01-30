import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  createSupplierInvoice,
  updateSupplierInvoice,
} from '../../features/supplierInvoices/supplierInvoicesSlice';
import { fetchSuppliers } from '../../features/suppliers/suppliersSlice';
import { fetchAccounts } from '../../features/accounts/accountsSlice';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useToast } from '../../context/ToastContext';

const getInitialFormData = (invoice, extractedData) => {
  // If we have extracted OCR data, use that
  if (extractedData) {
    return {
      supplier_id: extractedData.matchedSupplier?.id || '',
      invoice_number: extractedData.invoice?.invoice_number || '',
      invoice_date: extractedData.invoice?.invoice_date || new Date().toISOString().split('T')[0],
      due_date: extractedData.invoice?.due_date || '',
      description: extractedData.invoice?.description || '',
      currency: extractedData.invoice?.currency || 'SEK',
      payment_reference: extractedData.invoice?.payment_reference || '',
      lines: extractedData.line_items?.length > 0
        ? extractedData.line_items.map((item) => ({
            account_id: item.account_id || '',
            description: item.description || '',
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            amount: parseFloat(item.amount) || 0,
            vat_rate: parseFloat(item.vat_rate) || 25,
            vat_amount: parseFloat(item.vat_amount) || 0,
          }))
        : [{ account_id: '', description: '', quantity: 1, unit_price: 0, amount: 0, vat_rate: 25, vat_amount: 0 }],
      // Store extracted supplier info for potential new supplier creation
      _extractedSupplier: extractedData.supplier || null,
      _attachmentFile: extractedData.file || null,
      _attachmentPreview: extractedData.filePreview || null,
    };
  }

  // Otherwise, use existing invoice or defaults
  return {
    supplier_id: invoice?.supplier_id || '',
    invoice_number: invoice?.invoice_number || '',
    invoice_date: invoice?.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    description: invoice?.description || '',
    currency: invoice?.currency || 'SEK',
    payment_reference: invoice?.payment_reference || '',
    lines: invoice?.lines || [
      { account_id: '', description: '', quantity: 1, unit_price: 0, amount: 0, vat_rate: 25, vat_amount: 0 },
    ],
    _extractedSupplier: null,
    _attachmentFile: null,
    _attachmentPreview: null,
  };
};

export default function SupplierInvoiceModal({ isOpen, onClose, invoice = null, extractedData = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();
  const toast = useToast();
  const isEditing = !!invoice;

  const [formData, setFormData] = useState(getInitialFormData(invoice, extractedData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewSupplierInfo, setShowNewSupplierInfo] = useState(
    !!(extractedData && !extractedData.matchedSupplier?.id && extractedData.supplier)
  );

  const suppliers = useSelector((state) => state.suppliers?.suppliers || []);
  const accounts = useSelector((state) => state.accounts?.items || []);

  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      if (suppliers.length === 0) {
        dispatch(fetchSuppliers({ organizationId: currentOrganization.id }));
      }
      if (accounts.length === 0) {
        dispatch(fetchAccounts({ organizationId: currentOrganization.id }));
      }
    }
  }, [dispatch, isOpen, currentOrganization?.id, suppliers.length, accounts.length]);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(invoice, extractedData));
      setError(null);
      setShowNewSupplierInfo(
        !!(extractedData && !extractedData.matchedSupplier?.id && extractedData.supplier)
      );
    }
  }, [invoice, extractedData, isOpen]);

  // Auto-calculate due date based on supplier payment terms
  useEffect(() => {
    if (formData.supplier_id && formData.invoice_date && !invoice) {
      const supplier = suppliers.find((s) => s.id === formData.supplier_id);
      if (supplier?.default_payment_terms_days) {
        const invoiceDate = new Date(formData.invoice_date);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + supplier.default_payment_terms_days);
        setFormData((prev) => ({
          ...prev,
          due_date: dueDate.toISOString().split('T')[0],
        }));
      }
    }
  }, [formData.supplier_id, formData.invoice_date, suppliers, invoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;

    // Auto-calculate amount and VAT
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(newLines[index].quantity) || 0;
      const unitPrice = parseFloat(newLines[index].unit_price) || 0;
      newLines[index].amount = (quantity * unitPrice).toFixed(2);

      // Recalculate VAT
      const vatRate = parseFloat(newLines[index].vat_rate) || 0;
      newLines[index].vat_amount = ((quantity * unitPrice * vatRate) / 100).toFixed(2);
    }

    if (field === 'vat_rate') {
      const amount = parseFloat(newLines[index].amount) || 0;
      const vatRate = parseFloat(value) || 0;
      newLines[index].vat_amount = ((amount * vatRate) / 100).toFixed(2);
    }

    setFormData((prev) => ({ ...prev, lines: newLines }));
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { account_id: '', description: '', quantity: 1, unit_price: 0, amount: 0, vat_rate: 25, vat_amount: 0 },
      ],
    }));
  };

  const removeLine = (index) => {
    if (formData.lines.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
    const vat = formData.lines.reduce((sum, line) => sum + (parseFloat(line.vat_amount) || 0), 0);
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      const errorMessage = t('supplierInvoices.errors.supplierRequired');
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (!formData.invoice_number?.trim()) {
      const errorMessage = t('supplierInvoices.errors.invoiceNumberRequired');
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (formData.lines.length === 0 || !formData.lines.some((l) => l.account_id)) {
      const errorMessage = t('supplierInvoices.errors.linesRequired');
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (!currentOrganization?.id) {
      const errorMessage = t('supplierInvoices.errors.noOrganization');
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = {
        ...formData,
        organization_id: currentOrganization.id,
        invoice_number: formData.invoice_number.trim(),
        lines: formData.lines.filter((line) => line.account_id), // Only include lines with accounts
      };

      if (isEditing) {
        await dispatch(updateSupplierInvoice({ id: invoice.id, ...dataToSubmit })).unwrap();
        toast.success(t('supplierInvoices.updateSuccess'));
      } else {
        await dispatch(createSupplierInvoice(dataToSubmit)).unwrap();
        toast.success(t('supplierInvoices.createSuccess'));
      }
      onClose();
    } catch (err) {
      // Handle database constraint errors
      const errorMsg = typeof err === 'string' ? err : err?.message || 'An error occurred';
      let displayError;
      if (errorMsg.includes('unique_supplier_invoice_number')) {
        displayError = t('supplierInvoices.errors.duplicateInvoiceNumber');
      } else if (errorMsg.includes('default payable account')) {
        displayError = t('supplierInvoices.errors.supplierNeedsPayableAccount');
      } else {
        displayError = errorMsg;
      }
      setError(displayError);
      toast.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const { subtotal, vat, total } = calculateTotals();

  // Filter accounts - Expenses (4000-7999) for line items
  const expenseAccounts = Array.isArray(accounts)
    ? accounts.filter((a) => {
        const accNum = parseInt(a?.account_number, 10);
        return accNum >= 4000 && accNum < 8000;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="supplier-invoice-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('supplierInvoices.edit') : t('supplierInvoices.create')}
            </h2>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} data-cy="supplier-invoice-form" className="p-6 space-y-6">
            {error && (
              <div data-cy="supplier-invoice-form-error" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('supplierInvoices.supplier')} *
                </label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  data-cy="supplier-select"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">-- {t('common.select')} --</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('supplierInvoices.invoiceNumber')} *
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  data-cy="invoice-number-input"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('supplierInvoices.invoiceDate')} *
                </label>
                <input
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleChange}
                  data-cy="invoice-date-input"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('supplierInvoices.dueDate')} *
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  data-cy="due-date-input"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('supplierInvoices.description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  data-cy="description-input"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('supplierInvoices.lineItems')} *
                </h3>
                <button
                  type="button"
                  onClick={addLine}
                  data-cy="add-line-button"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  + {t('supplierInvoices.addLine')}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.account')} *
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.lineDescription')}
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.quantity')}
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.unitPrice')}
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.amount')}
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.vatRate')} %
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                        {t('supplierInvoices.vatAmount')}
                      </th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.lines.map((line, index) => (
                      <tr key={index} data-cy={`line-item-${index}`}>
                        <td className="px-2 py-2">
                          <select
                            value={line.account_id}
                            onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                            data-cy={`line-account-${index}`}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">--</option>
                            {expenseAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.account_number} - {account.account_name || account.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            data-cy={`line-description-${index}`}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                            data-cy={`line-quantity-${index}`}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)}
                            data-cy={`line-unit-price-${index}`}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.amount}
                            readOnly
                            data-cy={`line-amount-${index}`}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.vat_rate}
                            onChange={(e) => handleLineChange(index, 'vat_rate', e.target.value)}
                            data-cy={`line-vat-rate-${index}`}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.vat_amount}
                            readOnly
                            data-cy={`line-vat-amount-${index}`}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          {formData.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              data-cy={`remove-line-${index}`}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('supplierInvoices.subtotal')}:</span>
                  <span data-cy="subtotal-display" className="font-medium text-gray-900 dark:text-white">
                    {subtotal.toFixed(2)} {formData.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('supplierInvoices.vat')}:</span>
                  <span data-cy="vat-display" className="font-medium text-gray-900 dark:text-white">
                    {vat.toFixed(2)} {formData.currency}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-white">{t('supplierInvoices.total')}:</span>
                  <span data-cy="total-display" className="text-gray-900 dark:text-white">
                    {total.toFixed(2)} {formData.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                data-cy="cancel-button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                data-cy="submit-button"
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('common.saving') : isEditing ? t('common.update') : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
