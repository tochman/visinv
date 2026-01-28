import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { createJournalEntryTemplate } from '../../features/journalEntryTemplates/journalEntryTemplatesSlice';

/**
 * Modal to save current journal entry as a template
 */
export default function SaveAsTemplateModal({ lines, description, organizationId, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [name, setName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [includeAmounts, setIncludeAmounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('journalEntryTemplates.errors.nameRequired'));
      return;
    }

    const validLines = lines.filter((l) => l.account_id);
    if (validLines.length < 2) {
      setError(t('journalEntryTemplates.errors.minimumTwoLines'));
      return;
    }

    setError(null);
    setSubmitting(true);

    const templateData = {
      organization_id: organizationId,
      name: name.trim(),
      description: templateDescription.trim() || null,
      default_description: description || null,
      lines: validLines.map((line, index) => ({
        account_id: line.account_id,
        debit_amount: includeAmounts ? (parseFloat(line.debit_amount) || 0) : 0,
        credit_amount: includeAmounts ? (parseFloat(line.credit_amount) || 0) : 0,
        description: line.description || null,
        line_order: index,
      })),
    };

    try {
      await dispatch(createJournalEntryTemplate(templateData)).unwrap();
      onClose(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        data-cy="save-as-template-modal"
        className="bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('journalEntryTemplates.saveAsTemplate')}
          </h2>
          <button
            onClick={() => onClose(false)}
            data-cy="close-save-template-modal"
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error */}
          {error && (
            <div
              data-cy="save-template-error"
              className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('journalEntryTemplates.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-cy="template-name-input"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('journalEntryTemplates.namePlaceholder')}
            />
          </div>

          {/* Template Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('journalEntryTemplates.description')}
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              data-cy="template-description-input"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('journalEntryTemplates.descriptionPlaceholder')}
            />
          </div>

          {/* Include Amounts */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="include-amounts"
              checked={includeAmounts}
              onChange={(e) => setIncludeAmounts(e.target.checked)}
              data-cy="include-amounts-checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="include-amounts" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              {t('journalEntryTemplates.includeAmounts')}
            </label>
          </div>

          {/* Summary */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-sm">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('journalEntryTemplates.linesSummary', {
                count: lines.filter((l) => l.account_id).length,
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onClose(false)}
              data-cy="cancel-save-template"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-cy="confirm-save-template"
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
