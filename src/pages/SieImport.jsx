import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  parseSIE, 
  validateSIE, 
  prepareAccountsForImport, 
  prepareFiscalYearsForImport,
  prepareJournalEntriesForImport,
  getSieImportSummary,
  detectMissingFiscalYears,
} from '../utils/sieParser';
import { importAccounts, fetchAccounts, selectAccountsLoading } from '../features/accounts/accountsSlice';
import { importFiscalYears, fetchFiscalYears } from '../features/fiscalYears/fiscalYearsSlice';
import { importJournalEntries } from '../features/journalEntries/journalEntriesSlice';
import { useOrganization } from '../contexts/OrganizationContext';
import { Account } from '../services/resources/Account';
import { FiscalYear } from '../services/resources/FiscalYear';

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
    importFiscalYears: true,
    importJournalEntries: true,
    importOpeningBalances: true,
    skipExisting: true,
    createMissingFiscalYears: true, // Auto-create fiscal years needed for vouchers
  });
  const [importResult, setImportResult] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [missingFiscalYears, setMissingFiscalYears] = useState(null);
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
      const summary = getSieImportSummary(parsed);

      setParsedData(parsed);
      setValidation(validationResult);
      setImportSummary(summary);
      
      // Auto-enable import options based on available data
      setImportOptions((prev) => ({
        ...prev,
        importAccounts: summary.accounts.canImport,
        importFiscalYears: summary.fiscalYears.canImport,
        importJournalEntries: summary.vouchers.canImport,
        importOpeningBalances: summary.openingBalances.canImport,
      }));

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

  // Check for missing fiscal years when vouchers need to be imported
  const checkMissingFiscalYears = useCallback(async () => {
    if (!parsedData?.vouchers?.length || !currentOrganization?.id) {
      setMissingFiscalYears(null);
      return;
    }

    // Fetch existing fiscal years from the database
    const { data: existingFiscalYears } = await FiscalYear.index(currentOrganization.id);
    
    const result = detectMissingFiscalYears(
      parsedData.vouchers,
      existingFiscalYears || [],
      parsedData.fiscalYears || []
    );

    if (result.missingYears.length > 0) {
      setMissingFiscalYears(result);
    } else {
      setMissingFiscalYears(null);
    }
  }, [parsedData, currentOrganization]);

  // Proceed to preview (or org mismatch step)
  const handleProceedToPreview = async () => {
    const mismatch = checkOrgMismatch();
    if (mismatch) {
      setOrgMismatch(mismatch);
      setStep(STEPS.ORG_MISMATCH);
    } else {
      // Check for missing fiscal years before showing preview
      await checkMissingFiscalYears();
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
      // Note: checkMissingFiscalYears will be called but new org has no fiscal years
      // so it will show missing years from the SIE file
      await checkMissingFiscalYears();
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(t('sieImport.orgMismatch.createError', { message: err.message }));
      setCreatingOrg(false);
    }
  };

  // Handle using current organization despite mismatch
  const handleUseCurrent = async () => {
    setOrgMismatch(null);
    await checkMissingFiscalYears();
    setStep(STEPS.PREVIEW);
  };

  // Execute import
  const handleImport = async () => {
    if (!parsedData || !currentOrganization?.id) return;

    setStep(STEPS.IMPORT);
    setError(null);

    const results = {
      accounts: { imported: 0, skipped: 0 },
      fiscalYears: { imported: 0, skipped: 0 },
      journalEntries: { imported: 0, skipped: 0, errors: [] },
    };

    try {
      // 1. Import Accounts first (required for journal entries)
      if (importOptions.importAccounts && parsedData.accounts?.length > 0) {
        const accountsToImport = prepareAccountsForImport(
          parsedData.accounts,
          currentOrganization.id
        );

        const accountResult = await dispatch(
          importAccounts({
            organizationId: currentOrganization.id,
            accounts: accountsToImport,
            skipExisting: importOptions.skipExisting,
          })
        ).unwrap();

        results.accounts = {
          imported: accountResult.imported?.length || 0,
          skipped: accountResult.skipped || 0,
        };
      }

      // 2. Import Fiscal Years (required for journal entries)
      if (importOptions.importFiscalYears && parsedData.fiscalYears?.length > 0) {
        const fiscalYearsToImport = prepareFiscalYearsForImport(
          parsedData.fiscalYears,
          currentOrganization.id
        );

        const fyResult = await dispatch(
          importFiscalYears({
            fiscalYears: fiscalYearsToImport,
            skipExisting: importOptions.skipExisting,
          })
        ).unwrap();

        results.fiscalYears = {
          imported: fyResult.imported || 0,
          skipped: fyResult.skipped || 0,
        };
      }

      // 2b. Create missing fiscal years for journal entries (if user opted in)
      if (importOptions.importJournalEntries && 
          importOptions.createMissingFiscalYears && 
          missingFiscalYears?.missingYears?.length > 0) {
        
        // Filter to only years that can be created from SIE file
        const yearsToCreate = missingFiscalYears.missingYears
          .filter(y => y.inSieFile && y.sieFiscalYear)
          .map(y => y.sieFiscalYear);
        
        if (yearsToCreate.length > 0) {
          const fiscalYearsToImport = prepareFiscalYearsForImport(
            yearsToCreate,
            currentOrganization.id
          );

          const fyResult = await dispatch(
            importFiscalYears({
              fiscalYears: fiscalYearsToImport,
              skipExisting: true,
            })
          ).unwrap();

          results.fiscalYears = {
            imported: (results.fiscalYears?.imported || 0) + (fyResult.imported || 0),
            skipped: (results.fiscalYears?.skipped || 0) + (fyResult.skipped || 0),
          };
        }
      }

      // 3. Import Journal Entries (requires accounts and fiscal years)
      if (importOptions.importJournalEntries && parsedData.vouchers?.length > 0) {
        // Fetch fresh accounts from database to build accountMap
        await dispatch(fetchAccounts({ organizationId: currentOrganization.id, includeInactive: true }));
        
        // Fetch fresh fiscal years from database
        await dispatch(fetchFiscalYears(currentOrganization.id));
        
        // Get fresh data from the store
        // Note: We need to access the store state after dispatch completes
        // For now, we'll fetch directly from the database using the resources
        const { data: accountsData } = await Account.indexAll(currentOrganization.id);
        const { data: fiscalYearsData } = await FiscalYear.index(currentOrganization.id);
        
        // Build account map (account_number -> account_id)
        const accountMap = new Map();
        if (accountsData) {
          accountsData.forEach(account => {
            accountMap.set(account.account_number, account.id);
          });
        }
        
        // Build fiscal year map (year -> fiscal_year_id) based on date ranges
        // IMPORTANT: Use string keys since voucher.date.substring(0,4) returns a string
        const fiscalYearMap = new Map();
        if (fiscalYearsData) {
          fiscalYearsData.forEach(fy => {
            // Map by start year and end year (as strings for consistent lookup)
            const startYear = fy.start_date?.substring(0, 4);
            const endYear = fy.end_date?.substring(0, 4);
            // Store by year string - vouchers will be matched to the fiscal year containing their date
            if (startYear) {
              fiscalYearMap.set(startYear, fy.id);
            }
            if (endYear && endYear !== startYear) {
              fiscalYearMap.set(endYear, fy.id);
            }
            // Also store by full date range for exact matching
            fiscalYearMap.set(`${fy.start_date}_${fy.end_date}`, fy.id);
          });
        }

        // Prepare journal entries
        const { entries, errors } = prepareJournalEntriesForImport(
          parsedData.vouchers,
          currentOrganization.id,
          accountMap,
          fiscalYearMap
        );

        if (entries.length > 0) {
          const jeResult = await dispatch(
            importJournalEntries({
              entries,
              skipExisting: importOptions.skipExisting,
            })
          ).unwrap();

          results.journalEntries = {
            imported: jeResult.imported || 0,
            skipped: jeResult.skipped || 0,
            errors: [...errors, ...(jeResult.errors || [])],
          };
        } else {
          results.journalEntries.errors = errors;
        }
      }

      setImportResult(results);
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
    setImportSummary(null);
    setMissingFiscalYears(null);
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.fiscalYearCount')}</p>
                <p data-cy="fiscal-year-count" className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.fiscalYearCount}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.voucherCount')}</p>
                <p data-cy="voucher-count" className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.voucherCount}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sieImport.transactionCount')}</p>
                <p data-cy="transaction-count" className="text-lg font-medium text-gray-900 dark:text-white">
                  {validation.summary.transactionCount}
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

                {/* Fiscal Years Import Option */}
                {importSummary?.fiscalYearCount > 0 && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={importOptions.importFiscalYears}
                      onChange={(e) =>
                        setImportOptions((prev) => ({ ...prev, importFiscalYears: e.target.checked }))
                      }
                      data-cy="import-fiscal-years-checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                      {t('sieImport.importFiscalYearsOption', { count: importSummary.fiscalYearCount })}
                    </span>
                  </label>
                )}

                {/* Journal Entries Import Option */}
                {importSummary?.voucherCount > 0 && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={importOptions.importJournalEntries}
                      onChange={(e) =>
                        setImportOptions((prev) => ({ ...prev, importJournalEntries: e.target.checked }))
                      }
                      data-cy="import-journal-entries-checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                      {t('sieImport.importJournalEntriesOption', { 
                        voucherCount: importSummary.voucherCount,
                        transactionCount: importSummary.transactionCount 
                      })}
                    </span>
                  </label>
                )}

                {/* Opening Balances Import Option */}
                {importSummary?.openingBalanceCount > 0 && (
                  <label className="flex items-center ml-6">
                    <input
                      type="checkbox"
                      checked={importOptions.importOpeningBalances}
                      onChange={(e) =>
                        setImportOptions((prev) => ({ ...prev, importOpeningBalances: e.target.checked }))
                      }
                      disabled={!importOptions.importFiscalYears && !importOptions.importJournalEntries}
                      data-cy="import-opening-balances-checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className={`ml-2 ${!importOptions.importFiscalYears && !importOptions.importJournalEntries ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {t('sieImport.importOpeningBalancesOption', { count: importSummary.openingBalanceCount })}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Missing Fiscal Years Warning */}
            {missingFiscalYears?.missingYears?.length > 0 && importOptions.importJournalEntries && (
              <div
                data-cy="missing-fiscal-years-warning"
                className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm"
              >
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-yellow-800 dark:text-yellow-300 font-medium">
                      {t('sieImport.missingFiscalYears.warning')}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      {t('sieImport.missingFiscalYears.description')}
                    </p>
                    
                    {/* List of missing years */}
                    <div className="mt-3 space-y-1">
                      {missingFiscalYears.missingYears.map((missing) => (
                        <div key={missing.year} className="flex items-center text-sm">
                          <span className={`w-2 h-2 rounded-full mr-2 ${missing.inSieFile ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-yellow-800 dark:text-yellow-300">
                            {missing.year}
                            {missing.inSieFile && missing.sieFiscalYear && (
                              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                ({missing.sieFiscalYear.start} - {missing.sieFiscalYear.end})
                              </span>
                            )}
                          </span>
                          {missing.inSieFile ? (
                            <span className="ml-2 text-green-600 dark:text-green-400 text-xs">
                              {t('sieImport.missingFiscalYears.canCreate')}
                            </span>
                          ) : (
                            <span className="ml-2 text-red-600 dark:text-red-400 text-xs">
                              {t('sieImport.missingFiscalYears.notInFile')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Option to create missing fiscal years */}
                    {missingFiscalYears.canCreateFromSie && (
                      <label className="flex items-center mt-4">
                        <input
                          type="checkbox"
                          checked={importOptions.createMissingFiscalYears}
                          onChange={(e) =>
                            setImportOptions((prev) => ({ ...prev, createMissingFiscalYears: e.target.checked }))
                          }
                          data-cy="create-missing-fiscal-years-checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-yellow-800 dark:text-yellow-300 font-medium">
                          {t('sieImport.missingFiscalYears.createOption')}
                        </span>
                      </label>
                    )}

                    {/* Warning if not creating fiscal years */}
                    {!importOptions.createMissingFiscalYears && (
                      <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                        {t('sieImport.missingFiscalYears.skipWarning', { 
                          count: missingFiscalYears.missingYears.filter(y => y.inSieFile).length 
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

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
              <div className="text-gray-600 dark:text-gray-400 mb-6 space-y-1">
                {importResult.accounts && (importResult.accounts.imported > 0 || importResult.accounts.skipped > 0) && (
                  <>
                    <p data-cy="import-accounts-result">
                      {t('sieImport.importedCount', { count: importResult.accounts.imported })}
                    </p>
                    {importResult.accounts.skipped > 0 && (
                      <p>{t('sieImport.skippedCount', { count: importResult.accounts.skipped })}</p>
                    )}
                  </>
                )}
                {importResult.fiscalYears && importResult.fiscalYears.imported > 0 && (
                  <p data-cy="import-fiscal-years-result">
                    {t('sieImport.fiscalYearsImported', { count: importResult.fiscalYears.imported })}
                  </p>
                )}
                {importResult.journalEntries && importResult.journalEntries.imported > 0 && (
                  <p data-cy="import-journal-entries-result">
                    {t('sieImport.journalEntriesImported', { count: importResult.journalEntries.imported })}
                  </p>
                )}
                {importResult.journalEntries?.errors?.length > 0 && (
                  <div className="mt-4 text-left max-w-md mx-auto">
                    <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-2">
                      {t('sieImport.warnings')} ({importResult.journalEntries.errors.length}):
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside max-h-32 overflow-y-auto">
                      {importResult.journalEntries.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>
                          {typeof err === 'string' 
                            ? err 
                            : `${err.voucher || 'Unknown'}: ${err.error}`}
                        </li>
                      ))}
                      {importResult.journalEntries.errors.length > 10 && (
                        <li>...and {importResult.journalEntries.errors.length - 10} more</li>
                      )}
                    </ul>
                  </div>
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
