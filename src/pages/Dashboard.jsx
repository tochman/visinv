import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import OrganizationSetupWizard from '../components/organization/OrganizationSetupWizard';
import DashboardCard from '../components/dashboard/DashboardCard';
import MonthlyInvoiceChart from '../components/dashboard/MonthlyInvoiceChart';
import { fetchInvoices } from '../features/invoices/invoicesSlice';

export default function Dashboard() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isPremium, invoiceCount } = useSelector((state) => state.subscriptions);
  const { items: invoices, loading: invoicesLoading } = useSelector((state) => state.invoices);
  const { currentOrganization, loading } = useOrganization();
  const [showWizard, setShowWizard] = useState(false);

  // Fetch invoices on mount
  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  // Show wizard if no organization exists
  const shouldShowWizard = !loading && !currentOrganization;

  const handleWizardComplete = () => {
    setShowWizard(false);
  };

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get draft invoices
    const draftInvoices = invoices.filter(invoice => invoice.status === 'draft');
    
    // Get overdue invoices (sent but past due date)
    const overdueInvoices = invoices.filter(invoice => {
      if (invoice.status !== 'sent') return false;
      const dueDate = new Date(invoice.due_date);
      return dueDate < now;
    });
    
    // Get active invoices (sent but not overdue yet)
    const activeInvoices = invoices.filter(invoice => {
      if (invoice.status !== 'sent') return false;
      const dueDate = new Date(invoice.due_date);
      return dueDate >= now;
    });

    // Get sent/paid invoices for this year
    const yearInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.sent_at || invoice.created_at);
      return invoiceDate.getFullYear() === currentYear && 
             (invoice.status === 'sent' || invoice.status === 'paid');
    });

    // Calculate YTD total
    const ytdTotal = yearInvoices.reduce((sum, invoice) => {
      return sum + parseFloat(invoice.total_amount || 0);
    }, 0);

    // Get primary currency from most recent invoice or organization default
    const primaryCurrency = yearInvoices[0]?.currency || 
                           currentOrganization?.default_currency || 
                           'SEK';

    // Calculate monthly totals for chart
    const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0,
    }));

    yearInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.sent_at || invoice.created_at);
      const monthIndex = invoiceDate.getMonth();
      monthlyTotals[monthIndex].total += parseFloat(invoice.total_amount || 0);
    });

    return {
      draftCount: draftInvoices.length,
      overdueCount: overdueInvoices.length,
      activeCount: activeInvoices.length,
      ytdTotal,
      primaryCurrency,
      monthlyTotals,
    };
  }, [invoices, currentOrganization]);

  // Format currency for display
  const formatCurrency = (amount, currency = 'SEK') => {
    // Format large numbers with K suffix
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K ${currency}`;
    }
    return `${amount.toFixed(2)} ${currency}`;
  };

  // Check if there are any tasks (drafts, overdue, or active)
  const hasTasks = dashboardStats.draftCount > 0 || 
                   dashboardStats.overdueCount > 0 || 
                   dashboardStats.activeCount > 0;

  if (shouldShowWizard || showWizard) {
    return <OrganizationSetupWizard onComplete={handleWizardComplete} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {t('dashboard.title')}
      </h1>

      {/* Top cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Invoices to handle card */}
        <DashboardCard title={t('dashboard.invoicesToHandle')}>
          <div className="min-h-[120px]">
            {hasTasks ? (
              <div className="space-y-3">
                {/* Draft invoices */}
                {dashboardStats.draftCount > 0 && (
                  <Link 
                    to="/invoices?status=draft" 
                    className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <span className="text-yellow-800 dark:text-yellow-200">
                      {t('dashboard.draftInvoices')}
                    </span>
                    <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {dashboardStats.draftCount}
                    </span>
                  </Link>
                )}
                
                {/* Overdue invoices */}
                {dashboardStats.overdueCount > 0 && (
                  <Link 
                    to="/invoices?status=overdue" 
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <span className="text-red-800 dark:text-red-200">
                      {t('dashboard.overdueInvoices')}
                    </span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {dashboardStats.overdueCount}
                    </span>
                  </Link>
                )}
                
                {/* Active invoices */}
                {dashboardStats.activeCount > 0 && (
                  <Link 
                    to="/invoices?status=sent" 
                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-blue-800 dark:text-blue-200">
                      {t('dashboard.activeInvoices')}
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {dashboardStats.activeCount}
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[120px]">
                <div className="text-gray-500 dark:text-gray-400">
                  {t('dashboard.noOutstandingTasks')}
                </div>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* YTD Total card */}
        <DashboardCard title={t('dashboard.sentInvoicesYtd')}>
          <div className="flex flex-col items-center justify-center min-h-[120px]">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dashboardStats.ytdTotal, dashboardStats.primaryCurrency)}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Chart card */}
      <DashboardCard>
        {invoicesLoading ? (
          <div className="flex items-center justify-center min-h-[250px]">
            <div className="text-gray-500 dark:text-gray-400">
              {t('common.loading')}
            </div>
          </div>
        ) : (
          <MonthlyInvoiceChart 
            data={dashboardStats.monthlyTotals} 
            currency={dashboardStats.primaryCurrency}
          />
        )}
      </DashboardCard>
    </div>
  );
}
