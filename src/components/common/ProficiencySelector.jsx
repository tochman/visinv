import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AcademicCapIcon,
  UserIcon,
  BriefcaseIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import {
  AcademicCapIcon as AcademicCapIconSolid,
  UserIcon as UserIconSolid,
  BriefcaseIcon as BriefcaseIconSolid,
  RocketLaunchIcon as RocketLaunchIconSolid,
} from '@heroicons/react/24/solid';

/**
 * ProficiencySelector Component
 * US-124: User Proficiency Level & Adaptive UI
 * 
 * Reusable component for selecting user's self-assessed proficiency level.
 * Used in onboarding wizard and profile settings.
 */

const PROFICIENCY_LEVELS = [
  {
    key: 'novice',
    Icon: AcademicCapIcon,
    IconSolid: AcademicCapIconSolid,
    color: 'emerald',
  },
  {
    key: 'basic',
    Icon: UserIcon,
    IconSolid: UserIconSolid,
    color: 'blue',
  },
  {
    key: 'proficient',
    Icon: BriefcaseIcon,
    IconSolid: BriefcaseIconSolid,
    color: 'purple',
  },
  {
    key: 'expert',
    Icon: RocketLaunchIcon,
    IconSolid: RocketLaunchIconSolid,
    color: 'amber',
  },
];

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-500',
    ring: 'ring-emerald-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
    ring: 'ring-blue-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-500',
    ring: 'ring-purple-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-500',
    ring: 'ring-amber-500',
  },
};

const ProficiencySelector = ({ 
  value, 
  onChange, 
  showDescription = true,
  compact = false,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const handleSelect = (level) => {
    if (!disabled && onChange) {
      onChange(level);
    }
  };

  if (compact) {
    // Compact mode for settings page
    return (
      <div className="space-y-2" data-cy="proficiency-selector">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROFICIENCY_LEVELS.map((level) => {
            const isSelected = value === level.key;
            const colors = colorClasses[level.color];
            const Icon = isSelected ? level.IconSolid : level.Icon;
            
            return (
              <button
                key={level.key}
                type="button"
                onClick={() => handleSelect(level.key)}
                disabled={disabled}
                className={`
                  flex flex-col items-center p-3 rounded-sm border-2 transition-all
                  ${isSelected 
                    ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}` 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                data-cy={`proficiency-option-${level.key}`}
              >
                <Icon className={`w-6 h-6 ${isSelected ? colors.icon : 'text-gray-400 dark:text-gray-500'}`} />
                <span className={`mt-1 text-sm font-medium ${isSelected ? colors.text : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`proficiency.levels.${level.key}.name`)}
                </span>
              </button>
            );
          })}
        </div>
        {showDescription && value && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t(`proficiency.levels.${value}.description`)}
          </p>
        )}
      </div>
    );
  }

  // Full mode for onboarding wizard
  return (
    <div className="space-y-3" data-cy="proficiency-selector">
      {PROFICIENCY_LEVELS.map((level) => {
        const isSelected = value === level.key;
        const colors = colorClasses[level.color];
        const Icon = isSelected ? level.IconSolid : level.Icon;
        
        return (
          <button
            key={level.key}
            type="button"
            onClick={() => handleSelect(level.key)}
            disabled={disabled}
            className={`
              w-full flex items-start p-4 rounded-sm border-2 transition-all text-left
              ${isSelected 
                ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}` 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            data-cy={`proficiency-option-${level.key}`}
          >
            <div className={`flex-shrink-0 p-2 rounded-sm ${isSelected ? colors.bg : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Icon className={`w-6 h-6 ${isSelected ? colors.icon : 'text-gray-400 dark:text-gray-500'}`} />
            </div>
            <div className="ml-4 flex-1">
              <div className={`font-medium ${isSelected ? colors.text : 'text-gray-900 dark:text-white'}`}>
                {t(`proficiency.levels.${level.key}.name`)}
              </div>
              {showDescription && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t(`proficiency.levels.${level.key}.description`)}
                </div>
              )}
            </div>
            {isSelected && (
              <div className={`flex-shrink-0 ${colors.icon}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProficiencySelector;
