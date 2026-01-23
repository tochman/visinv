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
    return super.index({
      select: 'id, email, full_name, plan_type, is_admin, created_at, updated_at',
      order: 'created_at',
      ascending: false,
      ...options,
    });
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
      .select('id, email, full_name, plan_type, is_admin, created_at, updated_at')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    return { data, error };
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
