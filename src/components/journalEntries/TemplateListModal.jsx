import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchJournalEntryTemplates,
  deleteJournalEntryTemplate,
  selectJournalEntryTemplates,
  selectJournalEntryTemplatesLoading,
} from '../../features/journalEntryTemplates/journalEntryTemplatesSlice';

/**
 * Modal to browse and select from available templates
 */
export default function TemplateListModal({ organizationId, onSelect, onClose }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const templates = useSelector(selectJournalEntryTemplates);
  const loading = useSelector(selectJournalEntryTemplatesLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load templates
  useEffect(() => {
    if (organizationId) {
      dispatch(fetchJournalEntryTemplates(organizationId));
    }
  }, [dispatch, organizationId]);

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description && template.description.toLowerCase().includes(query))
    );
  });

  // Get account label
  const getAccountLabel = (account) => {
    if (!account) return '';
    const name = i18n.language === 'en' && account.name_en ? account.name_en : account.name;
    return `${account.account_number} - ${name}`;
  };

  // Handle template selection
  const handleSelect = (template) => {
    onSelect(template);
    onClose();
  };

  // Handle delete
  const handleDelete = async (templateId) => {
    try {
      await dispatch(deleteJournalEntryTemplate(templateId)).unwrap();
      setConfirmDelete(null);
    } catch {
      // Error handled by Redux
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div
        data-cy="template-list-modal"
        className="bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-2xl mx-4 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('journalEntryTemplates.selectTemplate')}
          </h2>
          <button
            onClick={onClose}
            data-cy="close-template-list-modal"
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
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
              placeholder={t('journalEntryTemplates.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-cy="template-search-input"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          )}

          {!loading && filteredTemplates.length === 0 && (
            <div data-cy="no-templates-message" className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? t('journalEntryTemplates.noMatchingTemplates')
                  : t('journalEntryTemplates.noTemplates')}
              </p>
            </div>
          )}

          {!loading && filteredTemplates.length > 0 && (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  data-cy={`template-item-${template.id}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-sm hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {t('journalEntryTemplates.linesCount', { count: template.lines?.length || 0 })}
                          </span>
                          {template.use_count > 0 && (
                            <span>
                              {t('journalEntryTemplates.usedCount', { count: template.use_count })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleSelect(template)}
                          data-cy={`use-template-${template.id}`}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700"
                        >
                          {t('journalEntryTemplates.use')}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(template)}
                          data-cy={`delete-template-${template.id}`}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title={t('common.delete')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Preview lines */}
                    {template.lines && template.lines.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          {template.lines.slice(0, 3).map((line, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="truncate flex-1">
                                {getAccountLabel(line.account)}
                              </span>
                              {(line.debit_amount > 0 || line.credit_amount > 0) && (
                                <span className="ml-2 font-mono">
                                  {line.debit_amount > 0 ? `D: ${line.debit_amount}` : `C: ${line.credit_amount}`}
                                </span>
                              )}
                            </div>
                          ))}
                          {template.lines.length > 3 && (
                            <div className="text-gray-400 dark:text-gray-500">
                              +{template.lines.length - 3} {t('journalEntryTemplates.moreLines')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            data-cy="close-template-list"
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div
            data-cy="confirm-delete-template-dialog"
            className="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('journalEntryTemplates.confirmDelete')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('journalEntryTemplates.confirmDeleteMessage', { name: confirmDelete.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                data-cy="cancel-delete-template"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                data-cy="confirm-delete-template"
                className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
