import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { CubeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useOrganization } from '../../contexts/OrganizationContext';
import { createInvoice, updateInvoice } from '../../features/invoices/invoicesSlice';
import { fetchClients } from '../../features/clients/clientsSlice';
import { fetchProducts } from '../../features/products/productsSlice';
import { fetchTemplates } from '../../features/invoiceTemplates/invoiceTemplatesSlice';
import { getCurrencyCodes, getCurrency } from '../../config/currencies';
import { usePremiumAccess } from '../../hooks/usePremiumAccess';
import { useToast } from '../../context/ToastContext';

export default function InvoiceModal({ isOpen, onClose, invoice = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const toast = useToast();
  const isEditing = !!invoice;
  const { hasPremiumAccess } = usePremiumAccess();
  
  const clients = useSelector(state => state.clients.items);
  const products = useSelector(state => state.products.items);
  const templates = useSelector(state => state.invoiceTemplates.items);
  const invoices = useSelector(state => state.invoices.items);
  const prevInvoiceIdRef = useRef();

  const { currentOrganization } = useOrganization();
  const isManualNumbering = currentOrganization?.invoice_numbering_mode === 'manual';

  const [formData, setFormData] = useState({
    client_id: invoice?.client_id || '',
    invoice_template_id: invoice?.invoice_template_id || '',
    invoice_number: invoice?.invoice_number || '',
    invoice_type: invoice?.invoice_type || 'DEBET',
    credited_invoice_id: invoice?.credited_invoice_id || '',
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    delivery_date: invoice?.delivery_date || invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: invoice?.tax_rate || 25,
    currency: invoice?.currency || 'SEK',
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
    reference: invoice?.reference || '',
    // Recurring settings (Premium feature)
    is_recurring: invoice?.is_recurring || false,
    recurring_frequency: invoice?.recurring_frequency || 'monthly',
    recurring_end_date: invoice?.recurring_end_date || '',
    recurring_max_count: invoice?.recurring_max_count || '',
  });

  const [rows, setRows] = useState(invoice?.invoice_rows || [
    { description: '', quantity: 1, unit_price: 0, unit: 'st', tax_rate: 25 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openProductMenu, setOpenProductMenu] = useState(null);

  // Reset form when modal opens or when switching between invoices
  useEffect(() => {
    const currentInvoiceId = invoice?.id;
    if (isOpen && prevInvoiceIdRef.current !== currentInvoiceId) {
      setFormData({
        client_id: invoice?.client_id || '',
        invoice_template_id: invoice?.invoice_template_id || '',
        invoice_number: invoice?.invoice_number || '',
        invoice_type: invoice?.invoice_type || 'DEBET',
        credited_invoice_id: invoice?.credited_invoice_id || '',
        issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
        delivery_date: invoice?.delivery_date || invoice?.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tax_rate: invoice?.tax_rate || 25,
        currency: invoice?.currency || 'SEK',
        notes: invoice?.notes || '',
        terms: invoice?.terms || '',
        reference: invoice?.reference || '',
        // Recurring settings (Premium feature)
        is_recurring: invoice?.is_recurring || false,
        recurring_frequency: invoice?.recurring_frequency || 'monthly',
        recurring_end_date: invoice?.recurring_end_date || '',
        recurring_max_count: invoice?.recurring_max_count || '',
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
    if (isOpen && templates.length === 0) {
      dispatch(fetchTemplates());
    }
  }, [isOpen, clients.length, products.length, templates.length, dispatch]);

  // Separate templates into system and user templates
  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

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

    if (isManualNumbering && !isEditing && !formData.invoice_number?.trim()) {
      setError(t('invoices.invoiceNumberRequired'));
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
        // Convert empty strings to null for optional UUID fields
        invoice_template_id: formData.invoice_template_id || null,
        credited_invoice_id: formData.credited_invoice_id || null,
        tax_rate: parseFloat(formData.tax_rate),
        rows: rows.filter(r => r.description.trim()).map(row => ({
          ...row,
          // Convert empty product_id to null for UUID field
          product_id: row.product_id || null,
          quantity: parseFloat(row.quantity),
          unit_price: parseFloat(row.unit_price),
          tax_rate: parseFloat(row.tax_rate || formData.tax_rate),
        })),
      };

      if (isEditing) {
        await dispatch(updateInvoice({ id: invoice.id, updates: invoiceData })).unwrap();
        toast.success(t('invoices.invoiceUpdatedSuccessfully') || 'Invoice updated successfully');
      } else {
        await dispatch(createInvoice(invoiceData)).unwrap();
        toast.success(t('invoices.invoiceCreatedSuccessfully') || 'Invoice created successfully');
      }
      onClose();
    } catch (err) {
      // Handle both Error objects and string errors
      const errorMessage = err?.message || err?.toString() || 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
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

                {/* Invoice Type */}
                {!isEditing && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('invoices.invoiceType')} *
                    </label>
                    <select
                      name="invoice_type"
                      value={formData.invoice_type}
                      onChange={handleChange}
                      data-cy="invoice-type-select"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DEBET">{t('invoices.invoiceTypeDebet')}</option>
                      <option value="CREDIT">{t('invoices.invoiceTypeCredit')}</option>
                    </select>
                  </div>
                )}

                {/* Credited Invoice Selection (only for CREDIT invoices) */}
                {!isEditing && formData.invoice_type === 'CREDIT' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('invoices.creditedInvoice')} *
                    </label>
                    <select
                      name="credited_invoice_id"
                      value={formData.credited_invoice_id}
                      onChange={handleChange}
                      data-cy="credited-invoice-select"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('invoices.selectCreditedInvoice')}</option>
                      {clients
                        .find(c => c.id === formData.client_id)
                        ? invoices
                            .filter(inv => inv.client_id === formData.client_id && inv.invoice_type === 'DEBET')
                            .map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.invoice_number} - {inv.total_amount} {inv.currency}
                              </option>
                            ))
                        : null}
                    </select>
                  </div>
                )}

                {/* Invoice Number (Manual Mode Only) */}
                {isManualNumbering && !isEditing && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('invoice.number')} *
                    </label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      data-cy="invoice-number-input"
                      required
                      placeholder={t('invoices.invoiceNumberPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('invoices.manualNumberingHint')}
                    </p>
                  </div>
                )}

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

                {/* Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoice.deliveryDate')} *
                  </label>
                  <input
                    type="date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleChange}
                    data-cy="delivery-date-input"
                    required
                    max={new Date().toISOString().split('T')[0]}
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
                          {code} - {currency.symbol} {t(`currencies.${code}`)}
                        </option>
                      );
                    })}
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

            {/* Recurring Invoice Settings (Premium Feature) */}
            {formData.invoice_type === 'DEBET' && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-sm p-4" data-cy="recurring-section">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_recurring}
                        onChange={(e) => {
                          if (!hasPremiumAccess && e.target.checked) {
                            // Show upgrade prompt for non-premium users
                            return;
                          }
                          setFormData({ ...formData, is_recurring: e.target.checked });
                        }}
                        disabled={!hasPremiumAccess}
                        data-cy="recurring-toggle"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {t('invoices.makeRecurring')}
                        {!hasPremiumAccess && (
                          <span className="text-xs bg-yellow-400 dark:bg-yellow-500 text-gray-900 px-2 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('invoices.recurringDescription')}
                      </p>
                    </div>
                  </div>
                </div>

                {formData.is_recurring && hasPremiumAccess && (
                  <div>
                    {/* Show recurring status info when editing */}
                    {isEditing && invoice?.recurring_next_date && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('invoices.recurringFrequency')}</span>
                          <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                            {formData.recurring_frequency}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('invoices.recurringNextDate')}</span>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {invoice.recurring_next_date}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('invoices.recurringProgress')}</span>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {invoice.recurring_current_count || 0} {invoice.recurring_max_count ? `of ${invoice.recurring_max_count}` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('invoices.recurringFrequency')}
                      </label>
                      <select
                        name="recurring_frequency"
                        value={formData.recurring_frequency}
                        onChange={handleChange}
                        data-cy="recurring-frequency-select"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">{t('invoices.frequencyWeekly')}</option>
                        <option value="biweekly">{t('invoices.frequencyBiweekly')}</option>
                        <option value="monthly">{t('invoices.frequencyMonthly')}</option>
                        <option value="quarterly">{t('invoices.frequencyQuarterly')}</option>
                        <option value="yearly">{t('invoices.frequencyYearly')}</option>
                      </select>
                    </div>

                    {/* End Date (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('invoices.recurringEndDate')}
                        <span className="text-gray-400 font-normal ml-1">({t('common.optional')})</span>
                      </label>
                      <input
                        type="date"
                        name="recurring_end_date"
                        value={formData.recurring_end_date}
                        onChange={handleChange}
                        data-cy="recurring-end-date-input"
                        min={formData.issue_date}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Max Invoices (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('invoices.recurringMaxInvoices')}
                        <span className="text-gray-400 font-normal ml-1">({t('common.optional')})</span>
                      </label>
                      <input
                        type="number"
                        name="recurring_max_count"
                        value={formData.recurring_max_count}
                        onChange={handleChange}
                        data-cy="recurring-max-invoices-input"
                        min="1"
                        placeholder={t('invoices.unlimited')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}

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
                  <div key={index} data-cy={`line-item-${index}`} className="relative">
                    {/* Line Item Fields - All on one row */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-sm items-center">
                      {/* Product Selector Button */}
                      {products.length > 0 && (
                        <div className="col-span-1 relative">
                          <button
                            type="button"
                            onClick={() => setOpenProductMenu(openProductMenu === index ? null : index)}
                            data-cy={`product-select-btn-${index}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 rounded-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-700"
                            title={t('invoices.selectProduct')}
                          >
                            <CubeIcon className="w-5 h-5" />
                          </button>
                          
                          {/* Product Dropdown Menu */}
                          {openProductMenu === index && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenProductMenu(null)}
                              />
                              <div 
                                className="absolute left-0 top-full mt-1 z-20 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg max-h-60 overflow-y-auto"
                                data-cy={`product-menu-${index}`}
                              >
                                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    {t('invoices.selectProduct')}
                                  </span>
                                </div>
                                {products.map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => {
                                      handleProductSelect(index, product.id);
                                      setOpenProductMenu(null);
                                    }}
                                    data-cy={`product-option-${product.id}`}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                      row.product_id === product.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {product.unit_price} SEK / {product.unit}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      <div className={products.length > 0 ? "col-span-11 sm:col-span-3" : "col-span-12 sm:col-span-4"}>
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
                      <div className="col-span-3 sm:col-span-1">
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
                      <div className="col-span-3 sm:col-span-1">
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
                      <div className="col-span-3 sm:col-span-2">
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

                      {/* VAT Rate */}
                      <div className="col-span-4 sm:col-span-1">
                        <select
                          value={row.tax_rate || formData.tax_rate}
                          onChange={(e) => handleRowChange(index, 'tax_rate', e.target.value)}
                          data-cy={`tax-rate-select-${index}`}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="25">25%</option>
                          <option value="12">12%</option>
                          <option value="6">6%</option>
                          <option value="0">0%</option>
                        </select>
                      </div>

                      {/* Amount */}
                      <div className="col-span-5 sm:col-span-2 flex items-center justify-end gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-cy={`amount-${index}`}>
                          {(parseFloat(row.quantity || 0) * parseFloat(row.unit_price || 0)).toFixed(2)}
                        </span>
                        
                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          data-cy={`remove-line-item-${index}`}
                          disabled={rows.length === 1}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        {t('invoices.vat')} {group.rate}% ({t('invoices.on')} {group.base.toFixed(2)} {formData.currency}):
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
