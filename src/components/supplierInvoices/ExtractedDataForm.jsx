import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

/**
 * Confidence indicator component
 */
function ConfidenceIndicator({ confidence, showLabel = false }) {
  const { t } = useTranslation();
  
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (confidence >= 0.8) return t('ocrUpload.confidence.high');
    if (confidence >= 0.6) return t('ocrUpload.confidence.medium');
    return t('ocrUpload.confidence.low');
  };

  return (
    <div className="flex items-center space-x-1">
      <div className={`w-2 h-2 rounded-full ${getColor()}`} title={`${Math.round(confidence * 100)}%`} />
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{getLabel()}</span>
      )}
    </div>
  );
}

/**
 * Editable field with confidence indicator
 */
function EditableField({ 
  label, 
  value, 
  onChange, 
  confidence, 
  type = 'text',
  required = false,
  placeholder,
  dataCy,
  hasError = false 
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {confidence !== undefined && <ConfidenceIndicator confidence={confidence} />}
      </div>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-sm 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   ${hasError 
                     ? 'border-red-500 dark:border-red-400' 
                     : 'border-gray-300 dark:border-gray-600'}`}
        data-cy={dataCy}
      />
    </div>
  );
}

/**
 * ExtractedDataForm Component
 * Displays and allows editing of AI-extracted invoice data
 * US-263: Supplier Invoice & Receipt OCR Upload
 */
export default function ExtractedDataForm({ 
  data, 
  matchedSupplier, 
  onDataUpdate, 
  onSupplierChange,
  selectedSupplierId: externalSelectedSupplierId,
  showSupplierSection = true, // Prop to control supplier section visibility
  validationErrors = {} // Object with field names as keys for validation errors
}) {
  const { t } = useTranslation();
  const suppliers = useSelector((state) => state.suppliers?.suppliers || []);
  const accounts = useSelector((state) => state.accounts?.items || []);

  const [formData, setFormData] = useState({
    supplier: {},
    invoice: {},
    line_items: [],
    totals: {},
    confidence: {},
  });

  const [internalSelectedSupplierId, setInternalSelectedSupplierId] = useState(matchedSupplier?.id || 'new');
  const [showSupplierForm, setShowSupplierForm] = useState(!matchedSupplier);
  
  // Use external value if provided, otherwise use internal state
  const selectedSupplierId = externalSelectedSupplierId !== undefined ? externalSelectedSupplierId : internalSelectedSupplierId;

  // Initialize form data from extracted data
  useEffect(() => {
    if (data) {
      setFormData({
        supplier: data.supplier || {},
        invoice: data.invoice || {},
        line_items: data.line_items || [],
        totals: data.totals || {},
        confidence: data.confidence || {},
      });

      if (matchedSupplier) {
        setInternalSelectedSupplierId(matchedSupplier.id);
        setShowSupplierForm(false);
      } else {
        setInternalSelectedSupplierId('new');
        setShowSupplierForm(true);
      }
    }
  }, [data, matchedSupplier]);

  // Update parent component when form data changes
  const handleUpdate = (newData) => {
    setFormData(newData);
    onDataUpdate?.(newData);
  };

  // Handle supplier selection from dropdown
  const handleSupplierSelect = (supplierId) => {
    setInternalSelectedSupplierId(supplierId);
    onSupplierChange?.(supplierId);
    if (supplierId === 'new') {
      setShowSupplierForm(true);
    } else {
      setShowSupplierForm(false);
      const existingSupplier = suppliers.find((s) => s.id === supplierId);
      if (existingSupplier) {
        handleUpdate({
          ...formData,
          supplier: {
            ...formData.supplier,
            id: existingSupplier.id,
            name: existingSupplier.name,
            organization_number: existingSupplier.organization_number,
            vat_number: existingSupplier.vat_number,
          },
        });
      }
    }
  };

  // Update supplier field
  const handleSupplierFieldChange = (field, value) => {
    handleUpdate({
      ...formData,
      supplier: { ...formData.supplier, [field]: value },
    });
  };

  // Update invoice field
  const handleInvoiceChange = (field, value) => {
    handleUpdate({
      ...formData,
      invoice: { ...formData.invoice, [field]: value },
    });
  };

  // Update line item
  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    // Auto-calculate amount when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(newLineItems[index].quantity) || 0;
      const unitPrice = parseFloat(newLineItems[index].unit_price) || 0;
      newLineItems[index].amount = (quantity * unitPrice).toFixed(2);

      // Also recalculate VAT amount
      const vatRate = parseFloat(newLineItems[index].vat_rate) || 0;
      newLineItems[index].vat_amount = ((quantity * unitPrice * vatRate) / 100).toFixed(2);
    }

    // Recalculate totals
    const subtotal = newLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const vatAmount = newLineItems.reduce((sum, item) => sum + (parseFloat(item.vat_amount) || 0), 0);

    handleUpdate({
      ...formData,
      line_items: newLineItems,
      totals: {
        subtotal: subtotal.toFixed(2),
        vat_amount: vatAmount.toFixed(2),
        total_amount: (subtotal + vatAmount).toFixed(2),
      },
    });
  };

  // Add new line item
  const handleAddLineItem = () => {
    handleUpdate({
      ...formData,
      line_items: [
        ...formData.line_items,
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          amount: 0,
          vat_rate: 25,
          vat_amount: 0,
          suggested_account: '',
          category: '',
        },
      ],
    });
  };

  // Remove line item
  const handleRemoveLineItem = (index) => {
    const newLineItems = formData.line_items.filter((_, i) => i !== index);
    
    // Recalculate totals
    const subtotal = newLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const vatAmount = newLineItems.reduce((sum, item) => sum + (parseFloat(item.vat_amount) || 0), 0);

    handleUpdate({
      ...formData,
      line_items: newLineItems,
      totals: {
        subtotal: subtotal.toFixed(2),
        vat_amount: vatAmount.toFixed(2),
        total_amount: (subtotal + vatAmount).toFixed(2),
      },
    });
  };

  // Filter expense accounts (4000-7999)
  const expenseAccounts = accounts.filter((a) => {
    const accNum = parseInt(a?.account_number, 10);
    return accNum >= 4000 && accNum < 8000;
  });

  return (
    <div className="space-y-6" data-cy="extracted-data-form">
      {/* Overall Confidence */}
      {formData.confidence?.overall && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('ocrUpload.overallConfidence')}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${formData.confidence.overall >= 0.8 ? 'bg-green-500' : formData.confidence.overall >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${formData.confidence.overall * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(formData.confidence.overall * 100)}%
              </span>
            </div>
          </div>
          {formData.confidence?.notes && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formData.confidence.notes}
            </p>
          )}
        </div>
      )}

      {/* Supplier Section - only shown when showSupplierSection is true */}
      {showSupplierSection && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t('ocrUpload.supplierInfo')}
          </h4>

          {/* Supplier selection */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('ocrUpload.selectSupplier')}
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-sm 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              data-cy="supplier-select"
            >
              <option value="new">{t('ocrUpload.createNewSupplier')}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.organization_number && `(${supplier.organization_number})`}
                </option>
              ))}
            </select>
            
            {matchedSupplier && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400" data-cy="matched-supplier-notice">
                {t('ocrUpload.matchedSupplier', { 
                  type: t(`ocrUpload.matchType.${matchedSupplier.match_type}`) 
                })}
              </p>
            )}
          </div>

          {/* New supplier form */}
          {showSupplierForm && (
            <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-sm">
              <div className="col-span-2">
                <EditableField
                  label={t('suppliers.name')}
                  value={formData.supplier.name}
                  onChange={(v) => handleSupplierFieldChange('name', v)}
                  confidence={formData.confidence?.supplier_name}
                  required
                  dataCy="supplier-name-input"
                />
              </div>
              <EditableField
                label={t('suppliers.organizationNumber')}
                value={formData.supplier.organization_number}
                onChange={(v) => handleSupplierFieldChange('organization_number', v)}
                dataCy="supplier-org-number-input"
              />
              <EditableField
                label={t('suppliers.vatNumber')}
                value={formData.supplier.vat_number}
                onChange={(v) => handleSupplierFieldChange('vat_number', v)}
                dataCy="supplier-vat-input"
              />
              <div className="col-span-2">
                <EditableField
                  label={t('suppliers.address')}
                  value={formData.supplier.address}
                  onChange={(v) => handleSupplierFieldChange('address', v)}
                  dataCy="supplier-address-input"
                />
              </div>
              <EditableField
                label={t('suppliers.postalCode')}
                value={formData.supplier.postal_code}
                onChange={(v) => handleSupplierFieldChange('postal_code', v)}
                dataCy="supplier-postal-code-input"
              />
              <EditableField
                label={t('suppliers.city')}
                value={formData.supplier.city}
                onChange={(v) => handleSupplierFieldChange('city', v)}
                dataCy="supplier-city-input"
              />
            </div>
          )}
        </div>
      )}

      {/* Invoice Details Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('ocrUpload.invoiceDetails')}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <EditableField
            label={t('supplierInvoices.invoiceNumber')}
            value={formData.invoice.invoice_number}
            onChange={(v) => handleInvoiceChange('invoice_number', v)}
            confidence={formData.confidence?.invoice_number}
            required
            dataCy="invoice-number-input"
            hasError={validationErrors.invoice_number}
          />
          <EditableField
            label={t('supplierInvoices.invoiceDate')}
            value={formData.invoice.invoice_date}
            onChange={(v) => handleInvoiceChange('invoice_date', v)}
            type="date"
            required
            dataCy="invoice-date-input"
            hasError={validationErrors.invoice_date}
          />
          <EditableField
            label={t('supplierInvoices.dueDate')}
            value={formData.invoice.due_date}
            onChange={(v) => handleInvoiceChange('due_date', v)}
            type="date"
            required
            dataCy="due-date-input"
            hasError={validationErrors.due_date}
          />
          <EditableField
            label={t('ocrUpload.paymentReference')}
            value={formData.invoice.payment_reference}
            onChange={(v) => handleInvoiceChange('payment_reference', v)}
            placeholder="OCR/Reference"
            dataCy="payment-reference-input"
          />
          <div className="col-span-2">
            <EditableField
              label={t('supplierInvoices.description')}
              value={formData.invoice.description}
              onChange={(v) => handleInvoiceChange('description', v)}
              dataCy="description-input"
            />
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('supplierInvoices.lineItems')}
          </h4>
          <button
            type="button"
            onClick={handleAddLineItem}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            data-cy="add-line-item-button"
          >
            + {t('supplierInvoices.addLine')}
          </button>
        </div>

        <div className="space-y-4">
          {formData.line_items.map((item, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-sm"
              data-cy={`line-item-${index}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t('ocrUpload.lineItem')} {index + 1}
                </span>
                {formData.line_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    className="text-red-500 hover:text-red-600 text-xs"
                    data-cy={`remove-line-${index}`}
                  >
                    {t('common.remove')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-4">
                  <EditableField
                    label={t('supplierInvoices.lineDescription')}
                    value={item.description}
                    onChange={(v) => handleLineItemChange(index, 'description', v)}
                    dataCy={`line-description-${index}`}
                  />
                </div>
                
                {/* Account selection with AI suggestion */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('supplierInvoices.account')}
                  </label>
                  <select
                    value={item.account_id || ''}
                    onChange={(e) => handleLineItemChange(index, 'account_id', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-sm 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    data-cy={`line-account-${index}`}
                  >
                    <option value="">{t('common.select')}</option>
                    {expenseAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_number} - {acc.name}
                      </option>
                    ))}
                  </select>
                  {item.suggested_account && !item.account_id && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      {t('ocrUpload.suggestedAccount')}: {item.suggested_account} {item.suggested_account_name && `- ${item.suggested_account_name}`}
                    </p>
                  )}
                </div>

                <EditableField
                  label={t('supplierInvoices.quantity')}
                  value={item.quantity}
                  onChange={(v) => handleLineItemChange(index, 'quantity', v)}
                  type="number"
                  dataCy={`line-quantity-${index}`}
                />
                <EditableField
                  label={t('supplierInvoices.unitPrice')}
                  value={item.unit_price}
                  onChange={(v) => handleLineItemChange(index, 'unit_price', v)}
                  type="number"
                  dataCy={`line-unit-price-${index}`}
                />
                <EditableField
                  label={t('supplierInvoices.amount')}
                  value={item.amount}
                  onChange={(v) => handleLineItemChange(index, 'amount', v)}
                  type="number"
                  dataCy={`line-amount-${index}`}
                />
                <EditableField
                  label={t('supplierInvoices.vatRate')}
                  value={item.vat_rate}
                  onChange={(v) => handleLineItemChange(index, 'vat_rate', v)}
                  type="number"
                  dataCy={`line-vat-rate-${index}`}
                />
                <EditableField
                  label={t('supplierInvoices.vatAmount')}
                  value={item.vat_amount}
                  onChange={(v) => handleLineItemChange(index, 'vat_amount', v)}
                  type="number"
                  dataCy={`line-vat-amount-${index}`}
                />
                
                {item.category && (
                  <div className="col-span-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('ocrUpload.category')}: {item.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('ocrUpload.totals')}
        </h4>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-sm p-4">
          <div className="flex items-center justify-between">
            <ConfidenceIndicator confidence={formData.confidence?.amounts || 0.5} showLabel />
          </div>
          <div className="space-y-2 mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('supplierInvoices.subtotal')}</span>
              <span className="font-medium text-gray-900 dark:text-white" data-cy="total-subtotal">
                {parseFloat(formData.totals.subtotal || 0).toFixed(2)} {formData.invoice.currency || 'SEK'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('supplierInvoices.vat')}</span>
              <span className="font-medium text-gray-900 dark:text-white" data-cy="total-vat">
                {parseFloat(formData.totals.vat_amount || 0).toFixed(2)} {formData.invoice.currency || 'SEK'}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="font-semibold text-gray-900 dark:text-white">{t('supplierInvoices.total')}</span>
              <span className="font-bold text-gray-900 dark:text-white" data-cy="total-amount">
                {parseFloat(formData.totals.total_amount || 0).toFixed(2)} {formData.invoice.currency || 'SEK'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
