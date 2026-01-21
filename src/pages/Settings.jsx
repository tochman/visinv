import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';

export default function Settings() {
  const { t } = useTranslation();
  const { currentOrganization, updateOrganization, loading } = useOrganization();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleEdit = () => {
    setFormData({ ...currentOrganization });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
    setError(null);
    setValidationErrors({});
    setSuccessMessage('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Företagsnamn är obligatoriskt';
    }
    if (!formData.organization_number?.trim()) {
      errors.organization_number = 'Organisationsnummer är obligatoriskt enligt Aktiebolagslagen';
    }
    if (!formData.municipality?.trim()) {
      errors.municipality = 'Kommun är obligatoriskt enligt Aktiebolagslagen';
    }
    if (!formData.vat_number?.trim()) {
      errors.vat_number = 'Momsregistreringsnummer är obligatoriskt enligt Mervärdesskattelagen';
    }
    if (!formData.address?.trim()) {
      errors.address = 'Adress är obligatorisk';
    }
    if (!formData.city?.trim()) {
      errors.city = 'Stad är obligatorisk';
    }
    if (!formData.postal_code?.trim()) {
      errors.postal_code = 'Postnummer är obligatoriskt';
    }
    if (!formData.email?.trim()) {
      errors.email = 'E-post är obligatoriskt';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Ogiltig e-postadress';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setError(null);
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setSaving(true);

    const { error: updateError } = await updateOrganization(currentOrganization.id, formData);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccessMessage('Organisationen har sparats');
    setTimeout(() => setSuccessMessage(''), 3000);
    setIsEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t('nav.settings')}</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm p-6">
          <p className="text-yellow-800 dark:text-yellow-200">{t('organization.noOrganization')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('nav.settings')}</h1>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            data-cy="edit-organization"
          >
            {t('organization.edit')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )successMessage && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded" data-cy="success-message">
          {successMessage}ationErrors).length && !isEditing && formData.name && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded" data-cy="success-message">
          Organisationen har sparad
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('organization.setupWizard.step1')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.name')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-name"
                      required
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-org-name">{validationErrors.name}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.name}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.organizationNumber')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="organization_number"
                      value={formData.organization_number || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-number"
                      required
                    />
                    {validationErrors.organization_number && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-org-number">{validationErrors.organization_number}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.organization_number || '-'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.vatNumber')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="vat_number"
                      value={formData.vat_number || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-vat"
                      required
                    />
                    {validationErrors.vat_number && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-vat-number">{validationErrors.vat_number}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.vat_number || '-'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address & Contact */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('organization.setupWizard.step2')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.address')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-address"
                      required
                    />
                    {validationErrors.address && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-address">{validationErrors.address}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.address || '-'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.city')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-city"
                      required
                    />
                    {validationErrors.city && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-city">{validationErrors.city}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.city || '-'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Postnummer
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-postal-code"
                      required
                    />
                    {validationErrors.postal_code && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-postal-code">{validationErrors.postal_code}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.postal_code || '-'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.municipality')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      name="municipality"
                      value={formData.municipality || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-municipality"
                      required
                    />
                    {validationErrors.municipality && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-municipality">{validationErrors.municipality}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.municipality || '-'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.email')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-email"
                      required
                    />
                    {validationErrors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-email">{validationErrors.email}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.email || '-'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.phone')}
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.phone || '-'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Banking & Tax */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('organization.setupWizard.step3')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.bankGiro')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="bank_giro"
                    value={formData.bank_giro || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.bank_giro || '-'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.bankIban')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="bank_iban"
                    value={formData.bank_iban || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.bank_iban || '-'}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                {isEditing ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="f_skatt_approved"
                      checked={formData.f_skatt_approved || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      data-cy="org-f-skatt-approved"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t('organization.fSkattApproved')}
                    </span>
                  </label>
                ) : (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('organization.fSkattApproved')}:{' '}
                    </span>
                    <span className="text-gray-900 dark:text-white" data-cy="org-f-skatt-approved">
                      {currentOrganization.f_skatt_approved ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Settings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('organization.setupWizard.step4')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.invoiceNumberPrefix')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="invoice_number_prefix"
                    value={formData.invoice_number_prefix || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    data-cy="invoice-prefix-input"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.invoice_number_prefix}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.defaultPaymentTerms')}
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="default_payment_terms"
                    value={formData.default_payment_terms || ''}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    data-cy="payment-terms-input"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.default_payment_terms} days
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.defaultCurrency')}
                </label>
                {isEditing ? (
                  <select
                    name="default_currency"
                    value={formData.default_currency || 'SEK'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="SEK">SEK</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.default_currency}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.defaultTaxRate')}
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="default_tax_rate"
                    value={formData.default_tax_rate || ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.default_tax_rate}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
                data-cy="save-organization"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
