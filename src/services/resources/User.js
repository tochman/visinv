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
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        id,
        email,
        full_name,
        is_admin,
        created_at,
        updated_at,
        subscriptions(plan_type)
      `)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Flatten subscription data
    const flattenedData = (data || []).map(user => ({
      ...user,
      plan_type: user.subscriptions?.plan_type || 'free',
      subscriptions: undefined,
    }));

    return { data: flattenedData, error: null };
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
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        id,
        email,
        full_name,
        is_admin,
        created_at,
        updated_at,
        subscriptions(plan_type)
      `)
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Flatten subscription data
    const flattenedData = (data || []).map(user => ({
      ...user,
      plan_type: user.subscriptions?.plan_type || 'free',
      subscriptions: undefined,
    }));

    return { data: flattenedData, error: null };
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
