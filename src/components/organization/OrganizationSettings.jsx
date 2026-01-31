import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Organization } from '../../services/resources/Organization';
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const { currentOrganization, updateOrganization, refreshOrganizations } = useOrganization();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    mode: 'onSubmit',
    defaultValues: currentOrganization || {}
  });

  // Update form when organization changes
  useEffect(() => {
    if (currentOrganization) {
      reset(currentOrganization);
    }
  }, [currentOrganization, reset]);

  // Re-initialize form when entering edit mode
  useEffect(() => {
    if (isEditing && currentOrganization) {
      setTimeout(() => {
        reset(currentOrganization);
      }, 0);
    }
  }, [isEditing, currentOrganization, reset]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset(currentOrganization);
    setError(null);
    setSuccessMessage('');
  };

  const onSubmit = async (data) => {
    setError(null);
    setSaving(true);

    // Remove fields that don't belong to the organizations table
    const { role, is_default, joined_at, ...organizationData } = data;

    const { error: updateError } = await updateOrganization(currentOrganization.id, organizationData);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(t('organization.saved'));
    setTimeout(() => setSuccessMessage(''), 3000);
    setIsEditing(false);
    setSaving(false);
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);
    setSuccessMessage('');

    const { data, error: uploadError } = await Organization.uploadLogoImage(currentOrganization.id, file);

    if (uploadError) {
      setError(uploadError.message || t('organization.logoUploadError'));
    } else {
      setSuccessMessage(t('organization.logoUploadSuccess'));
      // Refresh organization context to get the new logo_url
      await refreshOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    }

    setUploadingLogo(false);
    
    // Reset file input
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    if (!window.confirm(t('organization.confirmDeleteLogo'))) {
      return;
    }

    setUploadingLogo(true);
    setError(null);
    setSuccessMessage('');

    const { data, error: deleteError } = await Organization.deleteLogoImage(currentOrganization.id);

    if (deleteError) {
      setError(deleteError.message || t('organization.logoDeleteError'));
    } else {
      setSuccessMessage(t('organization.logoDeleteSuccess'));
      // Refresh organization context to update logo_url
      await refreshOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    }

    setUploadingLogo(false);
  };

  if (!currentOrganization) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm p-6">
        <p className="text-yellow-800 dark:text-yellow-200">{t('organization.noOrganization')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
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
      )}
      
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded" data-cy="success-message">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-4 sm:p-6">
          {/* Responsive two-column layout: stacked on mobile, side-by-side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6">
            {/* Left Column: Logo Section */}
            <div className="lg:border-r lg:border-gray-200 lg:dark:border-gray-700 lg:pr-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('organization.logo')}
              </h2>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {/* Logo Display */}
                <div className="flex-shrink-0">
                  {currentOrganization?.logo_url ? (
                    <div className="w-24 h-24 border-2 border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 p-2 flex items-center justify-center">
                      <img
                        src={currentOrganization.logo_url}
                        alt={currentOrganization.name}
                        className="max-w-full max-h-full object-contain"
                        data-cy="organization-logo-image"
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm flex items-center justify-center bg-gray-50 dark:bg-gray-700"
                      data-cy="organization-logo-placeholder"
                    >
                      <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Logo Controls */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('organization.logoHint')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    {t('organization.logoWillAppear')}
                  </p>

                  <div className="flex justify-center sm:justify-start space-x-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                      data-cy="organization-logo-input"
                    />

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      title={currentOrganization?.logo_url ? t('organization.changeLogo') : t('organization.uploadLogo')}
                      className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-sm transition-colors"
                      data-cy="organization-upload-logo-button"
                    >
                      <ArrowUpTrayIcon className="w-5 h-5" />
                    </button>

                    {currentOrganization?.logo_url && (
                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        disabled={uploadingLogo}
                        title={t('organization.removeLogo')}
                        className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-sm transition-colors"
                        data-cy="organization-remove-logo-button"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('organization.setupWizard.step1')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('organization.name')} *
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        {...register('name', { 
                          required: 'Företagsnamn är obligatoriskt',
                          validate: value => (value?.trim() ? true : 'Företagsnamn är obligatoriskt')
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        data-cy="org-name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-org-name">{errors.name.message}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-900 dark:text-white py-2">{currentOrganization.name}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('organization.organizationNumber')} *
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        {...register('organization_number', { 
                          required: 'Organisationsnummer är obligatoriskt enligt Aktiebolagslagen',
                          validate: value => (value?.trim() ? true : 'Organisationsnummer är obligatoriskt enligt Aktiebolagslagen')
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        data-cy="org-number"
                      />
                      {errors.organization_number && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-org-number">{errors.organization_number.message}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-900 dark:text-white py-2">
                      {currentOrganization.organization_number || '-'}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('organization.vatNumber')} *
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        {...register('vat_number', { 
                          required: 'Momsregistreringsnummer är obligatoriskt enligt Mervärdesskattelagen',
                          validate: value => (value?.trim() ? true : 'Momsregistreringsnummer är obligatoriskt enligt Mervärdesskattelagen')
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        data-cy="org-vat"
                      />
                      {errors.vat_number && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-vat-number">{errors.vat_number.message}</p>
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
          </div>

          {/* Full-width sections below */}
          <div className="space-y-6">
          {/* Address & Contact */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('organization.setupWizard.step2')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.address')} *
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      {...register('address', { 
                        required: 'Adress är obligatorisk',
                        validate: value => (value?.trim() ? true : 'Adress är obligatorisk')
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-address"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-address">{errors.address.message}</p>
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
                  {t('organization.city')} *
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      {...register('city', { 
                        required: 'Stad är obligatorisk',
                        validate: value => (value?.trim() ? true : 'Stad är obligatorisk')
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-city"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-city">{errors.city.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.city || '-'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.postalCode')} *
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      {...register('postal_code', { 
                        required: 'Postnummer är obligatoriskt',
                        validate: value => (value?.trim() ? true : 'Postnummer är obligatoriskt')
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-postal-code"
                    />
                    {errors.postal_code && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-postal-code">{errors.postal_code.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">{currentOrganization.postal_code || '-'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.municipality')} *
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      {...register('municipality', { 
                        required: 'Kommun är obligatoriskt enligt Aktiebolagslagen',
                        validate: value => (value?.trim() ? true : 'Kommun är obligatoriskt enligt Aktiebolagslagen')
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-municipality"
                    />
                    {errors.municipality && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-municipality">{errors.municipality.message}</p>
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
                  {t('organization.email')} *
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'E-post är obligatoriskt',
                        validate: value => (value?.trim() ? true : 'E-post är obligatoriskt'),
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Ogiltig e-postadress'
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      data-cy="org-email"
                      required
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-cy="error-email">{errors.email.message}</p>
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
                    {...register('phone')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                    {...register('bank_giro')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                    {...register('bank_iban')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                      {...register('f_skatt_approved')}
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
                    {...register('invoice_number_prefix')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                  {t('organization.invoiceNumberingMode')}
                </label>
                {isEditing ? (
                  <select
                    {...register('invoice_numbering_mode')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    data-cy="invoice-numbering-mode-select"
                  >
                    <option value="automatic">{t('organization.numberingModes.automatic')}</option>
                    <option value="manual">{t('organization.numberingModes.manual')}</option>
                  </select>
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {t(`organization.numberingModes.${currentOrganization.invoice_numbering_mode || 'automatic'}`)}
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
                    {...register('default_payment_terms', { valueAsNumber: true })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    data-cy="payment-terms-input"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white py-2">
                    {currentOrganization.default_payment_terms} {t('common.days')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('organization.defaultCurrency')}
                </label>
                {isEditing ? (
                  <select
                    {...register('default_currency')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                    {...register('default_tax_rate', { valueAsNumber: true })}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
                data-cy="save-organization"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}
          </div>
        </div>
      </form>
    </div>
  );
}
