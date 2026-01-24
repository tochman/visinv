import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  fetchTemplates, 
  deleteTemplate,
  cloneTemplate 
} from '../features/invoiceTemplates/invoiceTemplatesSlice';
import TemplatePreview, { TemplatePreviewModal } from '../components/templates/TemplatePreview';

export default function InvoiceTemplates() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: templates, loading, error } = useSelector((state) => state.invoiceTemplates);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchTemplates());
    }
  }, [dispatch, user]);

  const handleCreate = () => {
    navigate('/templates/new');
  };

  const handleEdit = (template) => {
    navigate(`/templates/edit/${template.id}`);
  };

  const handleClone = async (template) => {
    const name = prompt(t('invoiceTemplates.clonePrompt'), `${template.name} (Copy)`);
    if (name) {
      await dispatch(cloneTemplate({ id: template.id, name }));
    }
  };

  const handleDelete = async (id) => {
    await dispatch(deleteTemplate(id));
    setDeleteConfirm(null);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const systemTemplates = filteredTemplates.filter(t => t.is_system);
  const userTemplates = filteredTemplates.filter(t => !t.is_system);

  return (
    <div className="p-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('invoiceTemplates.title')}
        </h1>
      </div>

      <div className="flex gap-4 mb-6 animate-fade-in-up animate-delay-100">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('invoiceTemplates.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-cy="search-templates"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleCreate}
          data-cy="create-template-button"
          className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
        >
          {t('invoiceTemplates.create')}
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm mb-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-16" data-cy="empty-state">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('invoiceTemplates.empty')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('invoiceTemplates.emptyDescription')}
          </p>
          <button
            onClick={handleCreate}
            data-cy="empty-state-button"
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
          >
            {t('invoiceTemplates.createFirst')}
          </button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="space-y-8">
          {systemTemplates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('invoiceTemplates.systemTemplate')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {systemTemplates.map(template => (
                  <div
                    key={template.id}
                    data-cy={`template-${template.id}`}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Preview thumbnail */}
                    <div 
                      className="flex justify-center p-3 bg-gray-50 dark:bg-gray-900 cursor-pointer"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <TemplatePreview 
                        template={template} 
                        scale={0.22}
                      />
                    </div>
                    
                    {/* Template info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate pr-2">
                          {template.name}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded flex-shrink-0">
                          System
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="flex-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {t('common.preview') || 'Preview'}
                        </button>
                        <button
                          onClick={() => handleClone(template)}
                          data-cy={`clone-template-${template.id}`}
                          className="flex-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          {t('invoiceTemplates.clone')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userTemplates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('invoiceTemplates.userTemplate')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userTemplates.map(template => (
                  <div
                    key={template.id}
                    data-cy={`template-${template.id}`}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Preview thumbnail */}
                    <div 
                      className="flex justify-center p-3 bg-gray-50 dark:bg-gray-900 cursor-pointer"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <TemplatePreview 
                        template={template} 
                        scale={0.22}
                      />
                    </div>
                    
                    {/* Template info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate pr-2">
                          {template.name}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded flex-shrink-0">
                          Custom
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewTemplate(template)}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {t('common.preview') || 'Preview'}
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          data-cy={`edit-template-${template.id}`}
                          className="flex-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(template.id)}
                          data-cy={`delete-template-${template.id}`}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
            
            <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t('invoiceTemplates.deleteConfirm')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('invoiceTemplates.deleteWarning')}
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  data-cy="confirm-delete-template"
                  className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
}
