import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  createJournalEntry,
  updateJournalEntry,
} from '../../features/journalEntries/journalEntriesSlice';
import {
  fetchAccounts,
  selectAccounts,
} from '../../features/accounts/accountsSlice';

// Empty line template
const EMPTY_LINE = {
  account_id: '',
  debit_amount: '',
  credit_amount: '',
  description: '',
};

export default function JournalEntryModal({ entry, fiscalYear, organizationId, onClose }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useSelector(selectAccounts);

  const isEditing = !!entry?.id;
  const isViewOnly = entry?.viewOnly || (isEditing && entry?.status !== 'draft');

  const [formData, setFormData] = useState({
    entry_date: entry?.entry_date || new Date().toISOString().split('T')[0],
    description: entry?.description || '',
    status: entry?.status || 'draft',
  });

  const [lines, setLines] = useState(
    entry?.lines?.map((l) => ({
      id: l.id,
      account_id: l.account_id,
      debit_amount: l.debit_amount > 0 ? l.debit_amount.toString() : '',
      credit_amount: l.credit_amount > 0 ? l.credit_amount.toString() : '',
      description: l.description || '',
    })) || [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [activeLineIndex, setActiveLineIndex] = useState(null);

  // Load accounts if not already loaded
  useEffect(() => {
    if (organizationId && accounts.length === 0) {
      dispatch(fetchAccounts({ organizationId }));
    }
  }, [dispatch, organizationId, accounts.length]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
    return {
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference: Math.round((totalDebit - totalCredit) * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }, [lines]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const query = accountSearch.toLowerCase();
    return accounts.filter(
      (a) =>
        a.account_number.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        (a.name_en && a.name_en.toLowerCase().includes(query))
    );
  }, [accounts, accountSearch]);

  // Get account name based on language
  const getAccountLabel = (account) => {
    if (!account) return '';
    const name = i18n.language === 'en' && account.name_en ? account.name_en : account.name;
    return `${account.account_number} - ${name}`;
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle line changes
  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const newLines = [...prev];
      newLines[index] = { ...newLines[index], [field]: value };

      // If entering debit, clear credit and vice versa
      if (field === 'debit_amount' && value) {
        newLines[index].credit_amount = '';
      } else if (field === 'credit_amount' && value) {
        newLines[index].debit_amount = '';
      }

      return newLines;
    });
  };

  // Add a new line
  const addLine = () => {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  };

  // Remove a line
  const removeLine = (index) => {
    if (lines.length <= 2) return; // Minimum 2 lines required
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Select account for a line
  const selectAccount = (index, accountId) => {
    handleLineChange(index, 'account_id', accountId);
    setActiveLineIndex(null);
    setAccountSearch('');
  };

  // Validate form
  const validate = () => {
    if (!formData.entry_date) {
      return t('journalEntries.errors.dateRequired');
    }

    const validLines = lines.filter(
      (l) => l.account_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0)
    );

    if (validLines.length < 2) {
      return t('journalEntries.errors.minimumTwoLines');
    }

    if (!totals.isBalanced) {
      return t('journalEntries.errors.notBalanced', {
        debit: totals.totalDebit.toFixed(2),
        credit: totals.totalCredit.toFixed(2),
      });
    }

    return null;
  };

  // Handle submit
  const handleSubmit = async (e, saveAsDraft = true) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    // Filter out empty lines and format amounts
    const validLines = lines
      .filter((l) => l.account_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0))
      .map((l, index) => ({
        account_id: l.account_id,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        description: l.description || null,
        line_order: index,
      }));

    const entryData = {
      organization_id: organizationId,
      fiscal_year_id: fiscalYear.id,
      entry_date: formData.entry_date,
      description: formData.description,
      status: saveAsDraft ? 'draft' : 'posted',
      lines: validLines,
    };

    try {
      if (isEditing) {
        await dispatch(updateJournalEntry({ id: entry.id, updates: entryData })).unwrap();
      } else {
        await dispatch(createJournalEntry(entryData)).unwrap();
      }
      onClose(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div
        data-cy="journal-entry-modal"
        className="bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-4xl mx-4 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isViewOnly
                ? t('journalEntries.viewEntry')
                : isEditing
                ? t('journalEntries.editEntry')
                : t('journalEntries.createEntry')}
            </h2>
            {entry?.verification_number && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                #{entry.verification_number}
              </p>
            )}
          </div>
          <button
            onClick={() => onClose(false)}
            data-cy="close-entry-modal"
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Error */}
          {error && (
            <div
              data-cy="entry-error"
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('journalEntries.date')} *
              </label>
              <input
                type="date"
                name="entry_date"
                value={formData.entry_date}
                onChange={handleChange}
                disabled={isViewOnly}
                data-cy="entry-date"
                required
                min={fiscalYear?.start_date}
                max={fiscalYear?.end_date}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('journalEntries.description')}
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isViewOnly}
                data-cy="entry-description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-900"
                placeholder={t('journalEntries.descriptionPlaceholder')}
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('journalEntries.lines')}
              </h3>
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={addLine}
                  data-cy="add-line-button"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  + {t('journalEntries.addLine')}
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-sm">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/3">
                      {t('journalEntries.account')}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/5">
                      {t('journalEntries.lineDescription')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/6">
                      {t('journalEntries.debit')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/6">
                      {t('journalEntries.credit')}
                    </th>
                    {!isViewOnly && (
                      <th className="px-3 py-2 w-10"></th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {lines.map((line, index) => (
                    <tr key={index} data-cy={`entry-line-${index}`}>
                      {/* Account */}
                      <td className="px-3 py-2 relative">
                        {isViewOnly ? (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {getAccountLabel(accounts.find((a) => a.id === line.account_id))}
                          </span>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              value={
                                activeLineIndex === index
                                  ? accountSearch
                                  : line.account_id
                                  ? getAccountLabel(accounts.find((a) => a.id === line.account_id))
                                  : ''
                              }
                              onChange={(e) => {
                                setAccountSearch(e.target.value);
                                setActiveLineIndex(index);
                              }}
                              onFocus={() => setActiveLineIndex(index)}
                              data-cy={`line-account-${index}`}
                              placeholder={t('journalEntries.selectAccount')}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            {activeLineIndex === index && (
                              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-lg max-h-48 overflow-y-auto">
                                {filteredAccounts.slice(0, 50).map((account) => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => selectAccount(index, account.id)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                  >
                                    {getAccountLabel(account)}
                                  </button>
                                ))}
                                {filteredAccounts.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    {t('journalEntries.noAccountsFound')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          disabled={isViewOnly}
                          data-cy={`line-description-${index}`}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-900"
                        />
                      </td>

                      {/* Debit */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.debit_amount}
                          onChange={(e) => handleLineChange(index, 'debit_amount', e.target.value)}
                          disabled={isViewOnly}
                          data-cy={`line-debit-${index}`}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-900"
                        />
                      </td>

                      {/* Credit */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.credit_amount}
                          onChange={(e) => handleLineChange(index, 'credit_amount', e.target.value)}
                          disabled={isViewOnly}
                          data-cy={`line-credit-${index}`}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1 text-sm text-right font-mono border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-900"
                        />
                      </td>

                      {/* Remove Button */}
                      {!isViewOnly && (
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={lines.length <= 2}
                            data-cy={`remove-line-${index}`}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>

                {/* Totals Row */}
                <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('journalEntries.total')}:
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {totals.totalDebit.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {totals.totalCredit.toFixed(2)}
                    </td>
                    {!isViewOnly && <td></td>}
                  </tr>
                  {/* Balance Status */}
                  <tr>
                    <td colSpan={isViewOnly ? 4 : 5} className="px-3 py-2">
                      <div
                        data-cy="balance-status"
                        className={`text-sm font-medium ${
                          totals.isBalanced
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {totals.isBalanced
                          ? t('journalEntries.balanced')
                          : t('journalEntries.unbalanced', { diff: Math.abs(totals.difference).toFixed(2) })}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onClose(false)}
              data-cy="cancel-entry"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {isViewOnly ? t('common.close') : t('common.cancel')}
            </button>
            {!isViewOnly && (
              <>
                <button
                  type="submit"
                  disabled={submitting}
                  data-cy="save-draft"
                  className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t('common.saving') : t('journalEntries.saveDraft')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={submitting || !totals.isBalanced}
                  data-cy="save-and-post"
                  className="px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('journalEntries.saveAndPost')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Click outside to close account dropdown */}
      {activeLineIndex !== null && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setActiveLineIndex(null);
            setAccountSearch('');
          }}
        />
      )}
    </div>
  );
}
