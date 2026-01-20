import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Handlebars from 'handlebars';

export default function TemplateEditorModal({ isOpen, onClose, template = null, onSave }) {
  const { t } = useTranslation();
  const isEditing = !!template?.id;

  const [formData, setFormData] = useState({
    name: template?.name || '',
    content: template?.content || '',
  });

  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sample data for preview
  const sampleData = {
    invoice_number: 'INV-0001',
    client_name: 'Acme Corporation',
    issue_date: '2026-01-20',
    due_date: '2026-02-20',
    line_items: [
      { description: 'Web Development', quantity: '40', unit_price: '1500', amount: '60000.00' },
      { description: 'Design Services', quantity: '20', unit_price: '1200', amount: '24000.00' },
    ],
    subtotal: '84000.00',
    tax_rate: '25',
    tax_amount: '21000.00',
    total: '105000.00',
    currency: 'SEK',
    notes: 'Thank you for your business!',
  };

  useEffect(() => {
    if (isOpen && template) {
      setFormData({
        name: template.name || '',
        content: template.content || '',
      });
    }
  }, [isOpen, template]);

  useEffect(() => {
    if (formData.content) {
      try {
        const compiled = Handlebars.compile(formData.content);
        setPreview(compiled(sampleData));
        setError(null);
      } catch (err) {
        setPreview('');
        setError(err.message);
      }
    }
  }, [formData.content]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError(t('invoiceTemplates.name') + ' is required');
      return;
    }

    if (!formData.content.trim()) {
      setError(t('invoiceTemplates.content') + ' is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableVariables = [
    'invoice_number', 'client_name', 'issue_date', 'due_date',
    'subtotal', 'tax_rate', 'tax_amount', 'total', 'currency',
    'notes', 'line_items'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="template-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50" 
          onClick={onClose}
          data-cy="modal-backdrop"
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 data-cy="template-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('invoiceTemplates.edit') : t('invoiceTemplates.create')}
            </h2>
            <button
              onClick={onClose}
              data-cy="close-modal-button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
            {/* Editor Panel */}
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
              {error && (
                <div data-cy="template-form-error" className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoiceTemplates.name')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    data-cy="template-name-input"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('invoiceTemplates.content')} *
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    data-cy="template-content-input"
                    rows="20"
                    className="w-full px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="<html>...</html>"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-sm">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    {t('invoiceTemplates.variables')}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    {t('invoiceTemplates.variablesHelp')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map(v => (
                      <code 
                        key={v}
                        className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded text-xs"
                      >
                        {'{{' + v + '}}'} 
                      </code>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    For line items use: {'{{#each line_items}}...{{/each}}'}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('invoiceTemplates.preview')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>
              
              {showPreview && (
                <div 
                  className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700"
                  dangerouslySetInnerHTML={{ __html: preview }}
                  data-cy="template-preview"
                />
              )}
            </div>
          </form>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              data-cy="cancel-button"
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              data-cy="submit-button"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
