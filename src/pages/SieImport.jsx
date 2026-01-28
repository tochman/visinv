import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { parseSIE, validateSIE, prepareAccountsForImport } from '../utils/sieParser';
import { importAccounts, selectAccountsLoading } from '../features/accounts/accountsSlice';
import { useOrganization } from '../contexts/OrganizationContext';

/**
 * Calculate Swedish VAT number from organization number
 * Organization number format: nnnnnn-nnnn (e.g., 556789-0123)
 * VAT number format: SEnnnnnnnnnn01 (e.g., SE556789012301)
 */
const calculateVatNumber = (orgNumber) => {
  if (!orgNumber) return null;
  // Remove hyphen and any whitespace
  const cleaned = orgNumber.replace(/[-\s]/g, '');
  // Swedish VAT numbers are SE + 10 digits + 01
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `SE${cleaned}01`;
  }
  return null;
};

// Wizard steps
const STEPS = {
  UPLOAD: 'upload',
  VALIDATE: 'validate',
  ORG_MISMATCH: 'org_mismatch',
  PREVIEW: 'preview',
  IMPORT: 'import',
  COMPLETE: 'complete',
};

export default function SieImport() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentOrganization, createOrganization } = useOrganization();
  const loading = useSelector(selectAccountsLoading);

  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importOptions, setImportOptions] = useState({
    importAccounts: true,
    skipExisting: true,
  });
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [orgMismatch, setOrgMismatch] = useState(null);
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file extension
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['sie', 'se'].includes(ext)) {
      setError(t('sieImport.invalidFileType'));
      return;
    }

    setFile(selectedFile);
    setError(null);
    setParsedData(null);
    setValidation(null);
  }, [t]);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (!['sie', 'se'].includes(ext)) {
        setError(t('sieImport.invalidFileType'));
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  }, [t]);

  // Parse and validate file
  const handleParseFile = async () => {
    if (!file) return;

    setError(null);

    try {
      const content = await file.text();
      const parsed = parseSIE(content, file.name);
      const validationResult = validateSIE(parsed);

      setParsedData(parsed);
      setValidation(validationResult);
      setStep(STEPS.VALIDATE);
    } catch (err) {
      setError(t('sieImport.parseError', { message: err.message }));
    }
  };

  // Check for organization mismatch
  const checkOrgMismatch = useCallback(() => {
    if (!parsedData?.company || !currentOrganization) {
      return null;
    }

    const sieOrgName = parsedData.company.name?.trim().toLowerCase();
    const sieOrgNumber = parsedData.company.organizationNumber?.trim();
    const currentOrgName = currentOrganization.name?.trim().toLowerCase();
    const currentOrgNumber = currentOrganization.organization_number?.trim();

    // No mismatch if SIE file has no org info
    if (!sieOrgName && !sieOrgNumber) {
      return null;
    }

    // Check for mismatch by org number first (most reliable)
    if (sieOrgNumber && currentOrgNumber && sieOrgNumber !== currentOrgNumber) {
      return {
        type: 'org_number',
        sieName: parsedData.company.name,
        sieOrgNumber: parsedData.company.organizationNumber,
        currentName: currentOrganization.name,
        currentOrgNumber: currentOrganization.organization_number,
      };
    }

    // SIE has org number but current org doesn't - offer to create new org
    if (sieOrgNumber && !currentOrgNumber) {
      return {
        type: 'org_number',
        sieName: parsedData.company.name,
        sieOrgNumber: parsedData.company.organizationNumber,
        currentName: currentOrganization.name,
        currentOrgNumber: currentOrganization.organization_number,
      };
    }

    // Check for mismatch by name if no org numbers
    if (!currentOrgNumber && !sieOrgNumber && sieOrgName && currentOrgName && sieOrgName !== currentOrgName) {
      return {
        type: 'name',
        sieName: parsedData.company.name,
        sieOrgNumber: parsedData.company.organizationNumber,
        currentName: currentOrganization.name,
        currentOrgNumber: currentOrganization.organization_number,
      };
    }

    return null;
  }, [parsedData, currentOrganization]);

  // Proceed to preview (or org mismatch step)
  const handleProceedToPreview = () => {
    const mismatch = checkOrgMismatch();
    if (mismatch) {
      setOrgMismatch(mismatch);
      setStep(STEPS.ORG_MISMATCH);
    } else {
      setStep(STEPS.PREVIEW);
    }
  };

  // Handle creating new organization from SIE data
  const handleCreateOrgFromSie = async () => {
    if (!parsedData?.company) return;

    setCreatingOrg(true);
    setError(null);

    try {
      const orgNumber = parsedData.company.organizationNumber || '000000-0000';
      const newOrgData = {
        name: parsedData.company.name || 'Imported Organization',
        organization_number: orgNumber,
        vat_number: calculateVatNumber(orgNumber) || 'SE000000000001',
        // Default values for required fields (can be updated later in settings)
        address: '-',
        city: '-',
        postal_code: '00000',
        municipality: '-',
        email: 'update@example.com',
        country: 'Sweden',
      };

      // Add address if available from SIE
      if (parsedData.company.address && parsedData.company.address.length > 0) {
        const [_contactName, street, postalCity] = parsedData.company.address;
        if (street) {
          newOrgData.address = street;
        }
        if (postalCity) {
          // Try to parse "POSTAL_CODE CITY" format
          const postalMatch = postalCity.match(/^(\d{3}\s?\d{2})\s+(.+)$/);
          if (postalMatch) {
            newOrgData.postal_code = postalMatch[1];
            newOrgData.city = postalMatch[2];
          } else {
            newOrgData.city = postalCity;
          }
        }
      }

      const { error: createError } = await createOrganization(newOrgData);

      if (createError) {
        setError(t('sieImport.orgMismatch.createError', { message: createError.message }));
        setCreatingOrg(false);
        return;
      }

      // Organization created and context automatically switched to it
      setOrgMismatch(null);
      setCreatingOrg(false);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(t('sieImport.orgMismatch.createError', { message: err.message }));
      setCreatingOrg(false);
    }
  };

  // Handle using current organization despite mismatch
  const handleUseCurrent = () => {
    setOrgMismatch(null);
    setStep(STEPS.PREVIEW);
  };

  // Execute import
  const handleImport = async () => {
    if (!parsedData || !currentOrganization?.id) return;

    setStep(STEPS.IMPORT);
    setError(null);

    try {
      if (importOptions.importAccounts && parsedData.accounts?.length > 0) {
        const accountsToImport = prepareAccountsForImport(
          parsedData.accounts,
          currentOrganization.id
        );

        const result = await dispatch(
          importAccounts({
            organizationId: currentOrganization.id,
            accounts: accountsToImport,
            skipExisting: importOptions.skipExisting,
          })
        ).unwrap();

        setImportResult(result);
      }

      setStep(STEPS.COMPLETE);
    } catch (err) {
      setError(err.message || t('sieImport.importError'));
      setStep(STEPS.PREVIEW);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setParsedData(null);
    setValidation(null);
    setImportResult(null);
    setError(null);
    setOrgMismatch(null);
    setCreatingOrg(false);
  };

  // Go to accounts page
  const handleGoToAccounts = () => {
    navigate('/accounts');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          data-cy="sie-import-page-title"
          className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
        >
          {t('sieImport.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{t('sieImport.description')}</p>
      </div>

      {/* Progress Steps - only show main steps (not org_mismatch) */}
      <div className="mb-8">
        {(() => {
          const visibleSteps = [STEPS.UPLOAD, STEPS.VALIDATE, STEPS.PREVIEW, STEPS.IMPORT, STEPS.COMPLETE];
          // Map current step to visible step for progress calculation
          const currentVisibleStep = step === STEPS.ORG_MISMATCH ? STEPS.VALIDATE : step;
          const currentIndex = visibleSteps.indexOf(currentVisibleStep);

          return (
            <>
              <div className="flex items-center justify-between">
                {visibleSteps.map((s, index) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        s === currentVisibleStep
                          ? 'bg-blue-600 text-white'
                          : currentIndex > index
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {currentIndex > index ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < visibleSteps.length - 1 && (
                      <div
                        className={`w-16 h-1 mx-2 ${
                          currentIndex > index ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{t('sieImport.steps.upload')}</span>
                <span>{t('sieImport.steps.validate')}</span>
                <span>{t('sieImport.steps.preview')}</span>
                <span>{t('sieImport.steps.import')}</span>
                <span>{t('sieImport.steps.complete')}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Error Display */}
      {error && (
        <div
          data-cy="sie-import-error"
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm"
        >
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-6">
        {/* UPLOAD Step */}
        {step === STEPS.UPLOAD && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('sieImport.uploadTitle')}
            </h2>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              data-cy="sie-drop-zone"
              className={`border-2 border-dashed rounded-sm p-12 text-center transition-colors ${
                file
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
              }`}
            >
              {file ? (
                <div>
                  <svg
                    className="w-12 h-12 mx-auto text-green-500 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="mt-4 text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    {t('sieImport.removeFile')}
                  </button>
                </div>
              ) : (
                <div>
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('sieImport.dropHere')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('sieImport.supportedFormats')}
                  </p>
                  <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 cursor-pointer">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    {t('sieImport.selectFile')}
                    <input
                      type="file"
                      accept=".sie,.se"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-cy="sie-file-input"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleParseFile}
                disabled={!file}
                data-cy="parse-file-button"
                className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('sieImport.parseFile')}
              </button>
            </div>
          </div>
        )}

        {/* VALIDATE Step */}
        {step === STEPS.VALIDATE && validation && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('sieImport.validationTitle')}
            </h2>

            {/* Validation Status */}
            <div
              data-cy="validation-status"
              className={`p-4 rounded-sm mb-6 ${
                validation.isValid
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center">
                {validation.isValid ? (
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span
                  className={`font-medium ${
                    validation.isValid
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {validation.isValid ? t('sieImport.validationPassed') : t('sieImport.validationFailed')}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.format')}</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.format}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.company')}</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.company || '-'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.accountCount')}</p>
                <p data-cy="account-count" className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.accountCount}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.voucherCount')}</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.voucherCount}
                </p>
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  {t('sieImport.errors')}
                </h3>
                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                  {t('sieImport.warnings')}
                </h3>
                <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                  {validation.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handleReset}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleProceedToPreview}
                disabled={!validation.isValid}
                data-cy="proceed-to-preview-button"
                className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}

        {/* ORG_MISMATCH Step */}
        {step === STEPS.ORG_MISMATCH && orgMismatch && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('sieImport.orgMismatch.title')}
            </h2>

            {/* Warning Banner */}
            <div
              data-cy="org-mismatch-warning"
              className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm"
            >
              <div className="flex items-start">
                <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                    {t('sieImport.orgMismatch.warning')}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    {t('sieImport.orgMismatch.description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              {/* SIE File Organization */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
                  {t('sieImport.orgMismatch.sieFileOrg')}
                </h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">{t('sieImport.orgMismatch.name')}</dt>
                    <dd data-cy="sie-org-name" className="text-gray-900 dark:text-white font-medium">
                      {orgMismatch.sieName || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">{t('sieImport.orgMismatch.orgNumber')}</dt>
                    <dd data-cy="sie-org-number" className="text-gray-900 dark:text-white font-medium">
                      {orgMismatch.sieOrgNumber || '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Current Organization */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-sm">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-300 mb-3">
                  {t('sieImport.orgMismatch.currentOrg')}
                </h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">{t('sieImport.orgMismatch.name')}</dt>
                    <dd data-cy="current-org-name" className="text-gray-900 dark:text-white font-medium">
                      {orgMismatch.currentName || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">{t('sieImport.orgMismatch.orgNumber')}</dt>
                    <dd data-cy="current-org-number" className="text-gray-900 dark:text-white font-medium">
                      {orgMismatch.currentOrgNumber || '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCreateOrgFromSie}
                disabled={creatingOrg}
                data-cy="create-new-org-button"
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingOrg ? (
                  <>
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('sieImport.orgMismatch.creating')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('sieImport.orgMismatch.createNew')}
                  </>
                )}
              </button>

              <button
                onClick={handleUseCurrent}
                disabled={creatingOrg}
                data-cy="use-current-org-button"
                className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {t('sieImport.orgMismatch.useCurrent')}
              </button>

              <button
                onClick={handleReset}
                disabled={creatingOrg}
                className="w-full px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW Step */}
        {step === STEPS.PREVIEW && parsedData && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('sieImport.previewTitle')}
            </h2>

            {/* Import Options */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('sieImport.importOptions')}
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={importOptions.importAccounts}
                    onChange={(e) =>
                      setImportOptions((prev) => ({ ...prev, importAccounts: e.target.checked }))
                    }
                    data-cy="import-accounts-checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {t('sieImport.importAccountsOption', { count: parsedData.accounts?.length || 0 })}
                  </span>
                </label>
                <label className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    checked={importOptions.skipExisting}
                    onChange={(e) =>
                      setImportOptions((prev) => ({ ...prev, skipExisting: e.target.checked }))
                    }
                    data-cy="skip-existing-checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {t('sieImport.skipExistingOption')}
                  </span>
                </label>
              </div>
            </div>

            {/* Accounts Preview */}
            {importOptions.importAccounts && parsedData.accounts?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {t('sieImport.accountsPreview')}
                </h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-sm">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {t('accounts.accountNumber')}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {t('accounts.accountName')}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {t('accounts.class')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {parsedData.accounts.slice(0, 50).map((account, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">
                            {account.account_number}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            {account.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {t(`accounts.classes.${account.account_class}`)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.accounts.length > 50 && (
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                      {t('sieImport.andMoreAccounts', { count: parsedData.accounts.length - 50 })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(STEPS.VALIDATE)}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleImport}
                disabled={!importOptions.importAccounts || loading}
                data-cy="import-button"
                className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('sieImport.importing') : t('sieImport.startImport')}
              </button>
            </div>
          </div>
        )}

        {/* IMPORT Step (Loading) */}
        {step === STEPS.IMPORT && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {t('sieImport.importingData')}
            </p>
            <p className="text-gray-500 dark:text-gray-400">{t('sieImport.pleaseWait')}</p>
          </div>
        )}

        {/* COMPLETE Step */}
        {step === STEPS.COMPLETE && (
          <div className="text-center py-8">
            <svg
              className="w-16 h-16 mx-auto text-green-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('sieImport.importComplete')}
            </h2>

            {importResult && (
              <div className="text-gray-600 dark:text-gray-400 mb-6">
                <p data-cy="import-result">
                  {t('sieImport.importedCount', { count: importResult.imported?.length || 0 })}
                </p>
                {importResult.skipped > 0 && (
                  <p>{t('sieImport.skippedCount', { count: importResult.skipped })}</p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
              >
                {t('sieImport.importAnother')}
              </button>
              <button
                onClick={handleGoToAccounts}
                data-cy="go-to-accounts-button"
                className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
              >
                {t('sieImport.viewAccounts')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
