import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import {
  fetchBalanceSheet,
  clearBalanceSheet,
  selectBalanceSheetData,
  selectBalanceSheetLoading,
  selectBalanceSheetError,
} from '../features/financialReports/financialReportsSlice';
import {
  fetchFiscalYears,
  selectFiscalYears,
  selectSelectedFiscalYearId,
  setSelectedFiscalYear,
} from '../features/fiscalYears/fiscalYearsSlice';
import { useOrganization } from '../contexts/OrganizationContext';
import { exportBalanceSheetToPDF } from '../services/financialReportPdfService';

/**
 * Balance Sheet Page - US-230
 * Balansräkning following Swedish ÅRL format
 */
export default function BalanceSheet() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();

  // Redux state
  const balanceSheet = useSelector(selectBalanceSheetData);
  const loading = useSelector(selectBalanceSheetLoading);
  const error = useSelector(selectBalanceSheetError);
  const fiscalYears = useSelector(selectFiscalYears);
  const selectedFiscalYearId = useSelector(selectSelectedFiscalYearId);

  // Local state
  const [asOfDate, setAsOfDate] = useState('');
  const [showComparative, setShowComparative] = useState(false);
  const [comparativeDate, setComparativeDate] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfDetailLevel, setPdfDetailLevel] = useState('standard'); // 'summary', 'standard', 'detailed'

  // Handle PDF export
  const handleExportPdf = async () => {
    if (!balanceSheet) return;
    setExportingPdf(true);
    try {
      await exportBalanceSheetToPDF(balanceSheet, {
        organizationName: currentOrganization?.name || '',
        organizationNumber: currentOrganization?.organization_number || '',
        asOfDate,
        showComparative,
        comparativeDate,
        currency: currentOrganization?.default_currency || 'SEK',
        locale: i18n.language === 'sv' ? 'sv-SE' : 'en-US',
        detailLevel: pdfDetailLevel,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  // Load fiscal years on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchFiscalYears(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id]);

  // Set default date based on fiscal year
  useEffect(() => {
    if (selectedFiscalYearId && fiscalYears.length > 0) {
      const fy = fiscalYears.find((f) => f.id === selectedFiscalYearId);
      if (fy) {
        setAsOfDate(fy.end_date);
        // Set comparative date to previous year end
        const prevYear = fiscalYears.find((f) => 
          new Date(f.end_date) < new Date(fy.start_date)
        );
        if (prevYear) {
          setComparativeDate(prevYear.end_date);
        }
      }
    } else if (!asOfDate) {
      // Default to today
      setAsOfDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedFiscalYearId, fiscalYears, asOfDate]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      dispatch(clearBalanceSheet());
    };
  }, [dispatch]);

  // Fetch balance sheet when date changes
  useEffect(() => {
    if (currentOrganization?.id && asOfDate) {
      dispatch(
        fetchBalanceSheet({
          organizationId: currentOrganization.id,
          asOfDate,
          comparativeDate: showComparative ? comparativeDate : null,
          fiscalYearId: selectedFiscalYearId,
        })
      );
    }
  }, [dispatch, currentOrganization?.id, asOfDate, showComparative, comparativeDate, selectedFiscalYearId]);

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
  const renderAccountGroup = (group, groupKey, level = 0) => {
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
            <span className={`min-w-[120px] text-right ${group.total < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
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
                renderAccountGroup(subgroup, `${groupKey}-${subKey}`, level + 1)
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
                    <span className={`min-w-[120px] text-right ${accData.balance < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
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

  return (
    <div className="space-y-6" data-cy="balance-sheet-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('balanceSheet.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('balanceSheet.description')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Detail Level Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.detailLevel')}:
            </label>
            <select
              value={pdfDetailLevel}
              onChange={(e) => setPdfDetailLevel(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              data-cy="detail-level-select"
            >
              <option value="summary">{t('common.summary')}</option>
              <option value="standard">{t('common.standard')}</option>
              <option value="detailed">{t('common.detailed')}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || !balanceSheet}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
            data-cy="export-pdf-btn"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            {exportingPdf ? t('common.exporting') : t('common.exportPdf')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fiscal Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('balanceSheet.fiscalYear')}
            </label>
            <select
              value={selectedFiscalYearId || ''}
              onChange={(e) => dispatch(setSelectedFiscalYear(e.target.value || null))}
              data-cy="fiscal-year-select"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('balanceSheet.allPeriods')}</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          {/* As of Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('balanceSheet.asOfDate')}
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              data-cy="as-of-date"
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
                {t('balanceSheet.showComparative')}
              </span>
            </label>
          </div>

          {/* Comparative Date */}
          {showComparative && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('balanceSheet.comparativeDate')}
              </label>
              <input
                type="date"
                value={comparativeDate}
                onChange={(e) => setComparativeDate(e.target.value)}
                data-cy="comparative-date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

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
              {t('balanceSheet.showAccountDetails')}
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

      {/* Balance Sheet Report */}
      {!loading && !error && balanceSheet && (
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm overflow-hidden print:shadow-none">
          {/* Report Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 print:border-black">
            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">
              {t('balanceSheet.reportTitle')}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-1">
              {currentOrganization?.name}
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('balanceSheet.asOf')} {formatDate(asOfDate)}
              {showComparative && comparativeDate && (
                <span className="ml-4">
                  ({t('balanceSheet.comparativePeriod')}: {formatDate(comparativeDate)})
                </span>
              )}
            </p>
          </div>

          {/* Column Headers */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300"></span>
            <div className="flex gap-8">
              <span className="min-w-[120px] text-right font-medium text-gray-700 dark:text-gray-300">
                {formatDate(asOfDate)}
              </span>
              {showComparative && (
                <span className="min-w-[120px] text-right font-medium text-gray-500 dark:text-gray-400">
                  {formatDate(comparativeDate)}
                </span>
              )}
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6 space-y-6" data-cy="balance-sheet-content">
            {/* ASSETS */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-900 dark:border-white pb-2">
                {t('balanceSheet.assets')}
              </h3>
              
              {/* Fixed Assets */}
              {renderAccountGroup(balanceSheet.groups?.assets?.fixedAssets, 'fixedAssets')}
              
              {/* Current Assets */}
              <div className="mt-4">
                {renderAccountGroup(balanceSheet.groups?.assets?.currentAssets, 'currentAssets')}
              </div>

              {/* Total Assets */}
              <div className="flex justify-between py-3 mt-4 border-t-2 border-gray-900 dark:border-white font-bold text-gray-900 dark:text-white">
                <span>{t('balanceSheet.totalAssets')}</span>
                <div className="flex gap-8">
                  <span className="min-w-[120px] text-right">
                    {formatAmount(balanceSheet.totals?.assets)}
                  </span>
                  {showComparative && (
                    <span className="min-w-[120px] text-right text-gray-500 dark:text-gray-400">
                      {formatAmount(balanceSheet.totals?.assetsComparative)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* EQUITY AND LIABILITIES */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-900 dark:border-white pb-2">
                {t('balanceSheet.equityAndLiabilities')}
              </h3>

              {/* Equity */}
              {renderAccountGroup(balanceSheet.groups?.equityAndLiabilities?.equity, 'equity')}

              {/* Untaxed Reserves */}
              <div className="mt-4">
                {renderAccountGroup(balanceSheet.groups?.equityAndLiabilities?.untaxedReserves, 'untaxedReserves')}
              </div>

              {/* Provisions */}
              <div className="mt-4">
                {renderAccountGroup(balanceSheet.groups?.equityAndLiabilities?.provisions, 'provisions')}
              </div>

              {/* Long-term Liabilities */}
              <div className="mt-4">
                {renderAccountGroup(balanceSheet.groups?.equityAndLiabilities?.longTermLiabilities, 'longTermLiabilities')}
              </div>

              {/* Short-term Liabilities */}
              <div className="mt-4">
                {renderAccountGroup(balanceSheet.groups?.equityAndLiabilities?.shortTermLiabilities, 'shortTermLiabilities')}
              </div>

              {/* Total Equity and Liabilities */}
              <div className="flex justify-between py-3 mt-4 border-t-2 border-gray-900 dark:border-white font-bold text-gray-900 dark:text-white">
                <span>{t('balanceSheet.totalEquityAndLiabilities')}</span>
                <div className="flex gap-8">
                  <span className="min-w-[120px] text-right">
                    {formatAmount(balanceSheet.totals?.equityAndLiabilities)}
                  </span>
                  {showComparative && (
                    <span className="min-w-[120px] text-right text-gray-500 dark:text-gray-400">
                      {formatAmount(balanceSheet.totals?.equityAndLiabilitiesComparative)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Check */}
            {balanceSheet.totals && !balanceSheet.totals.isBalanced && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-sm">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  {t('balanceSheet.notBalancedWarning')}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {t('balanceSheet.difference')}: {formatAmount(Math.abs(balanceSheet.totals.assets - balanceSheet.totals.equityAndLiabilities))}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !balanceSheet && (
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
            {t('balanceSheet.noData')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('balanceSheet.selectDateToGenerate')}
          </p>
        </div>
      )}
    </div>
  );
}
