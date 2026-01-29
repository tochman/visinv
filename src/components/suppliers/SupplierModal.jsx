import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../contexts/OrganizationContext';
import { createSupplier, updateSupplier } from '../../features/suppliers/suppliersSlice';
import { fetchAccounts } from '../../features/accounts/accountsSlice';

const getInitialFormData = (supplier) => ({
  name: supplier?.name || '',
  email: supplier?.email || '',
  phone: supplier?.phone || '',
  website: supplier?.website || '',
  address_line1: supplier?.address_line1 || '',
  address_line2: supplier?.address_line2 || '',
  city: supplier?.city || '',
  postal_code: supplier?.postal_code || '',
  country: supplier?.country || 'SE',
  organization_number: supplier?.organization_number || '',
  vat_number: supplier?.vat_number || '',
  bank_account: supplier?.bank_account || '',
  bank_name: supplier?.bank_name || '',
  iban: supplier?.iban || '',
  swift_bic: supplier?.swift_bic || '',
  default_payment_terms_days: supplier?.default_payment_terms_days || 30,
  payment_method: supplier?.payment_method || 'bank_transfer',
  default_expense_account_id: supplier?.default_expense_account_id || '',
  default_payable_account_id: supplier?.default_payable_account_id || '',
  currency: supplier?.currency || 'SEK',
  is_active: supplier?.is_active !== undefined ? supplier.is_active : true,
  notes: supplier?.notes || '',
});

export default function SupplierModal({ isOpen, onClose, supplier = null }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();
  const isEditing = !!supplier;

  const [formData, setFormData] = useState(getInitialFormData(supplier));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const accounts = useSelector((state) => state.accounts?.accounts || []);
  const accountsLoading = useSelector((state) => state.accounts?.loading || false);

  // Fetch accounts for dropdown
  useEffect(() => {
    if (isOpen && currentOrganization?.id && accounts.length === 0) {
      dispatch(fetchAccounts(currentOrganization.id));
    }
  }, [dispatch, isOpen, currentOrganization?.id, accounts.length]);

  // Update form data when supplier changes (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(supplier));
      setError(null);
    }
  }, [supplier, isOpen]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      setError('Supplier name is required');
      return;
    }

    if (!currentOrganization?.id) {
      setError('No organization selected');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = {
        ...formData,
        name: formData.name.trim(),
        organization_id: currentOrganization.id,
        default_payment_terms_days: parseInt(formData.default_payment_terms_days) || 30,
      };

      // Remove empty strings for optional account fields
      if (!dataToSubmit.default_expense_account_id) delete dataToSubmit.default_expense_account_id;
      if (!dataToSubmit.default_payable_account_id) delete dataToSubmit.default_payable_account_id;

      if (isEditing) {
        await dispatch(updateSupplier({ id: supplier.id, ...dataToSubmit })).unwrap();
      } else {
        await dispatch(createSupplier(dataToSubmit)).unwrap();
      }
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter accounts for dropdowns - ensure accounts is an array
  const expenseAccounts = Array.isArray(accounts) 
    ? accounts.filter(a => a?.account_number >= 4000 && a?.account_number < 8000)
    : [];
  const payableAccounts = Array.isArray(accounts)
    ? accounts.filter(a => a?.account_number >= 2400 && a?.account_number < 2500)
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="supplier-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
          data-cy="modal-backdrop"
        />

        {/* Modal */}
        <div data-cy="supplier-modal-content" className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 data-cy="supplier-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('suppliers.edit') : t('suppliers.create')}
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

          <form onSubmit={handleSubmit} data-cy="supplier-form" className="p-6 space-y-6">
            {error && (
              <div data-cy="supplier-form-error" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.basicInfo')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.name')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    data-cy="supplier-name-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    data-cy="supplier-email-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.phone')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    data-cy="supplier-phone-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.website')}
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    data-cy="supplier-website-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      data-cy="supplier-active-checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('suppliers.isActive')}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.businessInfo')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.orgNumber')}
                  </label>
                  <input
                    type="text"
                    name="organization_number"
                    value={formData.organization_number}
                    onChange={handleChange}
                    data-cy="supplier-org-number-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.vatNumber')}
                  </label>
                  <input
                    type="text"
                    name="vat_number"
                    value={formData.vat_number}
                    onChange={handleChange}
                    data-cy="supplier-vat-number-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.currency')}
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    data-cy="supplier-currency-input"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.address')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.streetAddress')}
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.postalCode')}
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.city')}
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Banking Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.bankingInfo')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.bankAccount')}
                  </label>
                  <input
                    type="text"
                    name="bank_account"
                    value={formData.bank_account}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.bankName')}
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.iban')}
                  </label>
                  <input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.swiftBic')}
                  </label>
                  <input
                    type="text"
                    name="swift_bic"
                    value={formData.swift_bic}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.paymentTerms')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.paymentTermsDays')}
                  </label>
                  <input
                    type="number"
                    name="default_payment_terms_days"
                    value={formData.default_payment_terms_days}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.paymentMethod')}
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="bank_transfer">{t('suppliers.paymentMethods.bank_transfer')}</option>
                    <option value="autogiro">{t('suppliers.paymentMethods.autogiro')}</option>
                    <option value="card">{t('suppliers.paymentMethods.card')}</option>
                    <option value="cash">{t('suppliers.paymentMethods.cash')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Accounting Defaults */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('suppliers.accountingDefaults')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.defaultExpenseAccount')}
                  </label>
                  <select
                    name="default_expense_account_id"
                    value={formData.default_expense_account_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">-- {t('common.select')} --</option>
                    {expenseAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('suppliers.defaultPayableAccount')}
                  </label>
                  <select
                    name="default_payable_account_id"
                    value={formData.default_payable_account_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">-- {t('common.select')} --</option>
                    {payableAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('suppliers.notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
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
