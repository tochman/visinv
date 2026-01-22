import { supabase } from './supabase';

const NPS_STORAGE_KEY = 'visinv-nps-last-shown';
const NPS_COOLDOWN_DAYS = 90; // Don't show again for 90 days after responding

/**
 * NPS Service handles Net Promoter Score surveys
 * - Stores responses in Supabase
 * - Manages display frequency (cooldown period)
 * - Tracks user engagement for triggering
 */
export const npsService = {
  /**
   * Check if we should show the NPS dialog
   * @param {string} userId - Current user ID
   * @returns {boolean}
   */
  shouldShowNps(userId) {
    if (!userId) return false;

    // Check localStorage for last shown timestamp
    const lastShown = localStorage.getItem(`${NPS_STORAGE_KEY}-${userId}`);
    if (lastShown) {
      const daysSinceShown = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceShown < NPS_COOLDOWN_DAYS) {
        return false;
      }
    }

    return true;
  },

  /**
   * Mark NPS as shown to prevent showing again too soon
   * @param {string} userId - Current user ID
   */
  markAsShown(userId) {
    localStorage.setItem(`${NPS_STORAGE_KEY}-${userId}`, Date.now().toString());
  },

  /**
   * Submit NPS response
   * @param {string} userId - Current user ID
   * @param {number} score - NPS score (0-10)
   * @param {string} feedback - Optional feedback text
   * @returns {Promise<{data: any, error: any}>}
   */
  async submitNps(userId, score, feedback = null) {
    if (!supabase) {
      // Fallback: just store locally that we submitted
      this.markAsShown(userId);
      return { data: { score, feedback }, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('nps_responses')
        .insert({
          user_id: userId,
          score,
          feedback,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error) {
        this.markAsShown(userId);
      }

      return { data, error };
    } catch (err) {
      // If table doesn't exist, just store locally
      console.warn('NPS table may not exist, storing locally:', err.message);
      this.markAsShown(userId);
      return { data: { score, feedback }, error: null };
    }
  },

  /**
   * Get NPS category based on score
   * @param {number} score - NPS score (0-10)
   * @returns {'promoter' | 'passive' | 'detractor'}
   */
  getCategory(score) {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  },

  /**
   * Dismiss NPS without responding (still applies cooldown but shorter)
   * @param {string} userId - Current user ID
   */
  dismiss(userId) {
    // Use a shorter cooldown for dismissal (7 days)
    const dismissKey = `${NPS_STORAGE_KEY}-dismissed-${userId}`;
    localStorage.setItem(dismissKey, Date.now().toString());
  },

  /**
   * Check if NPS was recently dismissed
   * @param {string} userId - Current user ID
   * @returns {boolean}
   */
  wasRecentlyDismissed(userId) {
    const dismissKey = `${NPS_STORAGE_KEY}-dismissed-${userId}`;
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
      return daysSinceDismissed < 7; // 7 day cooldown for dismissal
    }
    return false;
  },

  /**
   * Full check if NPS should be displayed
   * @param {string} userId - Current user ID
   * @returns {boolean}
   */
  canShowNps(userId) {
    return this.shouldShowNps(userId) && !this.wasRecentlyDismissed(userId);
  },
};

export default npsService;
