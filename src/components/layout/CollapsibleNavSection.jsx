import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * CollapsibleNavSection - A collapsible navigation section with header and child items
 * 
 * @param {Object} props
 * @param {string} props.title - Section title (translated)
 * @param {string} props.sectionKey - Unique key for localStorage persistence
 * @param {Array} props.items - Navigation items with { path, label, icon, premium, disabled }
 * @param {boolean} props.defaultExpanded - Whether section is expanded by default
 * @param {boolean} props.hasPremiumAccess - Whether user has premium access
 * @param {string} props.comingSoon - If set, shows "coming soon" message instead of items
 * @param {Function} props.onNavClick - Callback when a nav item is clicked (for mobile close)
 */
export default function CollapsibleNavSection({
  title,
  sectionKey,
  items = [],
  defaultExpanded = false,
  hasPremiumAccess = false,
  comingSoon = null,
  onNavClick,
}) {
  const location = useLocation();
  const storageKey = `nav-section-${sectionKey}`;

  // Initialize from localStorage or default
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored === 'true';
    }
    return defaultExpanded;
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem(storageKey, String(isExpanded));
  }, [isExpanded, storageKey]);

  // Auto-expand if any child item is active
  useEffect(() => {
    const hasActiveItem = items.some((item) => location.pathname === item.path);
    if (hasActiveItem && !isExpanded) {
      setIsExpanded(true);
    }
  }, [location.pathname, items, isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="mb-2" data-cy={`nav-section-${sectionKey}`}>
      {/* Section Header */}
      <button
        onClick={toggleExpanded}
        data-cy={`nav-section-toggle-${sectionKey}`}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="mt-1 space-y-1" data-cy={`nav-section-content-${sectionKey}`}>
          {comingSoon ? (
            <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500 italic">
              {comingSoon}
            </div>
          ) : (
            items.map((item) => {
              const disabled = item.premium && !hasPremiumAccess;
              const Icon = item.icon;
              const BadgeComponent = item.badge;

              return (
                <Link
                  key={item.path}
                  to={disabled ? '#' : item.path}
                  data-cy={`sidebar-nav-${item.path.replace(/\//g, '-').replace(/^-/, '') || 'dashboard'}`}
                  className={`flex items-center px-4 py-2.5 ml-2 rounded-sm transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : disabled
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={(e) => {
                    if (disabled) {
                      e.preventDefault();
                    } else if (onNavClick) {
                      onNavClick();
                    }
                  }}
                >
                  {Icon && <Icon className="h-5 w-5 mr-3" />}
                  <span className="flex-1 text-sm">{item.label}</span>
                  {BadgeComponent && <BadgeComponent />}
                  {item.premium && !hasPremiumAccess && (
                    <span className="text-xs bg-yellow-400 dark:bg-yellow-500 text-gray-900 px-2 py-0.5 rounded">
                      PRO
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
