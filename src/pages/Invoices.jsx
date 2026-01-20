import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchInvoices, deleteInvoice, markInvoiceAsSent, markInvoiceAsPaid } from '../features/invoices/invoicesSlice';
import InvoiceModal from '../components/invoices/InvoiceModal';

export default function Invoices() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { items: invoices, loading, error } = useSelector((state) => state.invoices);
  const { user } = useSelector((state) => state.auth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchInvoices());
    }
  }, [dispatch, user]);

  const handleCreate = () => {
    setSelectedInvoice(null);
    setIsModalOpen(true);
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await dispatch(deleteInvoice(id));
    setDeleteConfirm(null);
  };

  const handleMarkAsSent = async (id) => {
    await dispatch(markInvoiceAsSent(id));
  };

  const handleMarkAsPaid = async (id) => {
    await dispatch(markInvoiceAsPaid({ id }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[status] || colors.draft;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  const formatCurrency = (amount, currency = 'SEK') => {
    return `${parseFloat(amount || 0).toFixed(2)} ${currency}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 data-cy="invoices-page-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">
          {t('nav.invoices')}
        </h1>
        <button
          onClick={handleCreate}
          data-cy="create-invoice-button"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('invoices.create')}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
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
            placeholder={t('invoices.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-cy="search-invoices-input"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-cy="status-filter-select"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">{t('invoice.statuses.draft')}</option>
            <option value="sent">{t('invoice.statuses.sent')}</option>
            <option value="paid">{t('invoice.statuses.paid')}</option>
            <option value="overdue">{t('invoice.statuses.overdue')}</option>
            <option value="cancelled">{t('invoice.statuses.cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div data-cy="invoices-error" className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
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
      {!loading && filteredInvoices.length === 0 && (
        <div data-cy="invoices-empty-state" className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter !== 'all' ? t('invoices.noResults') : t('invoices.empty')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' ? t('invoices.tryDifferentSearch') : t('invoices.emptyDescription')}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleCreate}
              data-cy="empty-state-create-button"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('invoices.createFirst')}
            </button>
          )}
        </div>
      )}

      {/* Invoice List */}
      {!loading && filteredInvoices.length > 0 && (
        <div data-cy="invoices-list" className="bg-white dark:bg-gray-800 rounded-sm shadow dark:shadow-gray-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table data-cy="invoices-table" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoice.number')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoices.client')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoice.issueDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoice.dueDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoice.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoice.total')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} data-cy={`invoice-row-${invoice.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.invoice_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {invoice.client?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(invoice.issue_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`} data-cy={`invoice-status-${invoice.id}`}>
                        {t(`invoice.statuses.${invoice.status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleMarkAsSent(invoice.id)}
                            data-cy={`mark-sent-button-${invoice.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('invoice.markAsSent')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        {invoice.status === 'sent' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            data-cy={`mark-paid-button-${invoice.id}`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title={t('invoice.markAsPaid')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(invoice)}
                          data-cy={`edit-invoice-button-${invoice.id}`}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                          title={t('common.edit')}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(invoice.id)}
                          data-cy={`delete-invoice-button-${invoice.id}`}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title={t('common.delete')}
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
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="delete-confirm-modal">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t('invoices.deleteConfirm')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('invoices.deleteWarning')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  data-cy="cancel-delete-button"
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600"
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
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        invoice={selectedInvoice}
      />
    </div>
  );
}
