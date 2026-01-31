import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchAccounts,
  seedBASAccounts,
  activateAccount,
  deactivateAccount,
  fetchAccountsSummary,
  selectAccounts,
  selectAccountsLoading,
  selectAccountsError,
  selectAccountsFilter,
  selectAccountsWithSummaries,
  selectAccountsSummariesLoading,
  setAccountClassFilter,
  setSearchQuery,
  setIncludeInactive,
  clearFilters,
} from '../features/accounts/accountsSlice';
import { useOrganization } from '../contexts/OrganizationContext';
import AccountModal from '../components/accounts/AccountModal';

// Account class definitions with colors
const ACCOUNT_CLASSES = [
  { value: 'assets', label: 'accounts.classes.assets', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  { value: 'liabilities', label: 'accounts.classes.liabilities', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  { value: 'equity', label: 'accounts.classes.equity', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
  { value: 'revenue', label: 'accounts.classes.revenue', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'expenses', label: 'accounts.classes.expenses', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
  { value: 'financial', label: 'accounts.classes.financial', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300' },
  { value: 'year_end', label: 'accounts.classes.yearEnd', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
];

export default function Accounts() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useSelector(selectAccounts);
  const accountsWithSummaries = useSelector(selectAccountsWithSummaries);
  const loading = useSelector(selectAccountsLoading);
  const summariesLoading = useSelector(selectAccountsSummariesLoading);
  const error = useSelector(selectAccountsError);
  const filter = useSelector(selectAccountsFilter);
  const { currentOrganization } = useOrganization();

  const [seedingInProgress, setSeedingInProgress] = useState(false);
  const [actionConfirm, setActionConfirm] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const summariesFetchedRef = useRef(false);

  // Load accounts when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      summariesFetchedRef.current = false; // Reset when org changes
      dispatch(
        fetchAccounts({
          organizationId: currentOrganization.id,
          includeInactive: filter.includeInactive,
        })
      );
    }
  }, [dispatch, currentOrganization?.id, filter.includeInactive]);

  // Clear filters when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearFilters());
    };
  }, [dispatch]);

  // Fetch account summaries when accounts are loaded (only once per org)
  useEffect(() => {
    if (currentOrganization?.id && accounts.length > 0 && !summariesFetchedRef.current) {
      summariesFetchedRef.current = true;
      dispatch(fetchAccountsSummary({
        organizationId: currentOrganization.id,
        accountIds: accounts.map(a => a.id)
      }));
    }
  }, [dispatch, currentOrganization?.id, accounts.length]);

  // Filter accounts client-side based on class and search
  const filteredAccounts = useMemo(() => {
    let result = accountsWithSummaries;

    // Filter by class
    if (filter.accountClass) {
      result = result.filter((a) => a.account_class === filter.accountClass);
    }

    // Filter by search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.account_number.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query) ||
          (a.name_en && a.name_en.toLowerCase().includes(query))
      );
    }

    return result;
  }, [accountsWithSummaries, filter.accountClass, filter.searchQuery]);

  // Get class badge styling
  const getClassBadge = (accountClass) => {
    const classDef = ACCOUNT_CLASSES.find((c) => c.value === accountClass);
    return classDef ? classDef.color : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // Get account name based on language
  const getAccountName = (account) => {
    if (i18n.language === 'en' && account.name_en) {
      return account.name_en;
    }
    return account.name;
  };

  // Handle seeding BAS accounts
  const handleSeedAccounts = async () => {
    if (!currentOrganization?.id) return;

    setSeedingInProgress(true);
    try {
      await dispatch(seedBASAccounts(currentOrganization.id)).unwrap();
    } catch {
      // Error is handled by Redux
    } finally {
      setSeedingInProgress(false);
    }
  };

  // Handle activate/deactivate
  const handleToggleActive = async (account) => {
    if (account.is_system) {
      // System accounts cannot be deactivated
      return;
    }

    setActionConfirm({
      account,
      action: account.is_active ? 'deactivate' : 'activate',
    });
  };

  const confirmAction = async () => {
    if (!actionConfirm) return;

    const { account, action } = actionConfirm;
    if (action === 'activate') {
      await dispatch(activateAccount(account.id));
    } else {
      await dispatch(deactivateAccount(account.id));
    }
    setActionConfirm(null);
  };

  // Handle create account
  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowAccountModal(true);
  };

  // Handle edit account
  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setShowAccountModal(true);
  };

  // Handle close account modal
  const handleCloseAccountModal = () => {
    setShowAccountModal(false);
    setEditingAccount(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1
          data-cy="accounts-page-title"
          className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0 animate-fade-in-up"
        >
          {t('accounts.title')}
        </h1>

        <div className="flex items-center space-x-3">
          {/* Create Account Button - only show if accounts exist */}
          {accounts.length > 0 && (
            <button
              onClick={handleCreateAccount}
              data-cy="create-account-button"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              {t('accounts.createAccount')}
            </button>
          )}

          {/* Seed BAS Accounts Button - only show if no accounts exist */}
          {accounts.length === 0 && !loading && (
            <button
              onClick={handleSeedAccounts}
              disabled={seedingInProgress}
              data-cy="seed-accounts-button"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seedingInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {t('accounts.seeding')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  {t('accounts.seedBAS')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4 animate-fade-in-up animate-delay-100">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t('accounts.search')}
            value={filter.searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            data-cy="search-accounts-input"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Class Filter & Include Inactive Toggle */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Class Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => dispatch(setAccountClassFilter(null))}
              data-cy="filter-all"
              className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                !filter.accountClass
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('common.all')}
            </button>
            {ACCOUNT_CLASSES.map((cls) => (
              <button
                key={cls.value}
                onClick={() => dispatch(setAccountClassFilter(cls.value))}
                data-cy={`filter-${cls.value}`}
                className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                  filter.accountClass === cls.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {t(cls.label)}
              </button>
            ))}
          </div>

          {/* Include Inactive Toggle */}
          <label className="flex items-center cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={filter.includeInactive}
              onChange={(e) => dispatch(setIncludeInactive(e.target.checked))}
              data-cy="include-inactive-checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('accounts.includeInactive')}
            </span>
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          data-cy="accounts-error"
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm"
        >
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && (
        <div
          data-cy="accounts-empty-state"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-12 text-center"
        >
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('accounts.empty')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('accounts.emptyDescription')}</p>
          <button
            onClick={handleSeedAccounts}
            disabled={seedingInProgress}
            data-cy="seed-accounts-button-empty"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {seedingInProgress ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                {t('accounts.seeding')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                {t('accounts.seedBAS')}
              </>
            )}
          </button>
        </div>
      )}

      {/* No Results from Filter */}
      {!loading && accounts.length > 0 && filteredAccounts.length === 0 && (
        <div
          data-cy="accounts-no-results"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-12 text-center"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('accounts.noResults')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{t('accounts.tryDifferentFilter')}</p>
        </div>
      )}

      {/* Accounts Table */}
      {!loading && filteredAccounts.length > 0 && (
        <div
          data-cy="accounts-list"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 overflow-hidden"
        >
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table
              data-cy="accounts-table"
              className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
            >
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.accountNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.accountName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.class')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.type')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.balance')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.transactions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('accounts.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    data-cy={`account-row-${account.account_number}`}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !account.is_active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        data-cy="account-number"
                        className={`font-mono font-medium ${
                          account.account_type === 'header'
                            ? 'text-gray-900 dark:text-white font-bold'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {account.account_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        data-cy="account-name"
                        className={`${
                          account.account_type === 'header'
                            ? 'font-semibold text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {getAccountName(account)}
                      </div>
                      {account.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {account.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        data-cy="account-class"
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getClassBadge(
                          account.account_class
                        )}`}
                      >
                        {t(`accounts.classes.${account.account_class}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {t(`accounts.types.${account.account_type}`)}
                    </td>
                    
                    {/* Balance Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {summariesLoading ? (
                        <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : account.summary ? (
                        <span className={`font-mono font-medium ${
                          account.summary.balance === 0 
                            ? 'text-gray-500 dark:text-gray-400'
                            : account.summary.balance > 0 
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}>
                          {new Intl.NumberFormat('sv-SE', {
                            style: 'currency',
                            currency: 'SEK',
                            minimumFractionDigits: 0,
                          }).format(account.summary.balance)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                      )}
                    </td>
                    
                    {/* Transactions Count Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 dark:text-gray-300">
                      {summariesLoading ? (
                        <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : account.summary ? (
                        <span className="font-medium">
                          {account.summary.transaction_count || 0}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.is_active ? (
                        <span
                          data-cy="account-status-active"
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                        >
                          {t('accounts.active')}
                        </span>
                      ) : (
                        <span
                          data-cy="account-status-inactive"
                          className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {t('accounts.inactive')}
                        </span>
                      )}
                      {account.is_system && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                          {t('accounts.system')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-4">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditAccount(account)}
                          data-cy={`edit-account-${account.account_number}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          {t('common.edit')}
                        </button>
                        
                        {/* Activate/Deactivate Button - only for non-system accounts */}
                        {!account.is_system && (
                          <button
                            onClick={() => handleToggleActive(account)}
                            data-cy={`toggle-account-${account.account_number}`}
                            className={`${
                              account.is_active
                                ? 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
                                : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'
                            }`}
                          >
                            {account.is_active ? t('accounts.deactivate') : t('accounts.activate')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                data-cy={`account-card-${account.account_number}`}
                className={`p-4 ${
                  !account.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="mb-3">
                  <span
                    data-cy="account-number"
                    className={`font-mono font-medium ${
                      account.account_type === 'header'
                        ? 'text-gray-900 dark:text-white font-bold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {account.account_number}
                  </span>
                  <div
                    data-cy="account-name"
                    className={`mt-1 ${
                      account.account_type === 'header'
                        ? 'font-semibold text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {getAccountName(account)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{t('accounts.class')}</div>
                    <span
                      data-cy="account-class"
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getClassBadge(
                        account.account_class
                      )}`}
                    >
                      {t(`accounts.classes.${account.account_class}`)}
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{t('accounts.status')}</div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        account.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {account.is_active ? t('accounts.active') : t('accounts.inactive')}
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{t('accounts.balance')}</div>
                    {summariesLoading ? (
                      <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : account.summary ? (
                      <div className="font-mono font-medium text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('sv-SE', {
                          style: 'currency',
                          currency: 'SEK',
                          minimumFractionDigits: 0,
                        }).format(account.summary.balance)}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{t('accounts.transactions')}</div>
                    <div className="text-gray-900 dark:text-white">
                      {account.summary?.transaction_count || 0}
                    </div>
                  </div>
                </div>
                
                {!account.is_system && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditAccount(account)}
                      data-cy={`edit-account-${account.account_number}-mobile`}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleToggleActive(account)}
                      data-cy={`toggle-account-${account.account_number}-mobile`}
                      className={`flex-1 px-3 py-2 text-sm rounded-sm ${
                        account.is_active
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      {account.is_active ? t('accounts.deactivate') : t('accounts.activate')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('accounts.showing', {
                count: filteredAccounts.length,
                total: accounts.length,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="action-confirm-modal">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setActionConfirm(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {actionConfirm.action === 'activate'
                  ? t('accounts.activateConfirm')
                  : t('accounts.deactivateConfirm')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-mono font-medium">{actionConfirm.account.account_number}</span>
                {' - '}
                {getAccountName(actionConfirm.account)}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {actionConfirm.action === 'activate'
                  ? t('accounts.activateWarning')
                  : t('accounts.deactivateWarning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setActionConfirm(null)}
                  data-cy="cancel-action-button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmAction}
                  data-cy="confirm-action-button"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-sm ${
                    actionConfirm.action === 'activate'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionConfirm.action === 'activate'
                    ? t('accounts.activate')
                    : t('accounts.deactivate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <AccountModal
          account={editingAccount}
          onClose={handleCloseAccountModal}
        />
      )}
    </div>
  );
}
