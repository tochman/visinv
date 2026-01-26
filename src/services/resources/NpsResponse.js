import { BaseResource } from './BaseResource';

/**
 * NpsResponse Resource
 * Handles Net Promoter Score (NPS) survey responses
 */
class NpsResponseResource extends BaseResource {
  constructor() {
    super('nps_responses');
  }

  /**
   * Check if user is eligible to see NPS survey
   * User must have created at least 3 of any: invoices, clients, or products
   * AND not seen survey in last 30 days
   * @returns {Promise<{eligible: boolean, reason: string|null, error: Error|null}>}
   */
  async checkEligibility() {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { eligible: false, reason: 'not_authenticated', error: authError };
    }

    try {
      // Check last time survey was shown (30-day interval)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentSurveys, error: surveyError } = await this.supabase
        .from(this.tableName)
        .select('shown_at')
        .eq('user_id', user.id)
        .gte('shown_at', thirtyDaysAgo.toISOString())
        .order('shown_at', { ascending: false })
        .limit(1);

      if (surveyError) {
        return { eligible: false, reason: 'query_error', error: surveyError };
      }

      // If shown in last 30 days, not eligible
      if (recentSurveys && recentSurveys.length > 0) {
        return { eligible: false, reason: 'recent_survey', error: null };
      }

      // Check if user has created at least 3 invoices, clients, or products
      const [invoicesResult, clientsResult, productsResult] = await Promise.all([
        this.supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        this.supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        this.supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      const invoiceCount = invoicesResult.count || 0;
      const clientCount = clientsResult.count || 0;
      const productCount = productsResult.count || 0;

      const hasMinimumActivity = invoiceCount >= 3 || clientCount >= 3 || productCount >= 3;

      if (!hasMinimumActivity) {
        return { eligible: false, reason: 'insufficient_activity', error: null };
      }

      // Check if previously responded - 20% chance to show again
      const { data: previousResponses, error: responseError } = await this.supabase
        .from(this.tableName)
        .select('responded_at')
        .eq('user_id', user.id)
        .not('responded_at', 'is', null)
        .limit(1);

      if (responseError) {
        return { eligible: false, reason: 'query_error', error: responseError };
      }

      if (previousResponses && previousResponses.length > 0) {
        // 20% chance to show again
        const randomChance = Math.random();
        if (randomChance > 0.2) {
          return { eligible: false, reason: 'already_responded', error: null };
        }
      }

      return { eligible: true, reason: null, error: null };
    } catch (err) {
      return { eligible: false, reason: 'exception', error: err };
    }
  }

  /**
   * Record that survey was shown to user
   * @param {string} triggerContext - What triggered the survey (e.g., 'invoice_created')
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async recordShown(triggerContext) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        user_id: user.id,
        trigger_context: triggerContext,
        shown_at: new Date().toISOString(),
        score: null, // Will be filled when user responds
        feedback: null
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Submit NPS response
   * @param {string} responseId - The ID of the shown survey record
   * @param {number} score - NPS score (0-10)
   * @param {string} feedback - Optional feedback text
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async submitResponse(responseId, score, feedback = '') {
    if (score < 0 || score > 10) {
      return { data: null, error: new Error('Score must be between 0 and 10') };
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        score,
        feedback,
        responded_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Dismiss survey without responding
   * Just marks it as shown without a response
   * @param {string} responseId - The ID of the shown survey record
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async dismiss(responseId) {
    // No update needed - the record exists with shown_at but null responded_at
    // This counts as "shown" for the 30-day interval
    return { data: { dismissed: true }, error: null };
  }

  /**
   * Get user's NPS response history
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getUserHistory() {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError };
    }

    return await this.index({
      filters: [{ column: 'user_id', value: user.id }],
      order: 'shown_at',
      ascending: false
    });
  }
}

export const NpsResponse = new NpsResponseResource();
