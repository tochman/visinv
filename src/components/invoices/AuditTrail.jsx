import { useTranslation } from 'react-i18next';
import { 
  ClockIcon, 
  PaperAirplaneIcon, 
  EyeIcon, 
  BanknotesIcon,
  ArrowPathIcon,
  BellIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

/**
 * AuditTrail Component
 * Displays timeline of invoice lifecycle events
 * US-022-E: Audit Trail for Invoice Lifecycle
 */
export default function AuditTrail({ events, loading }) {
  const { t } = useTranslation();

  // Event type to icon mapping
  const getEventIcon = (eventType) => {
    const iconClass = "h-5 w-5";
    switch (eventType) {
      case 'created':
        return <DocumentTextIcon className={iconClass} />;
      case 'sent':
        return <PaperAirplaneIcon className={iconClass} />;
      case 'viewed':
        return <EyeIcon className={iconClass} />;
      case 'payment_recorded':
        return <BanknotesIcon className={iconClass} />;
      case 'status_changed':
        return <ArrowPathIcon className={iconClass} />;
      case 'reminder_sent':
        return <BellIcon className={iconClass} />;
      case 'credit_created':
        return <DocumentDuplicateIcon className={iconClass} />;
      case 'copied':
        return <DocumentDuplicateIcon className={iconClass} />;
      case 'updated':
        return <PencilIcon className={iconClass} />;
      default:
        return <ClockIcon className={iconClass} />;
    }
  };

  // Event type to color mapping
  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'created':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'sent':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'viewed':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'payment_recorded':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'status_changed':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'reminder_sent':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'credit_created':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'copied':
        return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'updated':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  // Format date/time
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t('invoices.auditTrail.noEvents')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t('invoices.auditTrail.title')}
      </h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4" data-cy={`audit-event-${event.event_type}`}>
              {/* Icon */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${getEventColor(event.event_type)}`}>
                {getEventIcon(event.event_type)}
              </div>
              
              {/* Event details */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t(`invoices.auditTrail.eventTypes.${event.event_type}`)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {event.description}
                    </p>
                  </div>
                  <time className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap ml-4">
                    {formatDateTime(event.created_at)}
                  </time>
                </div>
                
                {/* Event data (if present) */}
                {event.event_data && Object.keys(event.event_data).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                    {event.event_data.amount && (
                      <div>Amount: {event.event_data.amount}</div>
                    )}
                    {event.event_data.payment_method && (
                      <div>Method: {event.event_data.payment_method}</div>
                    )}
                    {event.event_data.old_status && event.event_data.new_status && (
                      <div>
                        {event.event_data.old_status} → {event.event_data.new_status}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
