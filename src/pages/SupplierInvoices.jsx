import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchSupplierInvoices,
  deleteSupplierInvoice,
  approveSupplierInvoice,
  markSupplierInvoicePaid,
  cancelSupplierInvoice,
} from '../features/supplierInvoices/supplierInvoicesSlice';
import { fetchSuppliers } from '../features/suppliers/suppliersSlice';
import { fetchFiscalYears } from '../features/fiscalYears/fiscalYearsSlice';
import SupplierInvoiceModal from '../components/supplierInvoices/SupplierInvoiceModal';

export default function SupplierInvoices() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const currentOrganization = useSelector((state) => state.organizations?.currentOrganization);
  const invoices = useSelector((state) => state.supplierInvoices?.items || []);
  const loading = useSelector((state) => state.supplierInvoices?.loading);
  const suppliers = useSelector((state) => state.suppliers?.items || []);
  const fiscalYears = useSelector((state) => state.fiscalYears?.items || []);

  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchSupplierInvoices({ organizationId: currentOrganization.id }));
      dispatch(fetchSuppliers({ organizationId: currentOrganization.id }));
      dispatch(fetchFiscalYears(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id]);

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchQuery === '' ||
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    setEditingInvoice(null);
    setShowModal(true);
  };

  const handleEdit = (invoice) => {
    if (invoice.status !== 'draft') return;
    setEditingInvoice(invoice);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
  };

  const handleDelete = (invoice) => {
    setConfirmAction({
      type: 'delete',
      invoice,
      message: t('supplierInvoices.confirmDelete'),
    });
  };

  const handleApprove = (invoice) => {
    setConfirmAction({
      type: 'approve',
      invoice,
      message: t('supplierInvoices.confirmApprove'),
    });
  };

  const handleMarkPaid = (invoice) => {
    setConfirmAction({
      type: 'markPaid',
      invoice,
      message: t('supplierInvoices.confirmMarkPaid'),
    });
  };

  const handleCancel = (invoice) => {
    setConfirmAction({
      type: 'cancel',
      invoice,
      message: t('supplierInvoices.confirmCancel'),
    });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    const { type, invoice } = confirmAction;

    try {
      if (type === 'delete') {
        await dispatch(deleteSupplierInvoice(invoice.id)).unwrap();
      } else if (type === 'approve') {
        // Get the current fiscal year
        const currentFY = fiscalYears.find((fy) => !fy.is_closed);
        if (!currentFY) {
          alert(t('supplierInvoices.noActiveFiscalYear'));
          return;
        }
        await dispatch(approveSupplierInvoice({ id: invoice.id, fiscalYearId: currentFY.id })).unwrap();
      } else if (type === 'markPaid') {
        await dispatch(markSupplierInvoicePaid({ id: invoice.id, paymentData: {} })).unwrap();
      } else if (type === 'cancel') {
        await dispatch(cancelSupplierInvoice(invoice.id)).unwrap();
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return badges[status] || badges.draft;
  };

  const formatCurrency = (amount, currency = 'SEK') => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (!currentOrganization) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">{t('common.selectOrganization')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1
          data-cy="supplier-invoices-page-title"
          className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0 animate-fade-in-up"
        >
          {t('supplierInvoices.title')}
        </h1>

        <button
          onClick={handleCreate}
          data-cy="create-supplier-invoice-button"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('supplierInvoices.create')}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('supplierInvoices.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-cy="search-supplier-invoices-input"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-cy="status-filter-select"
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">{t('supplierInvoices.allStatuses')}</option>
            <option value="draft">{t('supplierInvoices.status.draft')}</option>
            <option value="approved">{t('supplierInvoices.status.approved')}</option>
            <option value="paid">{t('supplierInvoices.status.paid')}</option>
            <option value="cancelled">{t('supplierInvoices.status.cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && invoices.length === 0 && (
        <div data-cy="supplier-invoices-loading" className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredInvoices.length === 0 && invoices.length === 0 && (
        <div
          data-cy="supplier-invoices-empty-state"
          className="text-center py-12 bg-white dark:bg-gray-800 rounded-sm shadow"
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('supplierInvoices.noInvoices')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('supplierInvoices.emptyDescription')}
          </p>
          <button
            onClick={handleCreate}
            data-cy="create-first-supplier-invoice-button"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
          >
            {t('supplierInvoices.create')}
          </button>
        </div>
      )}

      {/* No Results */}
      {!loading && filteredInvoices.length === 0 && invoices.length > 0 && (
        <div data-cy="supplier-invoices-no-results" className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">{t('common.noResults')}</p>
        </div>
      )}

      {/* Invoice List */}
      {filteredInvoices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('supplierInvoices.invoiceNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('supplierInvoices.supplier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('supplierInvoices.invoiceDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('supplierInvoices.dueDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('supplierInvoices.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  data-cy={`supplier-invoice-row-${invoice.id}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {invoice.supplier?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {invoice.invoice_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {invoice.due_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                        invoice.status
                      )}`}
                    >
                      {t(`supplierInvoices.status.${invoice.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {invoice.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEdit(invoice)}
                            data-cy={`edit-supplier-invoice-${invoice.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleApprove(invoice)}
                            data-cy={`approve-supplier-invoice-${invoice.id}`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            {t('supplierInvoices.approve')}
                          </button>
                          <button
                            onClick={() => handleDelete(invoice)}
                            data-cy={`delete-supplier-invoice-${invoice.id}`}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {t('common.delete')}
                          </button>
                        </>
                      )}
                      {invoice.status === 'approved' && (
                        <button
                          onClick={() => handleMarkPaid(invoice)}
                          data-cy={`mark-paid-supplier-invoice-${invoice.id}`}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          {t('supplierInvoices.markPaid')}
                        </button>
                      )}
                      {(invoice.status === 'draft' || invoice.status === 'approved') && (
                        <button
                          onClick={() => handleCancel(invoice)}
                          data-cy={`cancel-supplier-invoice-${invoice.id}`}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {t('common.cancel')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <SupplierInvoiceModal
          isOpen={showModal}
          onClose={handleCloseModal}
          invoice={editingInvoice}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setConfirmAction(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('common.confirmAction')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmAction.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  data-cy="cancel-action-button"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={executeAction}
                  data-cy="confirm-action-button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
