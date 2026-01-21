import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { createInvoice, updateInvoice } from '../../features/invoices/invoicesSlice';
import { fetchClients } from '../../features/clients/clientsSlice';
import { fetchProducts } from '../../features/products/productsSlice';

export default function InvoiceModal({ isOpen, onClose, invoice = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isEditing = !!invoice;
  
  const clients = useSelector(state => state.clients.items);
  const products = useSelector(state => state.products.items);
  const prevInvoiceIdRef = useRef();

  const [formData, setFormData] = useState({
    client_id: invoice?.client_id || '',
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: invoice?.tax_rate || 25,
    currency: invoice?.currency || 'SEK',
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
    reference: invoice?.reference || '',
  });

  const [rows, setRows] = useState(invoice?.invoice_rows || [
    { description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens or when switching between invoices
  useEffect(() => {
    const currentInvoiceId = invoice?.id;
    if (isOpen && prevInvoiceIdRef.current !== currentInvoiceId) {
      setFormData({
        client_id: invoice?.client_id || '',
        issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tax_rate: invoice?.tax_rate || 25,
        currency: invoice?.currency || 'SEK',
        notes: invoice?.notes || '',
        terms: invoice?.terms || '',
        reference: invoice?.reference || '',
      });
      
      setRows(invoice?.invoice_rows || [
        { description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }
      ]);
      
      setError(null);
      prevInvoiceIdRef.current = currentInvoiceId;
    }
  }, [isOpen, invoice]);

  useEffect(() => {
    if (isOpen && clients.length === 0) {
      dispatch(fetchClients());
    }
    if (isOpen && products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [isOpen, clients.length, products.length, dispatch]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleProductSelect = (index, productId) => {
    if (!productId) return;
    
    const product = products.find(p => p.id === productId);
    if (product) {
      const newRows = [...rows];
      newRows[index] = {
        ...newRows[index],
        product_id: product.id,
        description: product.description || product.name,
        unit_price: product.unit_price,
        unit: product.unit,
        tax_rate: product.tax_rate,
      };
      setRows(newRows);
    }
  };

  const addRow = () => {
    setRows([...rows, { description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: formData.tax_rate }]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = rows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity || 0) * parseFloat(row.unit_price || 0));
    }, 0);

    // Group by tax rate and calculate VAT per group
    const vatGroups = {};
    rows.forEach(row => {
      const rowTotal = parseFloat(row.quantity || 0) * parseFloat(row.unit_price || 0);
      const taxRate = parseFloat(row.tax_rate || formData.tax_rate || 0);
      
      if (!vatGroups[taxRate]) {
        vatGroups[taxRate] = { rate: taxRate, base: 0, vat: 0 };
      }
      
      vatGroups[taxRate].base += rowTotal;
      vatGroups[taxRate].vat += (rowTotal * taxRate) / 100;
    });

    const taxAmount = Object.values(vatGroups).reduce((sum, group) => sum + group.vat, 0);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total, vatGroups: Object.values(vatGroups).sort((a, b) => b.rate - a.rate) };
  };

  const { subtotal, taxAmount, total, vatGroups } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      setError(t('invoices.noClient'));
      return;
    }

    if (rows.length === 0 || !rows.some(r => r.description.trim())) {
      setError(t('invoices.atLeastOneItem'));
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const invoiceData = {
        ...formData,
        tax_rate: parseFloat(formData.tax_rate),
        rows: rows.filter(r => r.description.trim()).map(row => ({
          ...row,
          quantity: parseFloat(row.quantity),
          unit_price: parseFloat(row.unit_price),
          tax_rate: parseFloat(row.tax_rate || formData.tax_rate),
        })),
      };

      if (isEditing) {
        await dispatch(updateInvoice({ id: invoice.id, updates: invoiceData })).unwrap();
      } else {
        await dispatch(createInvoice(invoiceData)).unwrap();
      }
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="invoice-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
          data-cy="modal-backdrop"
        />

        {/* Modal */}
        <div data-cy="invoice-modal-content" className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <h2 data-cy="invoice-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('invoices.edit') : t('invoices.create')}
            </h2>
            <button
              onClick={onClose}
              data-cy="close-modal-button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} data-cy="invoice-form" className="p-6 space-y-6" noValidate>
            {error && (
              <div data-cy="invoice-form-error" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Invoice Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('invoices.invoiceDetails')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoices.selectClient')} *
                  </label>
                  <select
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleChange}
                    data-cy="client-select"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('invoices.selectClientPlaceholder')}</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoice.issueDate')} *
                  </label>
                  <input
                    type="date"
                    name="issue_date"
                    value={formData.issue_date}
                    onChange={handleChange}
                    data-cy="issue-date-input"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoice.dueDate')} *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    data-cy="due-date-input"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoice.taxRate')} (%)
                  </label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleChange}
                    data-cy="tax-rate-input"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoices.currency')}
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    data-cy="currency-select"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SEK">SEK</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                {/* Reference */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoices.reference')}
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    data-cy="reference-input"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('invoices.lineItems')}
                </h3>
                <button
                  type="button"
                  onClick={addRow}
                  data-cy="add-line-item-button"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
                >
                  + {t('invoices.addLineItem')}
                </button>
              </div>

              <div className="space-y-3" data-cy="line-items-container">
                {rows.map((row, index) => (
                  <div key={index} data-cy={`line-item-${index}`} className="space-y-2">
                    {/* Product Selector */}
                    {products.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          value={row.product_id || ''}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          data-cy={`product-select-${index}`}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Select product or enter manually --</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.unit_price} SEK/{product.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Line Item Fields */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-sm">
                    {/* Description */}
                    <div className="col-span-12 sm:col-span-4">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                        placeholder={t('invoices.description')}
                        data-cy={`description-input-${index}`}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                        placeholder={t('invoices.quantity')}
                        data-cy={`quantity-input-${index}`}
                        step="0.01"
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => handleRowChange(index, 'unit', e.target.value)}
                        placeholder={t('invoices.unit')}
                        data-cy={`unit-input-${index}`}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        value={row.unit_price}
                        onChange={(e) => handleRowChange(index, 'unit_price', e.target.value)}
                        placeholder={t('invoices.unitPrice')}
                        data-cy={`unit-price-input-${index}`}
                        step="0.01"
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-8 sm:col-span-1 flex items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-cy={`amount-${index}`}>
                        {(parseFloat(row.quantity || 0) * parseFloat(row.unit_price || 0)).toFixed(2)}
                      </span>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-4 sm:col-span-1 flex items-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        data-cy={`remove-line-item-${index}`}
                        disabled={rows.length === 1}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 rounded-sm p-4">
                <div className="space-y-2 max-w-xs ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('invoice.subtotal')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white" data-cy="subtotal-display">
                      {subtotal.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                  
                  {/* VAT Groups */}
                  {vatGroups.length > 0 && vatGroups.map((group) => (
                    <div key={group.rate} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('invoices.vat')} {group.rate}%:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white" data-cy={`vat-${group.rate}-display`}>
                        {group.vat.toFixed(2)} {formData.currency}
                      </span>
                    </div>
                  ))}
                  
                  <div className="flex justify-between text-base font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
                    <span className="text-gray-900 dark:text-white">{t('invoice.total')}:</span>
                    <span className="text-gray-900 dark:text-white" data-cy="total-display">
                      {total.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('invoices.notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  data-cy="notes-textarea"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('invoices.terms')}
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  data-cy="terms-textarea"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                data-cy="cancel-button"
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                data-cy="submit-button"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
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
