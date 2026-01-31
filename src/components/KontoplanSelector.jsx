import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

/**
 * KontoplanSelector Component
 * US-284: Chart of Accounts (Kontoplan) variant selection
 * 
 * Allows users to select BAS kontoplan variant or custom import
 */
export default function KontoplanSelector({ 
  value, 
  onChange, 
  disabled = false 
}) {
  const { t } = useTranslation();

  // Kontoplan variants
  const variants = [
    {
      id: 'bas2024',
      name: 'BAS 2024',
      title: t('kontoplan.bas2024.title', 'BAS 2024 - Standard'),
      description: t('kontoplan.bas2024.description', 'Standard Swedish chart of accounts'),
      recommended: true,
      details: [
        t('kontoplan.bas2024.detail1', 'Most widely used in Sweden'),
        t('kontoplan.bas2024.detail2', 'Suitable for most businesses'),
        t('kontoplan.bas2024.detail3', 'Regularly updated')
      ],
      sampleAccounts: [
        '1510 - Kundfordringar',
        '2440 - Leverantörsskulder',
        '3000 - Försäljning'
      ]
    },
    {
      id: 'bas_handel',
      name: 'BAS Handel',
      title: t('kontoplan.basHandel.title', 'BAS Handel - Retail/Trade'),
      description: t('kontoplan.basHandel.description', 'Specialized for retail and trade businesses'),
      details: [
        t('kontoplan.basHandel.detail1', 'Optimized for inventory management'),
        t('kontoplan.basHandel.detail2', 'Cost of goods sold accounts'),
        t('kontoplan.basHandel.detail3', 'Retail-specific accounts')
      ],
      sampleAccounts: [
        '1400 - Varulager',
        '4000 - Inköp varor',
        '4900 - Handelsvaror'
      ]
    },
    {
      id: 'bas_service',
      name: 'BAS Tjänsteföretag',
      title: t('kontoplan.basService.title', 'BAS Tjänsteföretag - Service Companies'),
      description: t('kontoplan.basService.description', 'Tailored for service-based businesses'),
      details: [
        t('kontoplan.basService.detail1', 'Service-oriented accounts'),
        t('kontoplan.basService.detail2', 'Time tracking integration'),
        t('kontoplan.basService.detail3', 'Consultant-focused')
      ],
      sampleAccounts: [
        '3040 - Tjänsteintäkter',
        '5400 - Konsulter',
        '7010 - Kontorsmaterial'
      ]
    },
    {
      id: 'custom',
      name: t('kontoplan.custom.name', 'Custom'),
      title: t('kontoplan.custom.title', 'Custom - Import Your Own'),
      description: t('kontoplan.custom.description', 'Import your own chart of accounts'),
      details: [
        t('kontoplan.custom.detail1', 'CSV import supported'),
        t('kontoplan.custom.detail2', 'Full customization'),
        t('kontoplan.custom.detail3', 'Advanced users')
      ],
      sampleAccounts: [
        t('kontoplan.custom.sample', 'Your own account structure')
      ],
      advanced: true
    }
  ];

  const handleSelect = (variantId) => {
    if (!disabled) {
      onChange(variantId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          {t('kontoplan.info', 'The chart of accounts (kontoplan) determines which accounts are available for bookkeeping. BAS 2024 is recommended for most businesses.')}
        </p>
      </div>

      {/* Variant Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variants.map((variant) => {
          const isSelected = value === variant.id;
          
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => handleSelect(variant.id)}
              disabled={disabled}
              className={`
                relative text-left p-4 rounded-sm border-2 transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${isSelected 
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
              data-cy={`kontoplan-option-${variant.id}`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircleIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                </div>
              )}

              {/* Recommended Badge */}
              {variant.recommended && !isSelected && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {t('kontoplan.recommended', 'Recommended')}
                  </span>
                </div>
              )}

              {/* Advanced Badge */}
              {variant.advanced && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                    {t('kontoplan.advanced', 'Advanced')}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {variant.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {variant.description}
                  </p>
                </div>

                {/* Details */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                    {t('kontoplan.features', 'Features')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {variant.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-gray-400 dark:text-gray-600 mr-2">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sample Accounts */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                    {t('kontoplan.examples', 'Example Accounts')}
                  </p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-mono space-y-0.5">
                    {variant.sampleAccounts.map((account, idx) => (
                      <div key={idx}>{account}</div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>
          {t('kontoplan.help', 'You can add, modify, or deactivate accounts later in the Chart of Accounts (Kontoplan) section.')}
        </p>
        <a 
          href="https://www.bas.se/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center mt-2"
        >
          {t('kontoplan.learnMore', 'Learn more about BAS kontoplan')}
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
