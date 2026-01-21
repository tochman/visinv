import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../contexts/OrganizationContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

const OrganizationSetupWizard = ({ onClose, onComplete }) => {
  const { t } = useTranslation();
  const { createOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    organization_number: '',
    vat_number: '',
    
    // Step 2: Address & Contact
    address: '',
    city: '',
    postal_code: '',
    municipality: '',
    country: 'Sweden',
    email: '',
    phone: '',
    website: '',
    
    // Step 3: Banking & Tax
    bank_account: '',
    bank_giro: '',
    plus_giro: '',
    bank_iban: '',
    bank_bic: '',
    f_skatt_approved: false,
    
    // Step 4: Invoice Settings
    invoice_number_prefix: 'INV',
    next_invoice_number: 1,
    default_payment_terms: 30,
    default_currency: 'SEK',
    default_tax_rate: 25.00,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNext = () => {
    setError(null);
    
    // Validation for step 1
    if (step === 1) {
      if (!formData.name.trim()) {
        setError(t('validation.required', { field: t('organization.name') }));
        return;
      }
    }
    
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: createError } = await createOrganization(formData);
      
      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      if (onComplete) {
        onComplete(data);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.name')} *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-name-input"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.organizationNumber')}
        </label>
        <input
          type="text"
          name="organization_number"
          value={formData.organization_number}
          onChange={handleChange}
          placeholder="XXXXXX-XXXX"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-number-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.vatNumber')}
        </label>
        <input
          type="text"
          name="vat_number"
          value={formData.vat_number}
          onChange={handleChange}
          placeholder="SE123456789001"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="vat-number-input"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.address')}
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-address-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.postalCode')}
          </label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-cy="org-postal-code-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.city')}
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-cy="org-city-input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.municipality')}
        </label>
        <input
          type="text"
          name="municipality"
          value={formData.municipality}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-municipality-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.email')}
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-email-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.phone')}
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-phone-input"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.bankGiro')}
        </label>
        <input
          type="text"
          name="bank_giro"
          value={formData.bank_giro}
          onChange={handleChange}
          placeholder="XXX-XXXX"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-bank-giro-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.plusGiro')}
        </label>
        <input
          type="text"
          name="plus_giro"
          value={formData.plus_giro}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-plus-giro-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.bankIban')}
        </label>
        <input
          type="text"
          name="bank_iban"
          value={formData.bank_iban}
          onChange={handleChange}
          placeholder="SE00 0000 0000 0000 0000 0000"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-iban-input"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="f_skatt_approved"
          checked={formData.f_skatt_approved}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          data-cy="org-f-skatt-checkbox"
        />
        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          {t('organization.fSkattApproved')}
        </label>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.invoiceNumberPrefix')}
          </label>
          <input
            type="text"
            name="invoice_number_prefix"
            value={formData.invoice_number_prefix}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-cy="org-invoice-prefix-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.nextInvoiceNumber')}
          </label>
          <input
            type="number"
            name="next_invoice_number"
            value={formData.next_invoice_number}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-cy="org-next-invoice-number-input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('organization.defaultPaymentTerms')}
        </label>
        <input
          type="number"
          name="default_payment_terms"
          value={formData.default_payment_terms}
          onChange={handleChange}
          min="1"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-payment-terms-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.defaultCurrency')}
          </label>
          <select
            name="default_currency"
            value={formData.default_currency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-cy="org-currency-select"
          >
            <option value="SEK">SEK - Swedish Krona</option>
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - British Pound</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.defaultTaxRate')}
          </label>
          <input
            type="number"
            name="default_tax_rate"
            value={formData.default_tax_rate}
            onChange={handleChange}
            step="0.01"
            min="0"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            data-cy="org-tax-rate-input"
          />
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const stepTitles = [
    t('organization.setupWizard.step1'),
    t('organization.setupWizard.step2'),
    t('organization.setupWizard.step3'),
    t('organization.setupWizard.step4'),
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-cy="organization-wizard">
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('organization.setupWizard.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('organization.setupWizard.subtitle')}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between mb-2">
            {stepTitles.map((title, index) => (
              <div
                key={index}
                className={`text-sm font-medium ${
                  step > index + 1
                    ? 'text-blue-600 dark:text-blue-400'
                    : step === index + 1
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {title}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          {renderStepContent()}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            disabled={loading}
            data-cy="back-button"
          >
            {step === 1 ? t('common.cancel') : t('common.back')}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              disabled={loading}
              data-cy="next-step-button"
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
              disabled={loading}
              data-cy="complete-setup-button"
            >
              {loading ? t('common.saving') : t('organization.setupWizard.complete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetupWizard;
