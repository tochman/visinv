import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchIncomeStatement,
  clearIncomeStatement,
  selectIncomeStatementData,
  selectIncomeStatementLoading,
  selectIncomeStatementError,
} from '../features/financialReports/financialReportsSlice';
import {
  fetchFiscalYears,
  selectFiscalYears,
  selectSelectedFiscalYearId,
  setSelectedFiscalYear,
} from '../features/fiscalYears/fiscalYearsSlice';
import { useOrganization } from '../contexts/OrganizationContext';

/**
 * Income Statement Page - US-231
 * Resultaträkning following Swedish ÅRL format
 */
export default function IncomeStatement() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();

  // Redux state
  const incomeStatement = useSelector(selectIncomeStatementData);
  const loading = useSelector(selectIncomeStatementLoading);
  const error = useSelector(selectIncomeStatementError);
  const fiscalYears = useSelector(selectFiscalYears);
  const selectedFiscalYearId = useSelector(selectSelectedFiscalYearId);

  // Local state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showComparative, setShowComparative] = useState(false);
  const [comparativeStartDate, setComparativeStartDate] = useState('');
  const [comparativeEndDate, setComparativeEndDate] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Load fiscal years on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchFiscalYears(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id]);

  // Set default dates based on fiscal year
  useEffect(() => {
    if (selectedFiscalYearId && fiscalYears.length > 0) {
      const fy = fiscalYears.find((f) => f.id === selectedFiscalYearId);
      if (fy) {
        setStartDate(fy.start_date);
        setEndDate(fy.end_date);
        // Set comparative dates to previous year
        const prevYear = fiscalYears.find((f) => 
          new Date(f.end_date) < new Date(fy.start_date)
        );
        if (prevYear) {
          setComparativeStartDate(prevYear.start_date);
          setComparativeEndDate(prevYear.end_date);
        }
      }
    } else if (!startDate && !endDate) {
      // Default to current year
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1);
      setStartDate(yearStart.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  }, [selectedFiscalYearId, fiscalYears, startDate, endDate]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      dispatch(clearIncomeStatement());
    };
  }, [dispatch]);

  // Fetch income statement when dates change
  useEffect(() => {
    if (currentOrganization?.id && startDate && endDate) {
      dispatch(
        fetchIncomeStatement({
          organizationId: currentOrganization.id,
          startDate,
          endDate,
          comparativeStartDate: showComparative ? comparativeStartDate : null,
          comparativeEndDate: showComparative ? comparativeEndDate : null,
          fiscalYearId: selectedFiscalYearId,
        })
      );
    }
  }, [dispatch, currentOrganization?.id, startDate, endDate, showComparative, comparativeStartDate, comparativeEndDate, selectedFiscalYearId]);

  // Get name based on language
  const getName = (item) => {
    if (i18n.language === 'en' && item.nameEn) {
      return item.nameEn;
    }
    return item.name;
  };

  // Get account name based on language
  const getAccountName = (account) => {
    if (i18n.language === 'en' && account.name_en) {
      return account.name_en;
    }
    return account.name;
  };

  // Format currency
  const formatAmount = (amount) => {
    if (amount === 0 || amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format result (can be negative)
  const formatResult = (amount) => {
    if (amount === 0 || amount === undefined || amount === null) return '-';
    const formatted = new Intl.NumberFormat(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount < 0 ? `-${formatted}` : formatted;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-US');
  };

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Render a group of accounts
  const renderAccountGroup = (group, groupKey, level = 0, isExpenseGroup = false) => {
    if (!group) return null;
    const hasAccounts = group.accounts && group.accounts.length > 0;
    const hasSubgroups = group.subgroups && Object.keys(group.subgroups).length > 0;
    const isExpanded = expandedGroups.has(groupKey);

    return (
      <div key={groupKey} className={`${level > 0 ? 'ml-4' : ''}`}>
        {/* Group header */}
        <div
          className={`flex items-center justify-between py-2 ${
            level === 0 ? 'font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700' : 'text-gray-700 dark:text-gray-300'
          } ${(hasAccounts || hasSubgroups) && showDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
          onClick={() => (hasAccounts || hasSubgroups) && showDetails && toggleGroup(groupKey)}
        >
          <div className="flex items-center gap-2">
            {(hasAccounts || hasSubgroups) && showDetails && (
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span>{getName(group)}</span>
          </div>
          <div className="flex gap-8">
            <span className={`min-w-[120px] text-right ${isExpenseGroup ? '' : ''}`}>
              {formatAmount(group.total)}
            </span>
            {showComparative && (
              <span className="min-w-[120px] text-right text-gray-500 dark:text-gray-400">
                {formatAmount(group.comparativeTotal)}
              </span>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && showDetails && (
          <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {/* Subgroups */}
            {hasSubgroups &&
              Object.entries(group.subgroups).map(([subKey, subgroup]) =>
                renderAccountGroup(subgroup, `${groupKey}-${subKey}`, level + 1, isExpenseGroup)
              )}

            {/* Individual accounts */}
            {hasAccounts && !hasSubgroups &&
              group.accounts.map((accData) => (
                <div
                  key={accData.account.id}
                  className="flex items-center justify-between py-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>
                    {accData.account.account_number} - {getAccountName(accData.account)}
                  </span>
                  <div className="flex gap-8">
                    <span className="min-w-[120px] text-right">
                      {formatAmount(accData.balance)}
                    </span>
                    {showComparative && (
                      <span className="min-w-[120px] text-right">
                        {formatAmount(accData.comparativeBalance)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  // Render a result line (intermediate totals)
  const renderResultLine = (label, amount, comparativeAmount, isTotal = false) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-bold text-gray-900 dark:text-white border-t-2 border-gray-900 dark:border-white mt-2 pt-3' : 'font-semibold text-gray-800 dark:text-gray-200 border-t border-gray-300 dark:border-gray-600'}`}>
      <span>{label}</span>
      <div className="flex gap-8">
        <span className={`min-w-[120px] text-right ${amount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
          {formatResult(amount)}
        </span>
        {showComparative && (
          <span className={`min-w-[120px] text-right ${comparativeAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatResult(comparativeAmount)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-cy="income-statement-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('incomeStatement.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('incomeStatement.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            data-cy="print-btn"
          >
            {t('common.print')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Fiscal Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('incomeStatement.fiscalYear')}
            </label>
            <select
              value={selectedFiscalYearId || ''}
              onChange={(e) => dispatch(setSelectedFiscalYear(e.target.value || null))}
              data-cy="fiscal-year-select"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('incomeStatement.allPeriods')}</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('incomeStatement.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-cy="start-date"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('incomeStatement.endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              data-cy="end-date"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Comparative Toggle */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showComparative}
                onChange={(e) => setShowComparative(e.target.checked)}
                data-cy="show-comparative"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('incomeStatement.showComparative')}
              </span>
            </label>
          </div>
        </div>

        {/* Comparative Period */}
        {showComparative && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incomeStatement.comparativeStartDate')}
              </label>
              <input
                type="date"
                value={comparativeStartDate}
                onChange={(e) => setComparativeStartDate(e.target.value)}
                data-cy="comparative-start-date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('incomeStatement.comparativeEndDate')}
              </label>
              <input
                type="date"
                value={comparativeEndDate}
                onChange={(e) => setComparativeEndDate(e.target.value)}
                data-cy="comparative-end-date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Show Details Toggle */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
              data-cy="show-details"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('incomeStatement.showAccountDetails')}
            </span>
          </label>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm p-4">
          <p className="text-red-600 dark:text-red-400" data-cy="error-message">{error}</p>
        </div>
      )}

      {/* Income Statement Report */}
      {!loading && !error && incomeStatement && (
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm overflow-hidden print:shadow-none">
          {/* Report Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 print:border-black">
            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">
              {t('incomeStatement.reportTitle')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-1">
              {currentOrganization?.name}
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(startDate)} - {formatDate(endDate)}
              {showComparative && comparativeStartDate && comparativeEndDate && (
                <span className="ml-4">
                  ({t('incomeStatement.comparativePeriod')}: {formatDate(comparativeStartDate)} - {formatDate(comparativeEndDate)})
                </span>
              )}
            </p>
          </div>

          {/* Column Headers */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300"></span>
            <div className="flex gap-8">
              <span className="min-w-[120px] text-right font-medium text-gray-700 dark:text-gray-300">
                {t('incomeStatement.currentPeriod')}
              </span>
              {showComparative && (
                <span className="min-w-[120px] text-right font-medium text-gray-500 dark:text-gray-400">
                  {t('incomeStatement.comparativePeriod')}
                </span>
              )}
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6 space-y-4" data-cy="income-statement-content">
            {/* Operating Revenue */}
            {renderAccountGroup(incomeStatement.groups?.operatingRevenue, 'operatingRevenue')}

            {/* Operating Expenses */}
            <div className="mt-4">
              {renderAccountGroup(incomeStatement.groups?.operatingExpenses, 'operatingExpenses', 0, true)}
            </div>

            {/* Operating Result */}
            {renderResultLine(
              t('incomeStatement.operatingResult'),
              incomeStatement.totals?.operatingResult,
              incomeStatement.totals?.operatingResultComparative
            )}

            {/* Financial Items */}
            <div className="mt-4">
              {renderAccountGroup(incomeStatement.groups?.financialItems, 'financialItems')}
            </div>

            {/* Result After Financial Items */}
            {renderResultLine(
              t('incomeStatement.resultAfterFinancial'),
              incomeStatement.totals?.resultAfterFinancial,
              incomeStatement.totals?.resultAfterFinancialComparative
            )}

            {/* Appropriations */}
            {incomeStatement.groups?.appropriations?.accounts?.length > 0 && (
              <div className="mt-4">
                {renderAccountGroup(incomeStatement.groups?.appropriations, 'appropriations')}
              </div>
            )}

            {/* Result Before Tax */}
            {renderResultLine(
              t('incomeStatement.resultBeforeTax'),
              incomeStatement.totals?.resultBeforeTax,
              incomeStatement.totals?.resultBeforeTaxComparative
            )}

            {/* Taxes */}
            {incomeStatement.groups?.taxes?.accounts?.length > 0 && (
              <div className="mt-4">
                {renderAccountGroup(incomeStatement.groups?.taxes, 'taxes', 0, true)}
              </div>
            )}

            {/* Net Result */}
            {renderResultLine(
              t('incomeStatement.netResult'),
              incomeStatement.totals?.netResult,
              incomeStatement.totals?.netResultComparative,
              true
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !incomeStatement && (
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {t('incomeStatement.noData')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('incomeStatement.selectPeriodToGenerate')}
          </p>
        </div>
      )}
    </div>
  );
}
