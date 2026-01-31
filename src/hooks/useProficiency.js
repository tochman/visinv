import { useSelector } from 'react-redux';
import {
  getFeatureMode,
  shouldShowFeature,
  isFeatureCollapsed,
  getAiAutoAcceptThreshold,
  shouldShowConfirmation,
  getUiComplexitySetting,
} from '../config/proficiencyFeatures';

/**
 * useProficiency Hook
 * US-124: User Proficiency Level & Adaptive UI
 * US-125: Feature Proficiency Mapping Audit
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
 * @returns {Function} return.getUIMode - Get the UI mode for a feature
 * @returns {Function} return.isCollapsed - Check if a feature should be collapsed
 * @returns {Function} return.getAiThreshold - Get AI auto-accept threshold
 * @returns {Function} return.needsConfirmation - Check if action needs confirmation
 * @returns {Function} return.getUiSetting - Get UI complexity setting
 * 
 * @example
 * const { isNovice, isExpert, isAtLeast, showFeature } = useProficiency();
 * 
 * // Hide manual account coding for novices
 * {showFeature('invoice.accountCoding') && <AccountCodingField />}
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
   * @param {string} featureId - Feature identifier from proficiencyFeatures config
   * @returns {boolean} True if feature should be shown
   */
  const showFeature = (featureId) => {
    return shouldShowFeature(featureId, level);
  };
  
  /**
   * Get the UI mode for a feature based on proficiency
   * Modes: 'hidden', 'collapsed', 'simplified', 'standard', 'advanced', 'expanded'
   * @param {string} featureId - Feature identifier
   * @returns {string} UI mode for the feature
   */
  const getUIMode = (featureId) => {
    return getFeatureMode(featureId, level);
  };

  /**
   * Check if a feature should be collapsed by default
   * @param {string} featureId - Feature identifier
   * @returns {boolean} True if feature should be collapsed
   */
  const isCollapsed = (featureId) => {
    return isFeatureCollapsed(featureId, level);
  };

  /**
   * Get AI auto-accept threshold for current proficiency level
   * @returns {number} Confidence threshold (0-1, or 1.1 for never)
   */
  const getAiThreshold = () => {
    return getAiAutoAcceptThreshold(level);
  };

  /**
   * Check if an action needs confirmation dialog
   * @param {string} actionId - Action identifier (e.g., 'delete.invoice')
   * @returns {boolean} True if confirmation should be shown
   */
  const needsConfirmation = (actionId) => {
    return shouldShowConfirmation(actionId, level);
  };

  /**
   * Get UI complexity setting for current proficiency level
   * @param {string} settingId - Setting identifier (e.g., 'listPreviewCount')
   * @returns {*} The setting value
   */
  const getUiSetting = (settingId) => {
    return getUiComplexitySetting(settingId, level);
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
    isCollapsed,
    getAiThreshold,
    needsConfirmation,
    getUiSetting,
  };
};

export default useProficiency;
