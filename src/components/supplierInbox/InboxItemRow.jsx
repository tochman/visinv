import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  DocumentIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ArchiveBoxIcon,
  TrashIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  archiveInboxItem,
  deleteInboxItem,
} from '../../features/supplierInbox/supplierInboxSlice';
import { SupplierInboxItem } from '../../services/resources';
import { useToast } from '../../context/ToastContext';

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get icon for file type
 */
function getFileIcon(contentType) {
  if (contentType?.startsWith('image/')) {
    return PhotoIcon;
  }
  return DocumentIcon;
}

/**
 * Get status badge config
 */
function getStatusConfig(status, t) {
  switch (status) {
    case 'new':
      return {
        icon: ClockIcon,
        label: t('supplierInbox.status.new'),
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      };
    case 'processed':
      return {
        icon: CheckCircleIcon,
        label: t('supplierInbox.status.processed'),
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'archived':
      return {
        icon: ArchiveBoxIcon,
        label: t('supplierInbox.status.archived'),
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      };
    case 'duplicate':
      return {
        icon: DocumentDuplicateIcon,
        label: t('supplierInbox.status.duplicate'),
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'no_attachment':
      return {
        icon: InformationCircleIcon,
        label: t('supplierInbox.status.no_attachment'),
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      };
    default:
      return {
        icon: ClockIcon,
        label: status,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      };
  }
}

export default function InboxItemRow({ item, isSelected, onSelect, onRefresh }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const statusConfig = getStatusConfig(item.status, t);
  const StatusIcon = statusConfig.icon;
  const FileIcon = getFileIcon(item.content_type);

  const handleProcess = () => {
    // Navigate to supplier invoices with inbox item context
    // The OCR modal will be opened with this item's attachment
    navigate(`/supplier-invoices?inbox=${item.id}`);
  };

  const handleDownload = async () => {
    if (!item.storage_path) return;
    
    setIsDownloading(true);
    try {
      const { blob, error } = await SupplierInboxItem.downloadFile(item.storage_path);
      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(t('common.downloadError'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleArchive = async () => {
    setConfirmAction({
      type: 'archive',
      onConfirm: async () => {
        const result = await dispatch(archiveInboxItem({ id: item.id, userId: null }));
        if (!result.error) {
          toast.success(t('supplierInbox.archiveSuccess'));
          onRefresh?.();
        }
        setConfirmAction(null);
      },
    });
  };

  const handleDelete = async () => {
    setConfirmAction({
      type: 'delete',
      onConfirm: async () => {
        const result = await dispatch(deleteInboxItem(item.id));
        if (!result.error) {
          toast.success(t('supplierInbox.deleteSuccess'));
          onRefresh?.();
        }
        setConfirmAction(null);
      },
    });
  };

  const handlePreview = async () => {
    if (!item.storage_path) return;
    
    try {
      const { url, error } = await SupplierInboxItem.getFileUrl(item.storage_path);
      if (error) throw error;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(t('common.previewError'));
    }
  };

  return (
    <>
      <div 
        className="grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        data-cy="inbox-item-row"
        data-item-id={item.id}
      >
        {/* Checkbox */}
        <div className="hidden sm:flex sm:col-span-1 items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            data-cy="inbox-item-checkbox"
          />
        </div>

        {/* Date + Status (Mobile: full row, Desktop: col-span-2) */}
        <div className="sm:col-span-2 flex items-center gap-2">
          <div className="sm:hidden">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-3"
            />
          </div>
          <div>
            <div className="text-sm text-gray-900 dark:text-white">
              {formatDate(item.received_at)}
            </div>
            <div className="sm:hidden mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusConfig.className}`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Sender */}
        <div className="sm:col-span-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate" data-cy="inbox-item-sender">
            {item.from_name || item.sender_email}
          </div>
          {item.from_name && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.sender_email}
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="sm:col-span-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate" data-cy="inbox-item-subject">
              {item.subject || t('supplierInbox.noSubject')}
            </span>
            {item.status === 'duplicate' && (
              <span title={t('supplierInbox.duplicateTooltip')} className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" data-cy="inbox-duplicate-indicator" />
              </span>
            )}
            {item.status === 'no_attachment' && (
              <span title={t('supplierInbox.noAttachmentTooltip')} className="flex-shrink-0">
                <InformationCircleIcon className="h-4 w-4 text-gray-400" data-cy="inbox-no-attachment-indicator" />
              </span>
            )}
          </div>
          {/* Status badge - Desktop only */}
          <div className="hidden sm:block mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusConfig.className}`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Attachment */}
        <div className="sm:col-span-2">
          {item.file_name ? (
            <div className="flex items-center gap-2">
              <FileIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-gray-700 dark:text-gray-300 truncate" title={item.file_name}>
                  {item.file_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(item.file_size)}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">
              {t('supplierInbox.noAttachment')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="sm:col-span-1 flex items-center justify-end sm:justify-center gap-1">
          {/* Process - only for items with attachments */}
          {item.storage_path && item.status !== 'processed' && (
            <button
              onClick={handleProcess}
              title={t('supplierInbox.actions.process')}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              data-cy="inbox-item-process"
            >
              <DocumentPlusIcon className="h-5 w-5" />
            </button>
          )}

          {/* Download */}
          {item.storage_path && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              title={t('supplierInbox.actions.download')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              data-cy="inbox-item-download"
            >
              <ArrowDownTrayIcon className={`h-5 w-5 ${isDownloading ? 'animate-bounce' : ''}`} />
            </button>
          )}

          {/* Archive */}
          {item.status !== 'archived' && (
            <button
              onClick={handleArchive}
              title={t('supplierInbox.actions.archive')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              data-cy="inbox-item-archive"
            >
              <ArchiveBoxIcon className="h-5 w-5" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            title={t('supplierInbox.actions.delete')}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            data-cy="inbox-item-delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Inline Confirmation */}
      {confirmAction && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {confirmAction.type === 'archive'
                ? t('supplierInbox.confirmArchive')
                : t('supplierInbox.confirmDelete')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                data-cy="inline-confirm-cancel"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className={`px-3 py-1.5 text-sm text-white rounded ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                data-cy="inline-confirm-action"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
