import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  fetchLedgerData,
  fetchAllAccountsLedger,
  clearLedger,
  clearAllAccountsLedger,
  selectLedgerEntries,
  selectLedgerLoading,
  selectLedgerError,
  selectLedgerTotals,
  selectAllAccountsLedger,
  selectAllAccountsLedgerLoading,
  selectAllAccountsLedgerError,
} from '../features/journalEntries/journalEntriesSlice';
import {
  fetchFiscalYears,
  selectFiscalYears,
  selectSelectedFiscalYearId,
  setSelectedFiscalYear,
} from '../features/fiscalYears/fiscalYearsSlice';
import {
  fetchAccounts,
  selectAccounts,
  selectAccountsLoading,
} from '../features/accounts/accountsSlice';
import { useOrganization } from '../contexts/OrganizationContext';

/**
 * General Ledger View - US-220
 * Shows all transactions for a selected account with running balances
 * Defaults to showing all accounts with transactions
 */
export default function GeneralLedger() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();

  // Redux state - Single account view
  const entries = useSelector(selectLedgerEntries);
  const loading = useSelector(selectLedgerLoading);
  const error = useSelector(selectLedgerError);
  const totals = useSelector(selectLedgerTotals);
  
  // Redux state - All accounts view
  const allAccountsLedger = useSelector(selectAllAccountsLedger);
  const allAccountsLoading = useSelector(selectAllAccountsLedgerLoading);
  const allAccountsError = useSelector(selectAllAccountsLedgerError);
  
  const fiscalYears = useSelector(selectFiscalYears);
  const selectedFiscalYearId = useSelector(selectSelectedFiscalYearId);
  const accounts = useSelector(selectAccounts);
  const accountsLoading = useSelector(selectAccountsLoading);

  // Local state - 'all' means show all accounts, otherwise it's an account ID
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());

  // Load fiscal years and accounts on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchFiscalYears(currentOrganization.id));
      dispatch(fetchAccounts({ organizationId: currentOrganization.id }));
    }
  }, [dispatch, currentOrganization?.id]);

  // Clear ledger when unmounting
  useEffect(() => {
    return () => {
      dispatch(clearLedger());
      dispatch(clearAllAccountsLedger());
    };
  }, [dispatch]);

  // Set default dates based on fiscal year
  useEffect(() => {
    if (selectedFiscalYearId && fiscalYears.length > 0) {
      const fy = fiscalYears.find((f) => f.id === selectedFiscalYearId);
      if (fy) {
        setStartDate(fy.start_date);
        setEndDate(fy.end_date);
      }
    }
  }, [selectedFiscalYearId, fiscalYears]);

  // Fetch ledger data when account or filters change
  useEffect(() => {
    if (currentOrganization?.id) {
      if (selectedAccountId === 'all') {
        // Fetch all accounts ledger
        dispatch(
          fetchAllAccountsLedger({
            organizationId: currentOrganization.id,
            fiscalYearId: selectedFiscalYearId,
            startDate: startDate || null,
            endDate: endDate || null,
          })
        );
      } else if (selectedAccountId) {
        // Fetch single account ledger
        dispatch(
          fetchLedgerData({
            organizationId: currentOrganization.id,
            accountId: selectedAccountId,
            fiscalYearId: selectedFiscalYearId,
            startDate: startDate || null,
            endDate: endDate || null,
          })
        );
      }
    }
  }, [dispatch, currentOrganization?.id, selectedAccountId, selectedFiscalYearId, startDate, endDate]);

  // Filter accounts for dropdown
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts.slice(0, 50); // Show first 50 when no search
    const query = accountSearch.toLowerCase();
    return accounts.filter(
      (a) =>
        a.account_number.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        (a.name_en && a.name_en.toLowerCase().includes(query))
    );
  }, [accounts, accountSearch]);

  // Get selected account details
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Get account display name based on language
  const getAccountName = (account) => {
    if (i18n.language === 'en' && account.name_en) {
      return account.name_en;
    }
    return account.name;
  };

  // Handle account selection
  const handleSelectAccount = (account) => {
    if (account === 'all') {
      setSelectedAccountId('all');
    } else {
      setSelectedAccountId(account.id);
    }
    setAccountSearch('');
    setShowAccountDropdown(false);
  };

  // Toggle expanded state for an account in all-accounts view
  const toggleAccountExpanded = (accountId) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  // Expand all accounts
  const expandAll = () => {
    setExpandedAccounts(new Set(allAccountsLedger.map((a) => a.account.id)));
  };

  // Collapse all accounts
  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  // Navigate to journal entry
  const handleDrillDown = (journalEntryId) => {
    navigate(`/journal-entries?entry=${journalEntryId}`);
  };

  // Format currency
  const formatAmount = (amount) => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-US');
  };

  return (
    <div className="space-y-6" data-cy="general-ledger-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('generalLedger.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('generalLedger.description')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Account Selection */}
          <div className="relative lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('generalLedger.selectAccount')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedAccountId === 'all' ? t('generalLedger.allAccounts') : (selectedAccount ? `${selectedAccount.account_number} - ${getAccountName(selectedAccount)}` : accountSearch)}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setSelectedAccountId('');
                  setShowAccountDropdown(true);
                }}
                onFocus={() => setShowAccountDropdown(true)}
                placeholder={t('generalLedger.searchAccountPlaceholder')}
                data-cy="account-search"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {showAccountDropdown && (
                <div
                  className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg max-h-60 overflow-auto"
                  data-cy="account-dropdown"
                >
                  {/* All accounts option */}
                  <button
                    type="button"
                    onClick={() => handleSelectAccount('all')}
                    data-cy="account-option-all"
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-sm border-b border-gray-200 dark:border-gray-600"
                  >
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {t('generalLedger.allAccounts')}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                      {t('generalLedger.showAllWithTransactions')}
                    </span>
                  </button>
                  {filteredAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => handleSelectAccount(account)}
                      data-cy={`account-option-${account.account_number}`}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {account.account_number}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        {getAccountName(account)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fiscal Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('generalLedger.fiscalYear')}
            </label>
            <select
              value={selectedFiscalYearId || ''}
              onChange={(e) => dispatch(setSelectedFiscalYear(e.target.value || null))}
              data-cy="fiscal-year-select"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('generalLedger.allPeriods')}</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('generalLedger.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-cy="start-date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('generalLedger.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-cy="end-date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Click outside handler */}
      {showAccountDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowAccountDropdown(false)}
        />
      )}

      {/* Results - All Accounts View */}
      {selectedAccountId === 'all' && (
        <>
          {allAccountsLoading || accountsLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : allAccountsError ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm p-4">
              <p className="text-red-600 dark:text-red-400">{allAccountsError}</p>
            </div>
          ) : allAccountsLedger.length === 0 ? (
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
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('generalLedger.noTransactions')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('generalLedger.noAccountsWithTransactions')}
              </p>
            </div>
          ) : (
            <>
              {/* Expand/Collapse Controls */}
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-sm shadow-sm p-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('generalLedger.allAccounts')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('generalLedger.accountsWithTransactionsCount', { count: allAccountsLedger.length })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-sm"
                    data-cy="expand-all-btn"
                  >
                    {t('generalLedger.expandAll')}
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
                    data-cy="collapse-all-btn"
                  >
                    {t('generalLedger.collapseAll')}
                  </button>
                </div>
              </div>

              {/* Account Groups */}
              <div className="space-y-4">
                {allAccountsLedger.map((accountData) => (
                  <div
                    key={accountData.account.id}
                    className="bg-white dark:bg-gray-800 rounded-sm shadow-sm overflow-hidden"
                    data-cy={`account-group-${accountData.account.account_number}`}
                  >
                    {/* Account Header - Clickable */}
                    <button
                      type="button"
                      onClick={() => toggleAccountExpanded(accountData.account.id)}
                      className="w-full p-4 flex flex-col lg:flex-row lg:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
                            expandedAccounts.has(accountData.account.id) ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {accountData.account.account_number} - {getAccountName(accountData.account)}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {accountData.entries.length} {t('generalLedger.transactions').toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 lg:gap-6 text-sm w-full lg:w-auto">
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.debit')}</p>
                          <p className="font-medium text-gray-900 dark:text-white text-sm lg:text-base">
                            {formatAmount(accountData.totalDebit)}
                          </p>
                        </div>
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.credit')}</p>
                          <p className="font-medium text-gray-900 dark:text-white text-sm lg:text-base">
                            {formatAmount(accountData.totalCredit)}
                          </p>
                        </div>
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.balance')}</p>
                          <p className={`font-semibold text-sm lg:text-base text-sm lg:text-base ${
                            accountData.closingBalance >= 0
                              ? 'text-gray-900 dark:text-white'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatAmount(accountData.closingBalance)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Transactions */}
                    {expandedAccounts.has(accountData.account.id) && (
                      <div className="border-t border-gray-200 dark:border-gray-700 lg:overflow-x-auto">
                        <table className="responsive-table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {t('generalLedger.date')}
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {t('generalLedger.verificationNo')}
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {t('generalLedger.description')}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {t('generalLedger.debit')}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {t('generalLedger.credit')}
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                {t('generalLedger.balance')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {accountData.entries.map((entry, index) => (
                              <tr
                                key={entry.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                onClick={() => handleDrillDown(entry.journalEntryId)}
                              >
                                <td data-label={t('generalLedger.date')} className="px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                  {formatDate(entry.entryDate)}
                                </td>
                                <td data-label={t('generalLedger.verificationNo')} className="px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                  <span className="font-mono">{entry.verificationNumber}</span>
                                </td>
                                <td data-label={t('generalLedger.description')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                  {entry.lineDescription || entry.entryDescription || '-'}
                                </td>
                                <td data-label={t('generalLedger.debit')} className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                  {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                                </td>
                                <td data-label={t('generalLedger.credit')} className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                  {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                                </td>
                                <td data-label={t('generalLedger.balance')} className={`px-4 py-2 text-sm text-right font-medium whitespace-nowrap ${
                                  entry.balance >= 0
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {formatAmount(entry.balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Results - Single Account View */}
      {selectedAccountId && selectedAccountId !== 'all' && (
        <>
          {loading || accountsLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Account Header */}
              {selectedAccount && (
                <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white" data-cy="selected-account-name">
                        {selectedAccount.account_number} - {getAccountName(selectedAccount)}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t(`accounts.classes.${selectedAccount.account_class}`)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('generalLedger.closingBalance')}
                      </p>
                      <p
                        className={`text-xl font-semibold ${
                          totals.closingBalance >= 0
                            ? 'text-gray-900 dark:text-white'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                        data-cy="closing-balance"
                      >
                        {formatAmount(totals.closingBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ledger Table */}
              <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-cy="ledger-table">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('generalLedger.date')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('generalLedger.verificationNo')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('generalLedger.description')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('generalLedger.debit')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('generalLedger.credit')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('generalLedger.balance')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Opening Balance Row */}
                      {totals.openingBalance !== 0 && (
                        <tr className="bg-gray-50 dark:bg-gray-900/30" data-cy="opening-balance-row">
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400" colSpan="3">
                            <em>{t('generalLedger.openingBalance')}</em>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">-</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white" data-cy="opening-balance-value">
                            {formatAmount(totals.openingBalance)}
                          </td>
                        </tr>
                      )}

                      {/* Transaction Rows */}
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            {t('generalLedger.noTransactions')}
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                            onClick={() => handleDrillDown(entry.journalEntryId)}
                            data-cy={`ledger-row-${index}`}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {formatDate(entry.entryDate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              <span className="font-mono" data-cy="verification-number">
                                {entry.verificationNumber}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                              {entry.lineDescription || entry.entryDescription || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                              {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                              {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-right font-medium whitespace-nowrap ${
                                entry.balance >= 0
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                              data-cy="running-balance"
                            >
                              {formatAmount(entry.balance)}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Totals Row */}
                      {entries.length > 0 && (
                        <tr className="bg-gray-100 dark:bg-gray-900/50 font-medium" data-cy="totals-row">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white" colSpan="3">
                            {t('generalLedger.totals')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white" data-cy="total-debit">
                            {formatAmount(totals.totalDebit)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white" data-cy="total-credit">
                            {formatAmount(totals.totalCredit)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white" data-cy="final-balance">
                            {formatAmount(totals.closingBalance)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Card */}
              {entries.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-sm shadow-sm p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    {t('generalLedger.periodSummary')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.openingBalance')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatAmount(totals.openingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.periodDebits')}</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatAmount(totals.totalDebit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.periodCredits')}</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatAmount(totals.totalCredit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('generalLedger.closingBalance')}</p>
                      <p className={`text-lg font-semibold ${
                        totals.closingBalance >= 0 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatAmount(totals.closingBalance)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {t('generalLedger.transactionCount', { count: entries.length })}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
