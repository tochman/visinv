import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchJournalEntries,
  deleteJournalEntry,
  postJournalEntry,
  selectJournalEntries,
  selectJournalEntriesLoading,
  selectJournalEntriesError,
  clearError,
} from '../features/journalEntries/journalEntriesSlice';
import {
  fetchFiscalYears,
  selectFiscalYears,
  selectSelectedFiscalYearId,
  setSelectedFiscalYear,
} from '../features/fiscalYears/fiscalYearsSlice';
import { useOrganization } from '../contexts/OrganizationContext';
import JournalEntryModal from '../components/journalEntries/JournalEntryModal';
import FiscalYearModal from '../components/journalEntries/FiscalYearModal';

// Status badge colors
const STATUS_BADGES = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  voided: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

export default function JournalEntries() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const entries = useSelector(selectJournalEntries);
  const loading = useSelector(selectJournalEntriesLoading);
  const error = useSelector(selectJournalEntriesError);
  const fiscalYears = useSelector(selectFiscalYears);
  const selectedFiscalYearId = useSelector(selectSelectedFiscalYearId);
  const { currentOrganization } = useOrganization();

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showFiscalYearModal, setShowFiscalYearModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Load fiscal years when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchFiscalYears(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id]);

  // Load entries when fiscal year selection changes
  useEffect(() => {
    if (currentOrganization?.id && selectedFiscalYearId) {
      dispatch(fetchJournalEntries({
        organizationId: currentOrganization.id,
        fiscalYearId: selectedFiscalYearId,
      }));
    }
  }, [dispatch, currentOrganization?.id, selectedFiscalYearId]);

  // Filter entries client-side
  const filteredEntries = useMemo(() => {
    let result = entries;

    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.verification_number.toString().includes(query) ||
          (e.description && e.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [entries, statusFilter, searchQuery]);

  // Calculate totals for an entry
  const calculateEntryTotals = (entry) => {
    if (!entry.lines) return { totalDebit: 0, totalCredit: 0 };
    const totalDebit = entry.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
    return {
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
    };
  };

  // Handle create new entry
  const handleCreateEntry = () => {
    if (!selectedFiscalYearId) {
      // Need to create a fiscal year first
      setShowFiscalYearModal(true);
      return;
    }
    setEditingEntry(null);
    setShowEntryModal(true);
  };

  // Handle edit entry
  const handleEditEntry = (entry) => {
    if (entry.status !== 'draft') return;
    setEditingEntry(entry);
    setShowEntryModal(true);
  };

  // Handle post entry
  const handlePostEntry = async (entry) => {
    setConfirmAction({
      type: 'post',
      entry,
      message: t('journalEntries.confirmPost'),
    });
  };

  // Handle delete entry
  const handleDeleteEntry = (entry) => {
    if (entry.status !== 'draft') return;
    setConfirmAction({
      type: 'delete',
      entry,
      message: t('journalEntries.confirmDelete'),
    });
  };

  // Confirm action
  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'post') {
        await dispatch(postJournalEntry(confirmAction.entry.id)).unwrap();
      } else if (confirmAction.type === 'delete') {
        await dispatch(deleteJournalEntry(confirmAction.entry.id)).unwrap();
      }
    } catch {
      // Error handled by Redux
    }
    setConfirmAction(null);
  };

  // Handle modal close and refresh
  const handleEntryModalClose = (saved) => {
    setShowEntryModal(false);
    setEditingEntry(null);
    if (saved && currentOrganization?.id && selectedFiscalYearId) {
      dispatch(fetchJournalEntries({
        organizationId: currentOrganization.id,
        fiscalYearId: selectedFiscalYearId,
      }));
    }
  };

  const handleFiscalYearModalClose = (created) => {
    setShowFiscalYearModal(false);
    if (created && currentOrganization?.id) {
      dispatch(fetchFiscalYears(currentOrganization.id));
    }
  };

  // Get selected fiscal year
  const selectedFiscalYear = fiscalYears.find((fy) => fy.id === selectedFiscalYearId);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1
          data-cy="journal-entries-page-title"
          className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0 animate-fade-in-up"
        >
          {t('journalEntries.title')}
        </h1>

        <button
          onClick={handleCreateEntry}
          data-cy="create-journal-entry-button"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('journalEntries.create')}
        </button>
      </div>

      {/* Fiscal Year Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-4 animate-fade-in-up animate-delay-100">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('journalEntries.fiscalYear')}:
          </label>
          {fiscalYears.length > 0 ? (
            <select
              value={selectedFiscalYearId || ''}
              onChange={(e) => dispatch(setSelectedFiscalYear(e.target.value))}
              data-cy="fiscal-year-select"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name} {fy.is_closed && `(${t('journalEntries.closed')})`}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{t('journalEntries.noFiscalYears')}</span>
          )}
          <button
            onClick={() => setShowFiscalYearModal(true)}
            data-cy="create-fiscal-year-button"
            className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            title={t('journalEntries.createFiscalYear')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4 animate-fade-in-up animate-delay-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('journalEntries.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-cy="search-entries-input"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter(null)}
              data-cy="filter-all"
              className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                !statusFilter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              data-cy="filter-draft"
              className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('journalEntries.statusDraft')}
            </button>
            <button
              onClick={() => setStatusFilter('posted')}
              data-cy="filter-posted"
              className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                statusFilter === 'posted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('journalEntries.statusPosted')}
            </button>
            <button
              onClick={() => setStatusFilter('voided')}
              data-cy="filter-voided"
              className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                statusFilter === 'voided'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {t('journalEntries.statusVoided')}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          data-cy="journal-entries-error"
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm flex items-center justify-between"
        >
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => dispatch(clearError())}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      )}

      {/* No Fiscal Year State */}
      {!loading && fiscalYears.length === 0 && (
        <div
          data-cy="no-fiscal-year-state"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-12 text-center"
        >
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('journalEntries.noFiscalYears')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('journalEntries.noFiscalYearsDescription')}
          </p>
          <button
            onClick={() => setShowFiscalYearModal(true)}
            data-cy="create-first-fiscal-year-button"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('journalEntries.createFiscalYear')}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && fiscalYears.length > 0 && entries.length === 0 && (
        <div
          data-cy="journal-entries-empty-state"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-12 text-center"
        >
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('journalEntries.empty')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('journalEntries.emptyDescription')}
          </p>
          <button
            onClick={handleCreateEntry}
            data-cy="create-first-entry-button"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('journalEntries.create')}
          </button>
        </div>
      )}

      {/* No Results */}
      {!loading && entries.length > 0 && filteredEntries.length === 0 && (
        <div
          data-cy="journal-entries-no-results"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-12 text-center"
        >
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('journalEntries.noResults')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{t('journalEntries.tryDifferentFilter')}</p>
        </div>
      )}

      {/* Entries Table */}
      {!loading && filteredEntries.length > 0 && (
        <div
          data-cy="journal-entries-list"
          className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table data-cy="journal-entries-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('journalEntries.verificationNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('journalEntries.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('journalEntries.description')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('journalEntries.debit')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('journalEntries.credit')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('journalEntries.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEntries.map((entry) => {
                  const totals = calculateEntryTotals(entry);
                  return (
                    <tr
                      key={entry.id}
                      data-cy={`journal-entry-row-${entry.verification_number}`}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          #{entry.verification_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {entry.entry_date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-white truncate max-w-xs block">
                          {entry.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                        {totals.totalDebit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                        {totals.totalCredit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          data-cy={`entry-status-${entry.status}`}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-sm ${STATUS_BADGES[entry.status]}`}
                        >
                          {t(`journalEntries.status${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {entry.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleEditEntry(entry)}
                                data-cy={`edit-entry-${entry.verification_number}`}
                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                title={t('common.edit')}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handlePostEntry(entry)}
                                data-cy={`post-entry-${entry.verification_number}`}
                                className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                                title={t('journalEntries.post')}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry)}
                                data-cy={`delete-entry-${entry.verification_number}`}
                                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                title={t('common.delete')}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                          {entry.status === 'posted' && (
                            <button
                              onClick={() => handleEditEntry({ ...entry, viewOnly: true })}
                              data-cy={`view-entry-${entry.verification_number}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                              title={t('common.view')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && filteredEntries.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {t('journalEntries.showing', {
            count: filteredEntries.length,
            total: entries.length,
          })}
        </div>
      )}

      {/* Journal Entry Modal */}
      {showEntryModal && (
        <JournalEntryModal
          entry={editingEntry}
          fiscalYear={selectedFiscalYear}
          organizationId={currentOrganization?.id}
          onClose={handleEntryModalClose}
        />
      )}

      {/* Fiscal Year Modal */}
      {showFiscalYearModal && (
        <FiscalYearModal
          organizationId={currentOrganization?.id}
          onClose={handleFiscalYearModalClose}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            data-cy="confirm-dialog"
            className="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('common.confirm')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                data-cy="confirm-cancel"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmAction}
                data-cy="confirm-action"
                className={`px-4 py-2 text-white rounded-sm ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmAction.type === 'post' ? t('journalEntries.post') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
