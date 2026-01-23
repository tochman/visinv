import { BaseResource } from './BaseResource';

/**
 * User Resource
 * Handles all user profile operations (admin context)
 * Note: For admin use only. Regular users should use auth context.
 */
class UserResource extends BaseResource {
  constructor() {
    super('profiles');
  }

  /**
   * Get all users (admin only)
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    // Fetch profiles
    const { data: profiles, error: profileError } = await this.supabase
      .from(this.tableName)
      .select('id, email, full_name, is_admin, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (profileError) return { data: null, error: profileError };

    // Fetch subscriptions
    const { data: subscriptions } = await this.supabase
      .from('subscriptions')
      .select('user_id, plan_type');

    // Create subscription map
    const subMap = new Map((subscriptions || []).map(s => [s.user_id, s.plan_type]));

    // Merge data
    const merged = (profiles || []).map(user => ({
      ...user,
      plan_type: subMap.get(user.id) || 'free',
    }));

    return { data: merged, error: null };
  }

  /**
   * Update user profile (admin only)
   * @param {string} id - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async update(id, updates) {
    // Add updated_at timestamp
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return super.update(id, dataToUpdate);
  }

  /**
   * Search users by email or name
   * @param {string} query - Search query
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async search(query) {
    // Fetch matching profiles
    const { data: profiles, error: profileError } = await this.supabase
      .from(this.tableName)
      .select('id, email, full_name, is_admin, created_at, updated_at')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (profileError) return { data: null, error: profileError };

    // Fetch subscriptions
    const { data: subscriptions } = await this.supabase
      .from('subscriptions')
      .select('user_id, plan_type');

    // Create subscription map
    const subMap = new Map((subscriptions || []).map(s => [s.user_id, s.plan_type]));

    // Merge data
    const merged = (profiles || []).map(user => ({
      ...user,
      plan_type: subMap.get(user.id) || 'free',
    }));

    return { data: merged, error: null };
  }

  /**
   * Get users by plan type
   * @param {string} planType - 'free' or 'premium'
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byPlan(planType) {
    return this.where([
      { column: 'plan_type', value: planType }
    ]);
  }

  /**
   * Get admin users
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async admins() {
    return this.where([
      { column: 'is_admin', value: true }
    ]);
  }
}

// Export singleton instance
export const User = new UserResource();
