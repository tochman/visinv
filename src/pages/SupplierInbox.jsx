import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  InboxIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  fetchInboxItems,
  fetchNewInboxCount,
  archiveInboxItems,
  deleteInboxItems,
  setFilters,
  selectAll,
  clearSelection,
  toggleSelectItem,
} from '../features/supplierInbox/supplierInboxSlice';
import InboxItemRow from '../components/supplierInbox/InboxItemRow';
import { useToast } from '../context/ToastContext';

export default function SupplierInbox() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const toast = useToast();

  const currentOrganization = useSelector((state) => state.organizations?.currentOrganization);
  const { items, loading, filters, selectedIds, newCount } = useSelector(
    (state) => state.supplierInbox
  );

  const [searchInput, setSearchInput] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Fetch inbox items on mount and when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      dispatch(fetchInboxItems({ 
        organizationId: currentOrganization.id,
        options: { status: filters.status }
      }));
      dispatch(fetchNewInboxCount(currentOrganization.id));
    }
  }, [dispatch, currentOrganization?.id, filters.status]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({ search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch]);

  const handleRefresh = () => {
    if (currentOrganization?.id) {
      dispatch(fetchInboxItems({ 
        organizationId: currentOrganization.id,
        options: { status: filters.status }
      }));
      dispatch(fetchNewInboxCount(currentOrganization.id));
    }
  };

  const handleStatusFilter = (status) => {
    dispatch(setFilters({ status }));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      dispatch(clearSelection());
    } else {
      dispatch(selectAll());
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    setConfirmAction({
      type: 'archiveMany',
      count: selectedIds.length,
      onConfirm: async () => {
        const result = await dispatch(archiveInboxItems({ 
          ids: selectedIds,
          userId: null // Will be set by RLS context
        }));
        if (!result.error) {
          toast.success(t('supplierInbox.archiveSuccess'));
          handleRefresh();
        }
        setConfirmAction(null);
      },
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setConfirmAction({
      type: 'deleteMany',
      count: selectedIds.length,
      onConfirm: async () => {
        const result = await dispatch(deleteInboxItems(selectedIds));
        if (!result.error) {
          toast.success(t('supplierInbox.deleteSuccess'));
          handleRefresh();
        }
        setConfirmAction(null);
      },
    });
  };

  // Filter items based on search
  const filteredItems = items.filter((item) => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      item.sender_email?.toLowerCase().includes(search) ||
      item.subject?.toLowerCase().includes(search) ||
      item.file_name?.toLowerCase().includes(search)
    );
  });

  const statusFilters = [
    { value: null, label: t('supplierInbox.filters.all') },
    { value: 'new', label: t('supplierInbox.filters.new') },
    { value: 'processed', label: t('supplierInbox.filters.processed') },
    { value: 'archived', label: t('supplierInbox.filters.archived') },
  ];

  const hasEmailSlug = !!currentOrganization?.email_slug;

  return (
    <div className="p-6" data-cy="supplier-inbox-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <InboxIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('supplierInbox.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('supplierInbox.description')}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          data-cy="inbox-refresh-button"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {/* Email Setup Notice */}
      {!hasEmailSlug && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-cy="inbox-setup-notice">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
            {t('supplierInbox.emailSetup.noSlugTitle')}
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            {t('supplierInbox.emailSetup.noSlugDescription')}
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:underline"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            {t('supplierInbox.emailSetup.goToSettings')}
          </Link>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1" data-cy="inbox-status-filters">
          {statusFilters.map((filter) => (
            <button
              key={filter.value || 'all'}
              onClick={() => handleStatusFilter(filter.value)}
              data-cy={`inbox-filter-${filter.value || 'all'}`}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filters.status === filter.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {filter.label}
              {filter.value === 'new' && newCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('supplierInbox.searchPlaceholder') || 'Search by sender or subject...'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-cy="inbox-search-input"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-cy="inbox-bulk-actions">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {selectedIds.length} {t('common.selected')}
          </span>
          <button
            onClick={handleArchiveSelected}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
            data-cy="inbox-archive-selected"
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            {t('supplierInbox.actions.archiveSelected')}
          </button>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            data-cy="inbox-delete-selected"
          >
            <TrashIcon className="h-4 w-4" />
            {t('supplierInbox.actions.deleteSelected')}
          </button>
          <button
            onClick={() => dispatch(clearSelection())}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {t('common.clearSelection')}
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Table Header */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              data-cy="inbox-select-all"
            />
          </div>
          <div className="col-span-2">{t('supplierInbox.received')}</div>
          <div className="col-span-3">{t('supplierInbox.from')}</div>
          <div className="col-span-3">{t('supplierInbox.subject')}</div>
          <div className="col-span-2">{t('supplierInbox.attachment')}</div>
          <div className="col-span-1">{t('common.actions')}</div>
        </div>

        {/* Loading State */}
        {loading && items.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="h-8 w-8 mx-auto mb-2 animate-spin" />
            {t('common.loading')}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="p-12 text-center" data-cy="inbox-empty-state">
            <InboxIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('supplierInbox.emptyState')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t('supplierInbox.emptyStateDescription')}
            </p>
            {hasEmailSlug && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t('common.sendTo')}: <span className="font-mono text-blue-600 dark:text-blue-400">{currentOrganization.email_slug}@dortal.resend.app</span>
              </p>
            )}
          </div>
        )}

        {/* Items */}
        {!loading && filteredItems.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700" data-cy="inbox-items-list">
            {filteredItems.map((item) => (
              <InboxItemRow
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onSelect={() => dispatch(toggleSelectItem(item.id))}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-cy="inbox-confirm-modal">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {confirmAction.type === 'archiveMany' 
                ? t('supplierInbox.confirmArchiveMany', { count: confirmAction.count })
                : t('supplierInbox.confirmDeleteMany', { count: confirmAction.count })
              }
            </h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                data-cy="confirm-cancel"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className={`px-4 py-2 text-sm text-white rounded-lg ${
                  confirmAction.type === 'deleteMany' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                data-cy="confirm-action"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
