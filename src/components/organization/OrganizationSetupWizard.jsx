import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useOrganization } from '../../contexts/OrganizationContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ProficiencySelector from '../common/ProficiencySelector';
import FrameworkSelector from '../FrameworkSelector';
import KontoplanSelector from '../KontoplanSelector';
import { updateProficiency } from '../../features/auth/authSlice';

const OrganizationSetupWizard = ({ onClose, onComplete, isModal = false }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { createOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proficiencyLevel, setProficiencyLevel] = useState('basic');

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    organization_number: '',
    vat_number: '',
    estimated_annual_revenue: null,
    employee_count: null,
    f_skatt_approved: false,
    vat_registered: false,
    employer_tax_registered: false,
    
    // Step 2: Proficiency (determines wizard complexity)
    // Step 3: Accounting Framework (US-283, US-284, US-285, US-291)
    accounting_framework: 'k2',
    chart_of_accounts_variant: 'bas2024',
    accounting_method: 'accrual',
    
    // Step 4: Address & Contact
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

  // Check if a step has required fields filled
  const isStepComplete = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return formData.name.trim() !== '';
      case 2:
        return true; // Proficiency always complete
      case 3:
        return true; // Framework always has defaults
      case 4:
        return true; // Kontoplan always has defaults
      case 5:
        return formData.address.trim() !== '' && formData.city.trim() !== '' && formData.postal_code.trim() !== '';
      case 6:
        return true; // Banking optional
      case 7:
        return true; // Invoice settings have defaults
      default:
        return false;
    }
  };

  const isStepValid = (stepNumber) => {
    // Current step or earlier can be validated
    return stepNumber < step || isStepComplete(stepNumber);
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

      // US-124: Save proficiency level to user profile
      await dispatch(updateProficiency(proficiencyLevel)).unwrap();

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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="vat-number-input"
        />
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

        <div className="flex items-center">
          <input
            type="checkbox"
            name="vat_registered"
            checked={formData.vat_registered}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            data-cy="org-vat-registered-checkbox"
          />
          <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            {t('organization.vatRegistered')}
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="employer_tax_registered"
            checked={formData.employer_tax_registered}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            data-cy="org-employer-tax-checkbox"
          />
          <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            {t('organization.employerTaxRegistered')}
          </label>
        </div>
      </div>
    </div>
  );

  // US-291: Step 2 - Proficiency (asked early to adapt wizard)
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('proficiency.wizard.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('proficiency.wizard.adaptiveDescription')}
        </p>
      </div>
      
      <ProficiencySelector
        value={proficiencyLevel}
        onChange={setProficiencyLevel}
        showDescription={true}
      />
      
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
        {t('proficiency.wizard.canChangeLater')}
      </p>
    </div>
  );

  // US-291: Step 3 - Framework (adaptive based on proficiency)
  const renderStep3 = () => {
    const isNovice = proficiencyLevel === 'novice' || proficiencyLevel === 'basic';
    const isExpert = proficiencyLevel === 'advanced' || proficiencyLevel === 'expert';

    if (isNovice) {
      // Guided questionnaire for beginners
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('framework.simplified.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('framework.simplified.guidedDescription', 'Svara på några enkla frågor så hjälper vi dig att välja rätt inställningar.')}
            </p>
          </div>

          {/* Simple questions for novices */}
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 rounded-sm p-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('framework.questions.revenueQuestion', 'Hur stor omsättning förväntar du att ditt företag kommer ha per år?')}
              </label>
              <div className="space-y-2">
                <label className={`flex items-center p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                  formData.estimated_annual_revenue < 3000000 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="revenue_range"
                    checked={formData.estimated_annual_revenue < 3000000}
                    onChange={() => setFormData(prev => ({ ...prev, estimated_annual_revenue: 1000000 }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {t('framework.questions.revenueLow', 'Mindre än 3 miljoner SEK')}
                  </span>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                  formData.estimated_annual_revenue >= 3000000 && formData.estimated_annual_revenue < 80000000
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="revenue_range"
                    checked={formData.estimated_annual_revenue >= 3000000 && formData.estimated_annual_revenue < 80000000}
                    onChange={() => setFormData(prev => ({ ...prev, estimated_annual_revenue: 10000000 }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {t('framework.questions.revenueMedium', '3-80 miljoner SEK')}
                  </span>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                  formData.estimated_annual_revenue >= 80000000
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="revenue_range"
                    checked={formData.estimated_annual_revenue >= 80000000}
                    onChange={() => setFormData(prev => ({ ...prev, estimated_annual_revenue: 100000000 }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {t('framework.questions.revenueHigh', 'Mer än 80 miljoner SEK')}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('framework.questions.employeeQuestion', 'Hur många anställda har eller planerar ditt företag att ha?')}
              </label>
              <div className="space-y-2">
                <label className={`flex items-center p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                  formData.employee_count < 3
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="employee_count"
                    checked={formData.employee_count < 3}
                    onChange={() => setFormData(prev => ({ ...prev, employee_count: 1 }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {t('framework.questions.employeesNone', 'Ingen eller 1-2 personer')}
                  </span>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                  formData.employee_count >= 3 && formData.employee_count < 50
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="employee_count"
                    checked={formData.employee_count >= 3 && formData.employee_count < 50}
                    onChange={() => setFormData(prev => ({ ...prev, employee_count: 10 }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {t('framework.questions.employeesSmall', '3-50 anställda')}
                  </span>
                </label>

                <label className={`flex items-center p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                  formData.employee_count >= 50
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="employee_count"
                    checked={formData.employee_count >= 50}
                    onChange={() => setFormData(prev => ({ ...prev, employee_count: 100 }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    {t('framework.questions.employeesLarge', 'Fler än 50 anställda')}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Show recommendation based on answers */}
          {formData.estimated_annual_revenue > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  ✓
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {t('framework.simplified.recommendedSetup')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t('framework.simplified.basedOnAnswers', 'Baserat på dina svar rekommenderar vi:')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="font-medium">{t('framework.title')}:</span>
                  <span>
                    {formData.estimated_annual_revenue < 3000000 && formData.employee_count < 3 
                      ? 'K1 (Mikroföretag)' 
                      : formData.estimated_annual_revenue >= 80000000 
                      ? 'K3 (Större företag)'
                      : 'K2 (Små/medelstora företag)'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="font-medium">{t('kontoplan.title')}:</span>
                  <span>BAS 2024 (Standardkontoplan)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium">{t('accountingMethod.title')}:</span>
                  <span>
                    {formData.estimated_annual_revenue < 3000000 
                      ? t('accountingMethod.choiceAvailable', 'Fakturering eller Kontant (du kan välja)')
                      : t('accountingMethod.accrual.title')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
              {t('framework.simplified.showAdvancedOptions')}
            </summary>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-sm">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {t('framework.simplified.advancedWarning')}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('framework.selectFramework')}
                  </label>
                  <select
                    value={formData.accounting_framework}
                    onChange={(e) => setFormData(prev => ({ ...prev, accounting_framework: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700"
                    data-cy="framework-select-simple"
                  >
                    <option value="k2">K2 - {t('framework.k2.title')}</option>
                    <option value="k1">K1 - {t('framework.k1.title')}</option>
                    <option value="k3">K3 - {t('framework.k3.title')}</option>
                  </select>
                </div>

                {formData.estimated_annual_revenue < 3000000 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('accountingMethod.title')}
                    </label>
                    <select
                      value={formData.accounting_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, accounting_method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700"
                      data-cy="accounting-method-select-simple"
                    >
                      <option value="accrual">{t('accountingMethod.accrual.title')}</option>
                      <option value="cash">{t('accountingMethod.cash.title')}</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>
      );
    }

    // Full view for intermediate/advanced users
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('organization.setupWizard.companyInfo')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('organization.setupWizard.companyInfoDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.estimatedRevenue')}
            </label>
            <div className="relative">
              <input
                type="number"
                name="estimated_annual_revenue"
                value={formData.estimated_annual_revenue || ''}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                data-cy="estimated-revenue-input"
              />
              <span className="absolute right-3 top-2 text-gray-500 dark:text-gray-400 text-sm">
                SEK/år
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('organization.estimatedRevenueHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.employeeCount')}
            </label>
            <input
              type="number"
              name="employee_count"
              value={formData.employee_count || ''}
              onChange={handleChange}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              data-cy="employee-count-input"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('organization.employeeCountHelp')}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            {t('framework.selectFramework')}
          </h4>
          <FrameworkSelector
            value={formData.accounting_framework}
            onChange={(value) => setFormData(prev => ({ ...prev, accounting_framework: value }))}
            companyInfo={{
              revenue: formData.estimated_annual_revenue,
              employees: formData.employee_count,
              isListed: false
            }}
            showRecommendation={true}
          />
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            {t('framework.accountingMethod')}
          </h4>
          <div className="space-y-3">
            <label className={`flex items-start p-4 border-2 rounded-sm cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              formData.accounting_method === 'accrual' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <input
                type="radio"
                name="accounting_method"
                value="accrual"
                checked={formData.accounting_method === 'accrual'}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                data-cy="method-accrual"
              />
              <div className="ml-3 flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {t('accountingMethod.accrual.title')}
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">{t('common.recommended')}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('accountingMethod.accrual.description')}
                </div>
              </div>
            </label>

            <label className={`flex items-start p-4 border-2 rounded-sm cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              formData.accounting_method === 'cash' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <input
                type="radio"
                name="accounting_method"
                value="cash"
                checked={formData.accounting_method === 'cash'}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                data-cy="method-cash"
                disabled={formData.estimated_annual_revenue >= 3000000}
              />
              <div className="ml-3 flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {t('accountingMethod.cash.title')}
                  {formData.estimated_annual_revenue >= 3000000 && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({t('common.notEligible')})</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('accountingMethod.cash.description')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    );
  };

  // Step 4 - Kontoplan (adaptive based on proficiency)
  const renderStep4 = () => {
    const isNovice = proficiencyLevel === 'novice' || proficiencyLevel === 'basic';

    if (isNovice) {
      // Simplified view with option to show alternatives
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('kontoplan.simplified.allSet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('kontoplan.simplified.usingStandard')}
            </p>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline text-center">
              {t('framework.simplified.showAdvancedOptions')}
            </summary>
            <div className="mt-4">
              <KontoplanSelector
                value={formData.chart_of_accounts_variant}
                onChange={(value) => setFormData(prev => ({ ...prev, chart_of_accounts_variant: value }))}
                showDescription={true}
              />
            </div>
          </details>
        </div>
      );
    }

    // Full kontoplan selection for intermediate/advanced
    return (
      <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('kontoplan.selectTitle')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('kontoplan.selectDescription')}
        </p>
      </div>

      <KontoplanSelector
        value={formData.chart_of_accounts_variant}
        onChange={(value) => setFormData(prev => ({ ...prev, chart_of_accounts_variant: value }))}
      />
    </div>
    );
  };

  const renderStep5 = () => (
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-phone-input"
        />
      </div>
    </div>
  );

  const renderStep6 = () => (
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          data-cy="org-iban-input"
        />
      </div>
    </div>
  );

  const renderStep7 = () => (
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      default:
        return null;
    }
  };

  const totalSteps = 7;

  const stepTitles = [
    t('organization.setupWizard.step1'),
    t('organization.setupWizard.step2'),
    t('organization.setupWizard.step3'),
    t('organization.setupWizard.step4'),
    t('organization.setupWizard.step5'),
    t('organization.setupWizard.step6'),
    t('organization.setupWizard.step7'),
  ];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-cy="organization-wizard">
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
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
          {/* Mobile: Simple step counter */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {stepTitles[step - 1]}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {step} / {totalSteps}
            </span>
          </div>
          
          {/* Desktop: Step circles with current step title */}
          <div className="hidden lg:block">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {stepTitles[step - 1]}
              </h3>
            </div>
            <div className="flex items-center justify-between mb-3">
              {stepTitles.map((title, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${
                        step > index + 1
                          ? isStepComplete(index + 1)
                            ? 'bg-green-600 text-white'
                            : 'bg-red-500 text-white'
                          : step === index + 1
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                      title={title}
                    >
                      {step > index + 1 ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>
                  {/* Connector line */}
                  {index < totalSteps - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        step > index + 1
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
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

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
              disabled={loading || !isStepComplete(step)}
              data-cy="next-step-button"
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
              disabled={loading || !isStepComplete(step)}
              data-cy="complete-setup-button"
            >
              {loading ? t('common.saving') : t('organization.setupWizard.complete')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrganizationSetupWizard;
