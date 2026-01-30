import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, LockClosedIcon, DocumentDuplicateIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useToast } from '../context/ToastContext';
import { fetchInvoices, deleteInvoice, markInvoiceAsSent, markInvoiceAsPaid, updateInvoiceTemplate, copyInvoice } from '../features/invoices/invoicesSlice';
import { fetchTemplates } from '../features/invoiceTemplates/invoiceTemplatesSlice';
import { fetchSubscription, fetchInvoiceCount } from '../features/subscriptions/subscriptionsSlice';
import InvoiceModal from '../components/invoices/InvoiceModal';
import PaymentConfirmationDialog from '../components/invoices/PaymentConfirmationDialog';
import UpgradeModal from '../components/common/UpgradeModal';
import { generateInvoicePDF, buildInvoiceContext } from '../services/invoicePdfService';
import { renderTemplate } from '../services/templateService';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatCurrency } from '../config/currencies';
import { Payment } from '../services/resources';
import { appConfig } from '../config/constants';

export default function Invoices() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { items: invoices, loading, error } = useSelector((state) => state.invoices);
  const { items: templates } = useSelector((state) => state.invoiceTemplates);
  const { user } = useSelector((state) => state.auth);
  const { currentOrganization } = useOrganization();
  const { invoiceCount, isPremium } = useSelector((state) => state.subscriptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Re-fetch data when user or organization changes
  useEffect(() => {
    if (user && currentOrganization?.id) {
      dispatch(fetchInvoices(currentOrganization.id));
      dispatch(fetchTemplates());
      dispatch(fetchSubscription(user.id));
      dispatch(fetchInvoiceCount(user.id));
    }
  }, [dispatch, user, currentOrganization?.id]);

  const handleCreate = () => {
    // Check free tier limit
    if (invoiceCount >= appConfig.freeInvoiceLimit && !isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedInvoice(null);
    setViewOnly(false);
    setIsModalOpen(true);
  };

  const isInvoiceEditable = (invoice) => {
    return invoice.status === 'draft';
  };

  const handleEdit = (invoice) => {
    if (!isInvoiceEditable(invoice)) {
      toast.error(t('invoice.cannotEditSent'));
      return;
    }
    setSelectedInvoice(invoice);
    setViewOnly(false);
    setIsModalOpen(true);
  };

  const handleView = (invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleCopy = async (invoice) => {
    const result = await dispatch(copyInvoice(invoice.id));
    if (copyInvoice.fulfilled.match(result)) {
      setSelectedInvoice(result.payload);
      setViewOnly(false);
      setIsModalOpen(true);
      toast.success(t('invoice.invoiceCopied'));
    } else {
      toast.error(result.payload || 'Failed to copy invoice');
    }
  };

  const handleDelete = async (id) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice && !isInvoiceEditable(invoice)) {
      toast.error(t('invoice.cannotDeleteSent'));
      setDeleteConfirm(null);
      return;
    }
    await dispatch(deleteInvoice(id));
    setDeleteConfirm(null);
  };

  const handleMarkAsSent = async (id) => {
    await dispatch(markInvoiceAsSent(id));
  };

  const handleMarkAsPaid = async (invoice) => {
    setPaymentDialogInvoice(invoice);
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = async (paymentData) => {
    try {
      // Create payment record
      const { data, error } = await Payment.create({
        invoice_id: paymentDialogInvoice.id,
        ...paymentData,
      });

      if (error) {
        alert(t('payment.errors.required'));
        throw error;
      }

      // Mark invoice as paid
      await dispatch(markInvoiceAsPaid({ id: paymentDialogInvoice.id }));
      
      // Refresh invoices to show updated status
      dispatch(fetchInvoices(currentOrganization?.id));
      
      setShowPaymentDialog(false);
      setPaymentDialogInvoice(null);
    } catch (error) {
      console.error('Failed to record payment:', error);
      throw error;
    }
  };

  const handleSendReminder = async (invoice) => {
    try {
      const { Invoice } = await import('../services/resources');
      await Invoice.markReminderSent(invoice.id);
      // Refresh invoices to show updated reminder status
      dispatch(fetchInvoices(currentOrganization?.id));
      // TODO: In future, this would trigger email sending
      alert(`Reminder marked as sent for invoice ${invoice.invoice_number}`);
    } catch (error) {
      console.error('Failed to mark reminder as sent:', error);
      alert('Failed to mark reminder as sent');
    }
  };

  const handleTemplateChange = (invoice, templateId) => {
    const template = templateId ? templates.find(t => t.id === templateId) : null;
    dispatch(updateInvoiceTemplate({
      invoiceId: invoice.id,
      templateId: templateId || null,
      template: template ? { id: template.id, name: template.name, is_system: template.is_system } : null
    }));
  };

  const handleDownloadPDF = async (invoice) => {
    setGeneratingPDF(invoice.id);
    try {
      // Use invoice's selected template, or find first available
      let template;
      if (invoice.invoice_template_id) {
        template = templates.find(t => t.id === invoice.invoice_template_id);
      }
      if (!template) {
        // Fallback: prioritize system templates
        template = templates.find(t => t.is_system) || templates[0];
      }
      if (!template) {
        alert(t('invoices.noTemplateAvailable'));
        return;
      }
      await generateInvoicePDF(invoice, template, currentOrganization);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(t('invoices.pdfError'));
    } finally {
      setGeneratingPDF(null);
    }
  };

  const handlePreviewPDF = (invoice) => {
    // Use invoice's selected template, or find first available
    let template;
    if (invoice.invoice_template_id) {
      template = templates.find(t => t.id === invoice.invoice_template_id);
    }
    if (!template) {
      // Fallback: prioritize system templates
      template = templates.find(t => t.is_system) || templates[0];
    }
    if (!template) {
      alert(t('invoices.noTemplateAvailable'));
      return;
    }
    
    const context = buildInvoiceContext(invoice, currentOrganization);
    const rendered = renderTemplate(template.content, context);
    
    // Open preview in new window
    const previewWindow = window.open('', '_blank', 'width=900,height=1100');
    previewWindow.document.write(rendered);
    previewWindow.document.close();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
    setViewOnly(false);
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

  const getTypeColor = (type) => {
    return type === 'CREDIT'
      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  };

  const isOverdue = (invoice) => {
    if (invoice.status !== 'sent') return false;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return dueDate < today;
  };

  const getDaysOverdue = (invoice) => {
    if (!isOverdue(invoice)) return 0;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  };

  const getOverdueClass = (invoice) => {
    if (!isOverdue(invoice)) return '';
    return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 data-cy="invoices-page-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0 animate-fade-in-up">
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up animate-delay-100">
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
        </div>        {/* Status Filter */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('invoice.template')}
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
                  <tr 
                    key={invoice.id} 
                    data-cy={`invoice-row-${invoice.id}`} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${getOverdueClass(invoice)}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        <span className="flex items-center gap-2">
                          {invoice.invoice_number}
                          {invoice.is_recurring && (
                            <span 
                              className="relative group inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              data-cy={`recurring-schedule-indicator-${invoice.id}`}
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                              <span 
                                className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap z-10"
                                data-cy={`recurring-tooltip-${invoice.id}`}
                              >
                                {t('invoices.recurringFrequency')}: {invoice.recurring_frequency ? t(`invoices.frequency${invoice.recurring_frequency.charAt(0).toUpperCase() + invoice.recurring_frequency.slice(1)}`) : ''}
                              </span>
                            </span>
                          )}
                          {invoice.recurring_parent_id && (
                            <span 
                              className="relative group inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              data-cy={`recurring-child-indicator-${invoice.id}`}
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                              <span 
                                className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap z-10"
                              >
                                {t('invoices.recurringGenerated')}
                              </span>
                            </span>
                          )}
                        </span>
                        {isOverdue(invoice) && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1" data-cy={`overdue-indicator-${invoice.id}`}>
                            {t('reminder.overdueBy')} {getDaysOverdue(invoice)} {getDaysOverdue(invoice) === 1 ? t('reminder.day') : t('reminder.days')}
                          </div>
                        )}
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
                      <div className="flex gap-1 flex-wrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`} data-cy={`invoice-status-${invoice.id}`}>
                          {t(`invoice.statuses.${invoice.status}`)}
                        </span>
                        {invoice.invoice_type === 'CREDIT' && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor('CREDIT')}`} data-cy={`invoice-type-${invoice.id}`}>
                            {t('invoices.creditNote')}
                          </span>
                        )}
                        {invoice.reminder_sent_at && (
                          <span 
                            className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                            data-cy={`reminder-badge-${invoice.id}`}
                            title={`${t('reminder.lastReminder')}: ${formatDate(invoice.reminder_sent_at)}`}
                          >
                            {t('reminder.reminderSent')} ({invoice.reminder_count || 1})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={invoice.invoice_template_id || ''}
                        onChange={(e) => handleTemplateChange(invoice, e.target.value)}
                        data-cy={`template-select-${invoice.id}`}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-w-[140px]"
                      >
                        <option value="">{t('invoice.defaultTemplate')}</option>
                        {templates.filter(t => t.is_system).length > 0 && (
                          <optgroup label={t('invoice.systemTemplates')}>
                            {templates.filter(t => t.is_system).map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {templates.filter(t => !t.is_system).length > 0 && (
                          <optgroup label={t('invoice.myTemplates')}>
                            {templates.filter(t => !t.is_system).map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePreviewPDF(invoice)}
                          data-cy={`preview-pdf-button-${invoice.id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title={t('invoice.preview') || 'Preview'}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          data-cy={`download-pdf-button-${invoice.id}`}
                          disabled={generatingPDF === invoice.id}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('invoice.downloadPDF')}
                        >
                          {generatingPDF === invoice.id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                          )}
                        </button>
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
                            onClick={() => handleMarkAsPaid(invoice)}
                            data-cy={`mark-paid-button-${invoice.id}`}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title={t('invoice.markAsPaid')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {isOverdue(invoice) && (
                          <button
                            onClick={() => handleSendReminder(invoice)}
                            data-cy={`send-reminder-button-${invoice.id}`}
                            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                            title={t('reminder.sendReminder')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </button>
                        )}
                        {!isInvoiceEditable(invoice) && (
                          <button
                            onClick={() => handleView(invoice)}
                            data-cy={`view-invoice-button-${invoice.id}`}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            title={t('invoice.viewInvoice')}
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        )}
                        {isInvoiceEditable(invoice) && (
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
                        )}
                        <button
                          onClick={() => handleCopy(invoice)}
                          data-cy={`copy-invoice-button-${invoice.id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title={t('invoice.copyInvoice')}
                        >
                          <DocumentDuplicateIcon className="w-5 h-5" />
                        </button>
                        {isInvoiceEditable(invoice) && (
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
                        )}
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
        viewOnly={viewOnly}
        onCopy={viewOnly && selectedInvoice ? () => {
          setIsModalOpen(false);
          handleCopy(selectedInvoice);
        } : null}
      />

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        isOpen={showPaymentDialog}
        onClose={() => {
          setShowPaymentDialog(false);
          setPaymentDialogInvoice(null);
        }}
        invoice={paymentDialogInvoice}
        onConfirm={handleConfirmPayment}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
