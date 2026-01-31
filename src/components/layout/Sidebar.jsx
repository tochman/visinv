import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  SwatchIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  ChartBarIcon,
  ScaleIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { OrganizationSwitcher } from '../organization';
import CollapsibleNavSection from './CollapsibleNavSection';

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAdmin } = useSelector((state) => state.auth);
  const { isPremium } = useSelector((state) => state.subscriptions);

  // Admins have access to all premium features
  const hasPremiumAccess = isPremium || isAdmin;

  const isActive = (path) => location.pathname === path;

  // Overview section - just Dashboard (rendered separately, not collapsible)
  const dashboardItem = { path: '/', label: t('nav.dashboard'), icon: HomeIcon };

  // Invoicing module items
  const invoicingItems = [
    { path: '/invoices', label: t('nav.invoices'), icon: DocumentTextIcon },
    { path: '/clients', label: t('nav.clients'), icon: UsersIcon },
    { path: '/suppliers', label: t('nav.suppliers'), icon: BuildingStorefrontIcon },
    { path: '/products', label: t('nav.products'), icon: CubeIcon },
    { path: '/templates', label: t('nav.templates'), icon: SwatchIcon, premium: true },
  ];

  // Administration items
  const adminItems = [
    { path: '/settings', label: t('nav.settings'), icon: Cog6ToothIcon },
    { path: '/teams', label: t('nav.teams'), icon: UserGroupIcon, premium: true },
  ];

  // Accounting module items
  const accountingItems = [
    { path: '/supplier-invoices', label: t('nav.supplierInvoices'), icon: DocumentTextIcon },
    { path: '/accounts', label: t('nav.accounts'), icon: CalculatorIcon },
    { path: '/journal-entries', label: t('nav.journalEntries'), icon: ClipboardDocumentListIcon },
    { path: '/general-ledger', label: t('nav.generalLedger'), icon: BookOpenIcon },
    { path: '/reports/balance-sheet', label: t('nav.balanceSheet'), icon: ScaleIcon },
    { path: '/reports/income-statement', label: t('nav.incomeStatement'), icon: ChartBarIcon },
    { path: '/reports/vat-report', label: t('nav.vatReport'), icon: ReceiptPercentIcon },
    { path: '/import/sie', label: t('nav.sieImport'), icon: ArrowUpTrayIcon },
  ];

  // Add admin panel if user is admin
  if (isAdmin) {
    adminItems.push({ path: '/admin', label: t('nav.admin'), icon: ShieldCheckIcon });
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/20 flex flex-col h-full">
      {/* Logo and Plan Badge */}
      <div className="p-6">
        <img src="/svethna_logo.svg" alt="Svethna" className="h-10 w-auto dark:invert-0 invert" />
        {isAdmin && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-sm text-sm flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-purple-900 dark:text-purple-300 font-medium">Admin</p>
              <span className="text-purple-600 dark:text-purple-400 text-xs">Full access</span>
            </div>
          </div>
        )}
        {!hasPremiumAccess && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm text-sm">
            <p className="text-blue-900 dark:text-blue-300 font-medium">Free Plan</p>
            <Link to="/settings" className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-2 flex-1 overflow-y-auto" data-cy="sidebar-nav">
        {/* Dashboard - standalone item at top */}
        <div className="mb-4 px-2">
          <Link
            to={dashboardItem.path}
            data-cy="sidebar-nav-dashboard"
            className={`flex items-center px-4 py-3 rounded-sm transition-colors ${
              isActive(dashboardItem.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <HomeIcon className="h-5 w-5 mr-3" />
            <span>{dashboardItem.label}</span>
          </Link>
        </div>

        {/* Invoicing Module */}
        <CollapsibleNavSection
          title={t('nav.sections.invoicing')}
          sectionKey="invoicing"
          items={invoicingItems}
          defaultExpanded={true}
          hasPremiumAccess={hasPremiumAccess}
        />

        {/* Accounting Module */}
        <CollapsibleNavSection
          title={t('nav.sections.accounting')}
          sectionKey="accounting"
          items={accountingItems}
          defaultExpanded={false}
          hasPremiumAccess={hasPremiumAccess}
        />

        {/* Time & Projects Module - Coming Soon */}
        <CollapsibleNavSection
          title={t('nav.sections.timeProjects')}
          sectionKey="time-projects"
          items={[]}
          defaultExpanded={false}
          hasPremiumAccess={hasPremiumAccess}
          comingSoon={t('nav.comingSoon')}
        />

        {/* Administration */}
        <CollapsibleNavSection
          title={t('nav.sections.administration')}
          sectionKey="administration"
          items={adminItems}
          defaultExpanded={true}
          hasPremiumAccess={hasPremiumAccess}
        />
      </nav>

      {/* Organization Switcher */}
      <div className="relative mt-auto">
        <OrganizationSwitcher />
      </div>
    </div>
  );
}
