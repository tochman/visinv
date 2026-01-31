import { useSelector } from 'react-redux';

/**
 * useProficiency Hook
 * US-124: User Proficiency Level & Adaptive UI
 * 
 * Custom hook for accessing and working with user proficiency level.
 * Use this hook in components to check what features/UI to show.
 * 
 * @returns {Object} Proficiency utilities
 * @returns {string} return.level - Current proficiency level ('novice', 'basic', 'proficient', 'expert')
 * @returns {boolean} return.isNovice - True if user is novice
 * @returns {boolean} return.isBasic - True if user is basic level
 * @returns {boolean} return.isProficient - True if user is proficient
 * @returns {boolean} return.isExpert - True if user is expert
 * @returns {boolean} return.isAtLeast - Function to check if user is at least a given level
 * @returns {Function} return.showFeature - Check if a feature should be shown for this level
 * 
 * @example
 * const { isNovice, isExpert, isAtLeast } = useProficiency();
 * 
 * // Hide manual account coding for novices
 * {!isNovice && <AccountCodingField />}
 * 
 * // Show advanced options only for proficient+
 * {isAtLeast('proficient') && <AdvancedOptions />}
 */

const PROFICIENCY_ORDER = ['novice', 'basic', 'proficient', 'expert'];

const useProficiency = () => {
  const level = useSelector((state) => state.auth.proficiency || 'basic');
  
  const levelIndex = PROFICIENCY_ORDER.indexOf(level);
  
  /**
   * Check if user's proficiency is at least the specified level
   * @param {string} minimumLevel - The minimum level to check ('novice', 'basic', 'proficient', 'expert')
   * @returns {boolean} True if user's level is >= minimumLevel
   */
  const isAtLeast = (minimumLevel) => {
    const minIndex = PROFICIENCY_ORDER.indexOf(minimumLevel);
    return levelIndex >= minIndex;
  };
  
  /**
   * Check if a feature should be shown based on proficiency config
   * This will be used with the feature mapping from US-125
   * @param {string} featureId - Feature identifier from proficiencyFeatures config
   * @param {Object} config - Optional feature config override
   * @returns {boolean} True if feature should be shown
   */
  const showFeature = (featureId, config = null) => {
    // Default implementation - will be enhanced in US-125 with feature mapping
    // For now, return true (show all features)
    return true;
  };
  
  /**
   * Get the UI mode for a feature based on proficiency
   * Modes: 'hidden', 'simplified', 'standard', 'advanced'
   * @param {string} featureId - Feature identifier
   * @param {Object} config - Optional feature config override
   * @returns {string} UI mode for the feature
   */
  const getUIMode = (featureId, config = null) => {
    // Default implementation - will be enhanced in US-125
    return 'standard';
  };
  
  return {
    level,
    isNovice: level === 'novice',
    isBasic: level === 'basic',
    isProficient: level === 'proficient',
    isExpert: level === 'expert',
    isAtLeast,
    showFeature,
    getUIMode,
  };
};

export default useProficiency;
