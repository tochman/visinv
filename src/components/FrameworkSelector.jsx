import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { recommendFramework, validateFrameworkEligibility } from '../utils/frameworkUtils';
import { 
  InformationCircleIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

/**
 * FrameworkSelector Component
 * US-283, US-290: K-regelverk selection with recommendation engine
 * 
 * Allows users to select Swedish accounting framework (K1/K2/K3/K4)
 * with guided recommendations based on company size
 */
export default function FrameworkSelector({ 
  value, 
  onChange, 
  companyInfo = {}, 
  showRecommendation = true,
  disabled = false 
}) {
  const { t } = useTranslation();
  const [recommendation, setRecommendation] = useState(null);
  const [validation, setValidation] = useState(null);

  // Framework definitions
  const frameworks = [
    {
      id: 'k1',
      name: 'K1',
      title: t('framework.k1.title', 'K1 - Microcompany'),
      description: t('framework.k1.description', 'For very small companies'),
      criteria: [
        t('framework.k1.criteria1', 'Annual revenue < 3M SEK'),
        t('framework.k1.criteria2', 'Fewer than 3 employees'),
        t('framework.k1.criteria3', 'Balance sheet < 1.5M SEK')
      ],
      features: [
        t('framework.k1.feature1', 'Simplest accounting rules'),
        t('framework.k1.feature2', 'Minimal disclosure requirements'),
        t('framework.k1.feature3', 'Cash accounting allowed')
      ]
    },
    {
      id: 'k2',
      name: 'K2',
      title: t('framework.k2.title', 'K2 - Small/Medium Companies'),
      description: t('framework.k2.description', 'Most common for Swedish SMBs'),
      criteria: [
        t('framework.k2.criteria1', 'Most Swedish small businesses'),
        t('framework.k2.criteria2', 'Standard accounting complexity'),
        t('framework.k2.criteria3', 'Default recommendation')
      ],
      features: [
        t('framework.k2.feature1', 'Simplified depreciation rules'),
        t('framework.k2.feature2', 'Standard reporting requirements'),
        t('framework.k2.feature3', 'Suitable for most SMBs')
      ],
      recommended: true
    },
    {
      id: 'k3',
      name: 'K3',
      title: t('framework.k3.title', 'K3 - Larger Companies'),
      description: t('framework.k3.description', 'More detailed reporting'),
      criteria: [
        t('framework.k3.criteria1', 'Larger companies'),
        t('framework.k3.criteria2', 'More complex operations'),
        t('framework.k3.criteria3', 'Revenue typically > 80M SEK')
      ],
      features: [
        t('framework.k3.feature1', 'Fair value accounting'),
        t('framework.k3.feature2', 'Detailed disclosure requirements'),
        t('framework.k3.feature3', 'Related party transactions')
      ]
    },
    {
      id: 'k4',
      name: 'K4',
      title: t('framework.k4.title', 'K4 - Listed Companies'),
      description: t('framework.k4.description', 'IFRS standards'),
      criteria: [
        t('framework.k4.criteria1', 'Publicly listed companies'),
        t('framework.k4.criteria2', 'IFRS compliant'),
        t('framework.k4.criteria3', 'Most complex requirements')
      ],
      features: [
        t('framework.k4.feature1', 'Full IFRS compliance'),
        t('framework.k4.feature2', 'Maximum disclosure'),
        t('framework.k4.feature3', 'International standards')
      ]
    }
  ];

  // Calculate recommendation when company info changes
  useEffect(() => {
    if (showRecommendation && companyInfo.revenue !== undefined) {
      const rec = recommendFramework({
        revenue: companyInfo.revenue || 0,
        employees: companyInfo.employees || 0,
        balance: companyInfo.balance || 0,
        isListed: companyInfo.isListed || false
      });
      setRecommendation(rec);
    }
  }, [companyInfo, showRecommendation]);

  // Validate selection
  useEffect(() => {
    if (value && companyInfo.revenue !== undefined) {
      const val = validateFrameworkEligibility(value, {
        revenue: companyInfo.revenue || 0,
        employees: companyInfo.employees || 0,
        balance: companyInfo.balance || 0,
        isListed: companyInfo.isListed || false,
        accountingMethod: companyInfo.accountingMethod || 'accrual'
      });
      setValidation(val);
    }
  }, [value, companyInfo]);

  const handleSelect = (frameworkId) => {
    if (!disabled) {
      onChange(frameworkId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recommendation Banner */}
      {recommendation && !value && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('framework.recommendation', 'Recommended for your business')}
              </h4>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{recommendation.framework.toUpperCase()}</span>
                {' - '}
                {recommendation.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validation && !validation.isValid && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                {t('framework.warnings', 'Eligibility Warnings')}
              </h4>
              <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
              {validation.recommendation && (
                <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-200">
                  {t('framework.considerInstead', 'Consider using')} {validation.recommendation.framework.toUpperCase()} {t('framework.instead', 'instead')}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Framework Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {frameworks.map((framework) => {
          const isSelected = value === framework.id;
          const isRecommended = recommendation?.framework === framework.id;
          
          return (
            <button
              key={framework.id}
              type="button"
              onClick={() => handleSelect(framework.id)}
              disabled={disabled}
              className={`
                relative text-left p-4 rounded-sm border-2 transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${isSelected 
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
              data-cy={`framework-option-${framework.id}`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircleIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                </div>
              )}

              {/* Recommended Badge */}
              {isRecommended && !isSelected && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {t('framework.recommended', 'Recommended')}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {framework.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {framework.description}
                  </p>
                </div>

                {/* Criteria */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                    {t('framework.criteria', 'Criteria')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {framework.criteria.map((criterion, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-gray-400 dark:text-gray-600 mr-2">•</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                    {t('framework.features', 'Features')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {framework.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-gray-400 dark:text-gray-600 mr-2">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>
          {t('framework.help', 'Choose the accounting framework (K-regelverk) that matches your company size. You can change this later in organization settings.')}
        </p>
        <a 
          href="https://www.bfn.se/regler-och-rad/k-projektet/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center mt-2"
        >
          {t('framework.learnMore', 'Learn more about K-regelverken')}
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
