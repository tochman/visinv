import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  fetchRecurringInvoices, 
  deleteRecurringInvoice,
  pauseRecurringInvoice,
  resumeRecurringInvoice,
  cancelRecurringInvoice,
  generateInvoiceFromRecurring
} from '../features/recurringInvoices/recurringInvoicesSlice';
import { fetchInvoices } from '../features/invoices/invoicesSlice';
import RecurringInvoiceModal from '../components/invoices/RecurringInvoiceModal';
import { formatCurrency } from '../config/currencies';
import { usePremiumAccess } from '../hooks/usePremiumAccess';

export default function RecurringInvoices() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isPremium, isLoading: premiumLoading } = usePremiumAccess();
  
  const { items: recurringInvoices, loading, error, generatingInvoice } = useSelector(
    (state) => state.recurringInvoices
  );
  const { user } = useSelector((state) => state.auth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchRecurringInvoices());
    }
  }, [dispatch, user]);

  // Redirect if not premium (after loading is done)
  useEffect(() => {
    if (!premiumLoading && !isPremium) {
      navigate('/dashboard');
    }
  }, [isPremium, premiumLoading, navigate]);

  const handleCreate = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await dispatch(deleteRecurringInvoice(id));
    setDeleteConfirm(null);
  };

  const handlePause = async (id) => {
    await dispatch(pauseRecurringInvoice(id));
  };

  const handleResume = async (id) => {
    await dispatch(resumeRecurringInvoice(id));
  };

  const handleCancel = async (id) => {
    await dispatch(cancelRecurringInvoice(id));
  };

  const handleGenerateNow = async (id) => {
    const result = await dispatch(generateInvoiceFromRecurring(id));
    if (!result.error) {
      // Refresh invoices list
      dispatch(fetchInvoices());
      alert(t('recurringInvoices.invoiceGenerated'));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const filteredItems = recurringInvoices.filter((item) => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[status] || colors.active;
  };

  const getFrequencyLabel = (frequency) => {
    return t(`recurringInvoices.frequencies.${frequency}`);
  };

  // Calculate estimated total from rows_template
  const calculateTotal = (item) => {
    let rows = [];
    try {
      rows = typeof item.rows_template === 'string' 
        ? JSON.parse(item.rows_template) 
        : item.rows_template || [];
    } catch {
      rows = [];
    }

    const subtotal = rows.reduce((sum, row) => {
      return sum + (parseFloat(row.quantity || 0) * parseFloat(row.unit_price || 0));
    }, 0);

    const taxAmount = rows.reduce((sum, row) => {
      const rowTotal = parseFloat(row.quantity || 0) * parseFloat(row.unit_price || 0);
      const taxRate = parseFloat(row.tax_rate || item.tax_rate || 0);
      return sum + (rowTotal * taxRate / 100);
    }, 0);

    return subtotal + taxAmount;
  };

  if (premiumLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isPremium) {
    return null;
  }

  return (
    <div className="space-y-6" data-cy="recurring-invoices-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('recurringInvoices.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('recurringInvoices.description')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          data-cy="create-recurring-invoice-button"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('recurringInvoices.create')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('recurringInvoices.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-cy="search-input"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-cy="status-filter"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('common.allStatuses')}</option>
          <option value="active">{t('recurringInvoices.statuses.active')}</option>
          <option value="paused">{t('recurringInvoices.statuses.paused')}</option>
          <option value="completed">{t('recurringInvoices.statuses.completed')}</option>
          <option value="cancelled">{t('recurringInvoices.statuses.cancelled')}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-12" data-cy="empty-state">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? t('recurringInvoices.noMatchingSchedules')
              : t('recurringInvoices.noSchedules')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('recurringInvoices.noSchedulesDescription')}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
            >
              {t('recurringInvoices.createFirst')}
            </button>
          )}
        </div>
      )}

      {/* List */}
      {!loading && filteredItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-sm shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('recurringInvoices.scheduleName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.client')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('recurringInvoices.frequency')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('recurringInvoices.nextInvoice')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('recurringInvoices.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  data-cy={`recurring-invoice-row-${item.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white" data-cy="schedule-name">
                      {item.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.invoice_count} {t('recurringInvoices.invoicesGenerated')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white" data-cy="client-name">
                      {item.client?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white" data-cy="frequency">
                      {getFrequencyLabel(item.frequency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white" data-cy="next-invoice-date">
                      {item.status === 'active' ? item.next_invoice_date : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white" data-cy="amount">
                      {formatCurrency(calculateTotal(item), item.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}
                      data-cy="status-badge"
                    >
                      {t(`recurringInvoices.statuses.${item.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      {/* Generate Now */}
                      {item.status === 'active' && (
                        <button
                          onClick={() => handleGenerateNow(item.id)}
                          disabled={generatingInvoice}
                          title={t('recurringInvoices.generateNow')}
                          data-cy="generate-now-button"
                          className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </button>
                      )}

                      {/* Pause/Resume */}
                      {item.status === 'active' && (
                        <button
                          onClick={() => handlePause(item.id)}
                          title={t('recurringInvoices.pause')}
                          data-cy="pause-button"
                          className="p-1.5 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      {item.status === 'paused' && (
                        <button
                          onClick={() => handleResume(item.id)}
                          title={t('recurringInvoices.resume')}
                          data-cy="resume-button"
                          className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(item)}
                        title={t('common.edit')}
                        data-cy="edit-button"
                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        title={t('common.delete')}
                        data-cy="delete-button"
                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('recurringInvoices.confirmDelete')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('recurringInvoices.confirmDeleteDescription')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                data-cy="confirm-delete-button"
                className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <RecurringInvoiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        recurringInvoice={selectedItem}
      />
    </div>
  );
}
