import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchSuppliers, deleteSupplier } from '../features/suppliers/suppliersSlice';
import { useOrganization } from '../contexts/OrganizationContext';
import SupplierModal from '../components/suppliers/SupplierModal';

export default function Suppliers() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { suppliers = [], loading = false, error } = useSelector((state) => state.suppliers || {});
  const { user } = useSelector((state) => state.auth);
  const { currentOrganization } = useOrganization();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch suppliers when user or organization changes
  useEffect(() => {
    if (user && currentOrganization?.id) {
      dispatch(fetchSuppliers({ organizationId: currentOrganization.id, activeOnly: !showInactive }));
    }
  }, [dispatch, user, currentOrganization?.id, showInactive]);

  const handleCreate = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteSupplier(id)).unwrap();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      // Close the delete confirm modal on error
      setDeleteConfirm(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
    // Refetch suppliers after modal closes to ensure we have latest data
    if (currentOrganization?.id) {
      dispatch(fetchSuppliers({ organizationId: currentOrganization.id, activeOnly: !showInactive }));
    }
  };

  const filteredSuppliers = Array.isArray(suppliers) 
    ? suppliers.filter((supplier) =>
        supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier?.organization_number?.includes(searchTerm)
      )
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 data-cy="suppliers-page-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0 animate-fade-in-up">
          {t('nav.suppliers')}
        </h1>
        <button
          onClick={handleCreate}
          data-cy="create-supplier-button"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('suppliers.create')}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4 animate-fade-in-up animate-delay-100">
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
            placeholder={t('suppliers.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-cy="search-suppliers-input"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            data-cy="show-inactive-checkbox"
          />
          <label htmlFor="showInactive" className="text-sm text-gray-700 dark:text-gray-300">
            {t('suppliers.showInactive')}
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div data-cy="suppliers-error" className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-sm">
          <p className="text-red-600 dark:text-red-400">
            {error.includes('supplier_invoices') || error.includes('foreign key constraint')
              ? t('suppliers.errors.hasInvoices')
              : t('suppliers.errors.deleteFailed')}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSuppliers.length === 0 && !searchTerm && (
        <div data-cy="suppliers-empty-state" className="text-center py-12 bg-white dark:bg-gray-800 rounded-sm shadow-sm animate-fade-in-up animate-delay-200">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('suppliers.empty')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('suppliers.emptyDescription')}
          </p>
          <button
            onClick={handleCreate}
            data-cy="create-first-supplier-button"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('suppliers.createFirst')}
          </button>
        </div>
      )}

      {/* No Search Results */}
      {!loading && filteredSuppliers.length === 0 && searchTerm && (
        <div data-cy="suppliers-no-results" className="text-center py-12 bg-white dark:bg-gray-800 rounded-sm shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('suppliers.noResults')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('suppliers.tryDifferentSearch')}
          </p>
        </div>
      )}

      {/* Suppliers Table */}
      {!loading && filteredSuppliers.length > 0 && (
        <div data-cy="suppliers-list" className="bg-white dark:bg-gray-800 rounded-sm shadow-sm overflow-hidden animate-fade-in-up animate-delay-200">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('suppliers.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('suppliers.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('suppliers.location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} data-cy={`supplier-row-${supplier.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {supplier.name}
                        </div>
                        {supplier.organization_number && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {supplier.organization_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{supplier.email || '-'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{supplier.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {supplier.city || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      supplier.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {supplier.is_active ? t('suppliers.isActive') : t('suppliers.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(supplier)}
                      data-cy={`edit-supplier-${supplier.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(supplier.id)}
                      data-cy={`delete-supplier-${supplier.id}`}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" data-cy="delete-confirm-modal">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 max-w-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('suppliers.deleteConfirm')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('suppliers.deleteWarning')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  data-cy="cancel-delete-button"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplier={selectedSupplier}
      />
    </div>
  );
}
