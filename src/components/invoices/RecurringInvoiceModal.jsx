import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchClients } from '../../features/clients/clientsSlice';
import { fetchProducts } from '../../features/products/productsSlice';
import { fetchTemplates } from '../../features/invoiceTemplates/invoiceTemplatesSlice';
import { 
  createRecurringInvoice, 
  updateRecurringInvoice 
} from '../../features/recurringInvoices/recurringInvoicesSlice';
import { getCurrencyCodes, getCurrency } from '../../config/currencies';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

export default function RecurringInvoiceModal({ isOpen, onClose, recurringInvoice = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isEditing = !!recurringInvoice;
  
  const clients = useSelector(state => state.clients.items);
  const products = useSelector(state => state.products.items);
  const templates = useSelector(state => state.invoiceTemplates.items);

  // Parse rows_template from JSON string if needed
  const parseRowsTemplate = (template) => {
    if (!template) return [{ description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }];
    if (typeof template === 'string') {
      try {
        const parsed = JSON.parse(template);
        return parsed.length > 0 ? parsed : [{ description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }];
      } catch {
        return [{ description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }];
      }
    }
    return template.length > 0 ? template : [{ description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }];
  };

  const [formData, setFormData] = useState({
    name: recurringInvoice?.name || '',
    client_id: recurringInvoice?.client_id || '',
    invoice_template_id: recurringInvoice?.invoice_template_id || '',
    frequency: recurringInvoice?.frequency || 'monthly',
    start_date: recurringInvoice?.start_date || new Date().toISOString().split('T')[0],
    end_date: recurringInvoice?.end_date || '',
    max_invoices: recurringInvoice?.max_invoices || '',
    tax_rate: recurringInvoice?.tax_rate || 25,
    currency: recurringInvoice?.currency || 'SEK',
    notes: recurringInvoice?.notes || '',
    terms: recurringInvoice?.terms || '',
    reference: recurringInvoice?.reference || '',
  });

  const [rows, setRows] = useState(parseRowsTemplate(recurringInvoice?.rows_template));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens or when switching items
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: recurringInvoice?.name || '',
        client_id: recurringInvoice?.client_id || '',
        invoice_template_id: recurringInvoice?.invoice_template_id || '',
        frequency: recurringInvoice?.frequency || 'monthly',
        start_date: recurringInvoice?.start_date || new Date().toISOString().split('T')[0],
        end_date: recurringInvoice?.end_date || '',
        max_invoices: recurringInvoice?.max_invoices || '',
        tax_rate: recurringInvoice?.tax_rate || 25,
        currency: recurringInvoice?.currency || 'SEK',
        notes: recurringInvoice?.notes || '',
        terms: recurringInvoice?.terms || '',
        reference: recurringInvoice?.reference || '',
      });
      setRows(parseRowsTemplate(recurringInvoice?.rows_template));
      setError(null);
    }
  }, [isOpen, recurringInvoice]);

  useEffect(() => {
    if (isOpen && clients.length === 0) {
      dispatch(fetchClients());
    }
    if (isOpen && products.length === 0) {
      dispatch(fetchProducts());
    }
    if (isOpen && templates.length === 0) {
      dispatch(fetchTemplates());
    }
  }, [isOpen, clients.length, products.length, templates.length, dispatch]);

  // Separate templates into system and user templates
  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
    
    if (!formData.name?.trim()) {
      setError(t('recurringInvoices.nameRequired'));
      return;
    }

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
      const data = {
        ...formData,
        tax_rate: parseFloat(formData.tax_rate),
        max_invoices: formData.max_invoices ? parseInt(formData.max_invoices, 10) : null,
        end_date: formData.end_date || null,
        next_invoice_date: formData.start_date,
        rows_template: rows.filter(r => r.description.trim()).map(row => ({
          ...row,
          quantity: parseFloat(row.quantity),
          unit_price: parseFloat(row.unit_price),
          tax_rate: parseFloat(row.tax_rate || formData.tax_rate),
        })),
      };

      if (isEditing) {
        await dispatch(updateRecurringInvoice({ id: recurringInvoice.id, updates: data })).unwrap();
      } else {
        await dispatch(createRecurringInvoice(data)).unwrap();
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
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="recurring-invoice-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
          data-cy="modal-backdrop"
        />

        {/* Modal */}
        <div data-cy="recurring-invoice-modal-content" className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <h2 data-cy="recurring-invoice-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('recurringInvoices.edit') : t('recurringInvoices.create')}
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

          <form onSubmit={handleSubmit} data-cy="recurring-invoice-form" className="p-6 space-y-6" noValidate>
            {error && (
              <div data-cy="recurring-invoice-form-error" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Schedule Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('recurringInvoices.scheduleDetails')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Schedule Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('recurringInvoices.scheduleName')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    data-cy="schedule-name-input"
                    required
                    placeholder={t('recurringInvoices.scheduleNamePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

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

                {/* Template Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoices.selectTemplate')}
                  </label>
                  <select
                    name="invoice_template_id"
                    value={formData.invoice_template_id}
                    onChange={handleChange}
                    data-cy="template-select"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('invoices.defaultTemplate')}</option>
                    {systemTemplates.length > 0 && (
                      <optgroup label={t('invoiceTemplates.systemTemplate')}>
                        {systemTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {userTemplates.length > 0 && (
                      <optgroup label={t('invoiceTemplates.myTemplates')}>
                        {userTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('recurringInvoices.frequency')} *
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    data-cy="frequency-select"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FREQUENCIES.map(freq => (
                      <option key={freq} value={freq}>
                        {t(`recurringInvoices.frequencies.${freq}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('recurringInvoices.startDate')} *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    data-cy="start-date-input"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Date (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('recurringInvoices.endDate')}
                    <span className="text-gray-400 ml-1">({t('common.optional')})</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    data-cy="end-date-input"
                    min={formData.start_date}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Invoices (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('recurringInvoices.maxInvoices')}
                    <span className="text-gray-400 ml-1">({t('common.optional')})</span>
                  </label>
                  <input
                    type="number"
                    name="max_invoices"
                    value={formData.max_invoices}
                    onChange={handleChange}
                    data-cy="max-invoices-input"
                    min="1"
                    placeholder={t('recurringInvoices.unlimited')}
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
                    {t('invoice.currency')}
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    data-cy="currency-select"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getCurrencyCodes().map(code => {
                      const currency = getCurrency(code);
                      return (
                        <option key={code} value={code}>
                          {currency.symbol} {code} - {t(`currencies.${code}`)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Reference */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoice.reference')}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('invoices.lineItems')}
              </h3>
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-sm">
                    <div className="grid grid-cols-12 gap-2">
                      {/* Product Select */}
                      <div className="col-span-12 md:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('invoices.product')}
                        </label>
                        <select
                          value={row.product_id || ''}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          data-cy={`product-select-${index}`}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">{t('invoices.selectProduct')}</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('invoices.description')} *
                        </label>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                          data-cy={`description-input-${index}`}
                          required
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 md:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('invoices.quantity')}
                        </label>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                          data-cy={`quantity-input-${index}`}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-4 md:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('invoices.unit')}
                        </label>
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleRowChange(index, 'unit', e.target.value)}
                          data-cy={`unit-input-${index}`}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('invoices.unitPrice')}
                        </label>
                        <input
                          type="number"
                          value={row.unit_price}
                          onChange={(e) => handleRowChange(index, 'unit_price', e.target.value)}
                          data-cy={`unit-price-input-${index}`}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            data-cy={`remove-row-${index}`}
                            className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tax Rate for this row */}
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {t('invoice.taxRate')}:
                      </label>
                      <select
                        value={row.tax_rate}
                        onChange={(e) => handleRowChange(index, 'tax_rate', e.target.value)}
                        data-cy={`tax-rate-select-${index}`}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="0">0%</option>
                        <option value="6">6%</option>
                        <option value="12">12%</option>
                        <option value="25">25%</option>
                      </select>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRow}
                  data-cy="add-row-button"
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  + {t('invoices.addLineItem')}
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('invoice.subtotal')}:</span>
                    <span className="text-gray-900 dark:text-white font-medium" data-cy="subtotal">
                      {subtotal.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                  {vatGroups.map(group => (
                    <div key={group.rate} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('invoice.vat')} {group.rate}%:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {group.vat.toFixed(2)} {formData.currency}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-900 dark:text-white">{t('invoice.total')}:</span>
                    <span className="text-gray-900 dark:text-white" data-cy="total">
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
                  {t('invoice.notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  data-cy="notes-input"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('invoice.terms')}
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  data-cy="terms-input"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                data-cy="cancel-button"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                data-cy="submit-button"
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('common.saving') : (isEditing ? t('common.save') : t('common.create'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
