import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchVatReport,
  clearVatReport,
  selectVatReportData,
  selectVatReportLoading,
  selectVatReportError,
} from '../features/financialReports/financialReportsSlice';
import {
  fetchFiscalYears,
  selectFiscalYears,
  selectSelectedFiscalYearId,
  setSelectedFiscalYear,
} from '../features/fiscalYears/fiscalYearsSlice';
import { useOrganization } from '../contexts/OrganizationContext';
import { PrinterIcon, ArrowDownTrayIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * VAT Report Page - US-233
 * Momsrapport for Swedish Skatteverket filing
 */
export default function VATReport() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentOrganization } = useOrganization();

  // Redux state
  const vatReport = useSelector(selectVatReportData);
  const loading = useSelector(selectVatReportLoading);
  const error = useSelector(selectVatReportError);
  const fiscalYears = useSelector(selectFiscalYears);
  const selectedFiscalYearId = useSelector(selectSelectedFiscalYearId);

  // Local state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [showTransactions, setShowTransactions] = useState(false);

  // Load fiscal years on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchFiscalYears(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id]);

  // Set default dates based on current quarter
  useEffect(() => {
    if (!startDate && !endDate) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Default to previous completed quarter
      let quarterStart, quarterEnd;
      if (currentMonth >= 0 && currentMonth <= 2) {
        // Q1 -> show Q4 of previous year
        quarterStart = new Date(currentYear - 1, 9, 1);
        quarterEnd = new Date(currentYear - 1, 11, 31);
      } else if (currentMonth >= 3 && currentMonth <= 5) {
        // Q2 -> show Q1
        quarterStart = new Date(currentYear, 0, 1);
        quarterEnd = new Date(currentYear, 2, 31);
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        // Q3 -> show Q2
        quarterStart = new Date(currentYear, 3, 1);
        quarterEnd = new Date(currentYear, 5, 30);
      } else {
        // Q4 -> show Q3
        quarterStart = new Date(currentYear, 6, 1);
        quarterEnd = new Date(currentYear, 8, 30);
      }
      
      setStartDate(quarterStart.toISOString().split('T')[0]);
      setEndDate(quarterEnd.toISOString().split('T')[0]);
    }
  }, [startDate, endDate]);

  // Update dates when fiscal year changes
  useEffect(() => {
    if (selectedFiscalYearId && fiscalYears.length > 0) {
      const fy = fiscalYears.find((f) => f.id === selectedFiscalYearId);
      if (fy) {
        setStartDate(fy.start_date);
        setEndDate(fy.end_date);
      }
    }
  }, [selectedFiscalYearId, fiscalYears]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      dispatch(clearVatReport());
    };
  }, [dispatch]);

  // Fetch VAT report when dates change
  useEffect(() => {
    if (currentOrganization?.id && startDate && endDate) {
      dispatch(
        fetchVatReport({
          organizationId: currentOrganization.id,
          startDate,
          endDate,
          fiscalYearId: selectedFiscalYearId,
        })
      );
    }
  }, [dispatch, currentOrganization?.id, startDate, endDate, selectedFiscalYearId]);

  // Handle fiscal year change
  const handleFiscalYearChange = (e) => {
    const fyId = e.target.value;
    dispatch(setSelectedFiscalYear(fyId || null));
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Format currency
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currentOrganization?.default_currency || 'SEK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle quick period selection
  const setPeriod = (type) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    let start, end;
    
    switch (type) {
      case 'q1':
        start = new Date(year, 0, 1);
        end = new Date(year, 2, 31);
        break;
      case 'q2':
        start = new Date(year, 3, 1);
        end = new Date(year, 5, 30);
        break;
      case 'q3':
        start = new Date(year, 6, 1);
        end = new Date(year, 8, 30);
        break;
      case 'q4':
        start = new Date(year, 9, 1);
        end = new Date(year, 11, 31);
        break;
      case 'lastMonth':
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastMonthYear = month === 0 ? year - 1 : year;
        start = new Date(lastMonthYear, lastMonth, 1);
        end = new Date(lastMonthYear, lastMonth + 1, 0);
        break;
      case 'thisMonth':
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        break;
      case 'ytd':
        start = new Date(year, 0, 1);
        end = today;
        break;
      default:
        return;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Render VAT rate row
  const renderVatRow = (label, data, sectionKey, isTotal = false) => {
    const isExpanded = expandedSections.has(sectionKey);
    const hasTransactions = showTransactions && data?.transactions?.length > 0;
    
    return (
      <div key={sectionKey}>
        <div 
          className={`flex items-center justify-between py-2 px-4 ${
            isTotal 
              ? 'bg-gray-100 dark:bg-gray-700 font-semibold' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
          }`}
          onClick={() => !isTotal && hasTransactions && toggleSection(sectionKey)}
          data-cy={`vat-row-${sectionKey}`}
        >
          <div className="flex items-center gap-2">
            {hasTransactions && !isTotal && (
              isExpanded 
                ? <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                : <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
            <span className={isTotal ? '' : 'ml-6'}>{label}</span>
          </div>
          <span className={data?.amount < 0 ? 'text-red-600 dark:text-red-400' : ''}>
            {formatAmount(isTotal ? data : data?.amount)}
          </span>
        </div>
        
        {/* Transaction details */}
        {isExpanded && hasTransactions && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border-l-4 border-blue-200 dark:border-blue-800 ml-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-1 px-3">{t('vatReport.date')}</th>
                  <th className="py-1 px-3">{t('vatReport.entry')}</th>
                  <th className="py-1 px-3">{t('vatReport.description')}</th>
                  <th className="py-1 px-3 text-right">{t('vatReport.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-1 px-3">{tx.date}</td>
                    <td className="py-1 px-3">{tx.entryNumber}</td>
                    <td className="py-1 px-3">{tx.description}</td>
                    <td className="py-1 px-3 text-right">
                      {formatAmount(tx.credit - tx.debit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto" data-cy="vat-report-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('vatReport.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('vatReport.description')}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Fiscal Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('vatReport.fiscalYear')}
            </label>
            <select
              value={selectedFiscalYearId || ''}
              onChange={handleFiscalYearChange}
              className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              data-cy="fiscal-year-select"
            >
              <option value="">{t('vatReport.allPeriods')}</option>
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
              {t('vatReport.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              data-cy="start-date"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('vatReport.endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              data-cy="end-date"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-sm text-sm"
              data-cy="print-btn"
            >
              <PrinterIcon className="h-4 w-4" />
              {t('common.print')}
            </button>
          </div>
        </div>

        {/* Quick Period Selection */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            {t('vatReport.quickPeriod')}:
          </span>
          {['q1', 'q2', 'q3', 'q4', 'lastMonth', 'thisMonth', 'ytd'].map((period) => (
            <button
              key={period}
              onClick={() => setPeriod(period)}
              className="px-2 py-1 text-xs rounded-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              data-cy={`period-${period}`}
            >
              {t(`vatReport.periods.${period}`)}
            </button>
          ))}
        </div>

        {/* Show Transactions Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showTransactions"
            checked={showTransactions}
            onChange={(e) => setShowTransactions(e.target.checked)}
            className="rounded text-blue-600"
            data-cy="show-transactions"
          />
          <label htmlFor="showTransactions" className="text-sm text-gray-700 dark:text-gray-300">
            {t('vatReport.showTransactions')}
          </label>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-400" data-cy="error-message">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      )}

      {/* VAT Report Content */}
      {!loading && vatReport && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm" data-cy="vat-report-content">
          {/* Report Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 print:border-none">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
              {t('vatReport.reportTitle')}
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              {currentOrganization?.name}
            </p>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('vatReport.period')}: {startDate} - {endDate}
            </p>
          </div>

          {/* Output VAT Section */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300" data-cy="output-vat-header">
                {t('vatReport.outputVat')}
              </h3>
            </div>
            {renderVatRow(t('vatReport.rate25'), vatReport.outputVat.rate25, 'output25')}
            {renderVatRow(t('vatReport.rate12'), vatReport.outputVat.rate12, 'output12')}
            {renderVatRow(t('vatReport.rate6'), vatReport.outputVat.rate6, 'output6')}
            {vatReport.outputVat.other.amount !== 0 && 
              renderVatRow(t('vatReport.otherOutput'), vatReport.outputVat.other, 'outputOther')
            }
            {renderVatRow(t('vatReport.totalOutputVat'), vatReport.outputVat.total, 'outputTotal', true)}
          </div>

          {/* Input VAT Section */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="bg-green-50 dark:bg-green-900/30 px-4 py-2">
              <h3 className="font-semibold text-green-900 dark:text-green-300" data-cy="input-vat-header">
                {t('vatReport.inputVat')}
              </h3>
            </div>
            {renderVatRow(t('vatReport.deductibleVat'), vatReport.inputVat.deductible, 'inputDeductible')}
            {vatReport.inputVat.reverseCharge.amount !== 0 &&
              renderVatRow(t('vatReport.reverseChargeVat'), vatReport.inputVat.reverseCharge, 'inputReverseCharge')
            }
            {vatReport.inputVat.euAcquisitions.amount !== 0 &&
              renderVatRow(t('vatReport.euAcquisitionsVat'), vatReport.inputVat.euAcquisitions, 'inputEU')
            }
            {renderVatRow(t('vatReport.totalInputVat'), vatReport.inputVat.total, 'inputTotal', true)}
          </div>

          {/* Net VAT Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-center" data-cy="net-vat-row">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {vatReport.netVat >= 0 ? t('vatReport.vatPayable') : t('vatReport.vatReceivable')}
              </span>
              <span className={`text-lg font-bold ${
                vatReport.netVat >= 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {formatAmount(Math.abs(vatReport.netVat))}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {vatReport.netVat >= 0 
                ? t('vatReport.payableNote')
                : t('vatReport.receivableNote')
              }
            </p>
          </div>

          {/* Skatteverket Filing Info */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {t('vatReport.filingInfo')}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('vatReport.filingNote')}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !vatReport && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t('vatReport.noData')}
          </p>
        </div>
      )}
    </div>
  );
}
