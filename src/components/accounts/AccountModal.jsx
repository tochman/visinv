import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createAccount, updateAccount } from '../../features/accounts/accountsSlice';
import { useOrganization } from '../../contexts/OrganizationContext';

const ACCOUNT_CLASSES = [
  { value: 'assets', label: 'accounts.classes.assets', prefix: '1' },
  { value: 'liabilities', label: 'accounts.classes.liabilities', prefix: '2' },
  { value: 'equity', label: 'accounts.classes.equity', prefix: '2' },
  { value: 'revenue', label: 'accounts.classes.revenue', prefix: '3' },
  { value: 'expenses', label: 'accounts.classes.expenses', prefix: '4,5,6,7' },
  { value: 'financial', label: 'accounts.classes.financial', prefix: '8' },
];

const ACCOUNT_TYPES = [
  { value: 'header', label: 'accounts.types.header' },
  { value: 'detail', label: 'accounts.types.detail' },
  { value: 'total', label: 'accounts.types.total' },
];

const VAT_RATES = [
  { value: null, label: 'accounts.vatRates.none' },
  { value: 0, label: 'accounts.vatRates.zero' },
  { value: 6, label: 'accounts.vatRates.six' },
  { value: 12, label: 'accounts.vatRates.twelve' },
  { value: 25, label: 'accounts.vatRates.twentyfive' },
];

const getInitialFormData = (account) => ({
  account_number: account?.account_number || '',
  name: account?.name || '',
  name_en: account?.name_en || '',
  account_class: account?.account_class || 'expenses',
  account_type: account?.account_type || 'detail',
  default_vat_rate: account?.default_vat_rate || null,
  description: account?.description || '',
});

export default function AccountModal({ account, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();
  const [form, setForm] = useState(getInitialFormData(account));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(account);

  useEffect(() => {
    if (account) {
      setForm(getInitialFormData(account));
    }
  }, [account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Convert VAT rate to number or null
    if (name === 'default_vat_rate') {
      processedValue = value === '' ? null : Number(value);
    }

    setForm((prev) => ({ ...prev, [name]: processedValue }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!form.account_number?.trim()) {
      newErrors.account_number = t('accounts.validation.accountNumberRequired');
    } else {
      // Validate account number format (4 digits)
      const accountNum = form.account_number.trim();
      if (!/^\d{4}$/.test(accountNum)) {
        newErrors.account_number = t('accounts.validation.accountNumberFormat');
      } else {
        // Validate account number prefix matches class
        const prefix = accountNum.charAt(0);
        const expectedClass = form.account_class;
        
        const classPrefix = {
          'assets': '1',
          'liabilities': '2',
          'equity': '2',
          'revenue': '3',
          'expenses': ['4', '5', '6', '7'],
          'financial': '8',
        };

        const expectedPrefixes = Array.isArray(classPrefix[expectedClass]) 
          ? classPrefix[expectedClass] 
          : [classPrefix[expectedClass]];

        if (!expectedPrefixes.includes(prefix)) {
          newErrors.account_number = t('accounts.validation.accountNumberClassMismatch', {
            class: t(`accounts.classes.${expectedClass}`),
            prefix: expectedPrefixes.join(', ')
          });
        }
      }
    }

    if (!form.name?.trim()) {
      newErrors.name = t('accounts.validation.nameRequired');
    }

    if (!form.account_class) {
      newErrors.account_class = t('accounts.validation.classRequired');
    }

    if (!form.account_type) {
      newErrors.account_type = t('accounts.validation.typeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    
    try {
      const accountData = {
        ...form,
        organization_id: currentOrganization.id,
        account_number: form.account_number.trim(),
        name: form.name.trim(),
        name_en: form.name_en?.trim() || null,
        description: form.description?.trim() || null,
      };

      if (isEdit) {
        await dispatch(updateAccount({
          id: account.id,
          updates: accountData,
          organizationId: currentOrganization.id,
        })).unwrap();
      } else {
        await dispatch(createAccount(accountData)).unwrap();
      }

      onClose();
    } catch (error) {
      setErrors({ submit: error });
    } finally {
      setSaving(false);
    }
  };

  const getClassPrefix = (accountClass) => {
    const classItem = ACCOUNT_CLASSES.find(c => c.value === accountClass);
    return classItem ? classItem.prefix : '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="account-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEdit ? t('accounts.editAccount') : t('accounts.createAccount')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              data-cy="close-account-modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.accountNumber')} *
              </label>
              <input
                type="text"
                name="account_number"
                value={form.account_number}
                onChange={handleChange}
                disabled={isEdit && account?.is_system}
                placeholder={t('accounts.accountNumberPlaceholder')}
                className={`w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono ${
                  errors.account_number
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                } ${isEdit && account?.is_system ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-cy="account-number-input"
                maxLength={4}
              />
              {errors.account_number && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="account-number-error">
                  {errors.account_number}
                </p>
              )}
              {form.account_class && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('accounts.accountNumberHint', { 
                    class: t(`accounts.classes.${form.account_class}`),
                    prefix: getClassPrefix(form.account_class)
                  })}
                </p>
              )}
            </div>

            {/* Account Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.class')} *
              </label>
              <select
                name="account_class"
                value={form.account_class}
                onChange={handleChange}
                disabled={isEdit && account?.is_system}
                className={`w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.account_class
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                } ${isEdit && account?.is_system ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-cy="account-class-select"
              >
                {ACCOUNT_CLASSES.map((cls) => (
                  <option key={cls.value} value={cls.value}>
                    {t(cls.label)} ({cls.prefix}xxx)
                  </option>
                ))}
              </select>
              {errors.account_class && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="account-class-error">
                  {errors.account_class}
                </p>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.type')} *
              </label>
              <select
                name="account_type"
                value={form.account_type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.account_type
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                data-cy="account-type-select"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(type.label)}
                  </option>
                ))}
              </select>
              {errors.account_type && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="account-type-error">
                  {errors.account_type}
                </p>
              )}
            </div>

            {/* Swedish Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.nameSwedish')} *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('accounts.nameSwedishPlaceholder')}
                className={`w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.name
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                data-cy="account-name-input"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="account-name-error">
                  {errors.name}
                </p>
              )}
            </div>

            {/* English Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.nameEnglish')}
              </label>
              <input
                type="text"
                name="name_en"
                value={form.name_en}
                onChange={handleChange}
                placeholder={t('accounts.nameEnglishPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                data-cy="account-name-en-input"
              />
            </div>

            {/* Default VAT Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.defaultVatRate')}
              </label>
              <select
                name="default_vat_rate"
                value={form.default_vat_rate ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                data-cy="account-vat-rate-select"
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate.value ?? 'none'} value={rate.value ?? ''}>
                    {t(rate.label)}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('accounts.description')}
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder={t('accounts.descriptionPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                data-cy="account-description-input"
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                <p className="text-red-600 dark:text-red-400 text-sm" data-cy="account-submit-error">
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
                data-cy="cancel-account-button"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-cy="save-account-button"
              >
                {saving ? (
                  <>
                    <div className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  isEdit ? t('common.update') : t('common.create')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}