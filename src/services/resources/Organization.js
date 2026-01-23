import { BaseResource } from './BaseResource';

/**
 * Organization Resource
 * Handles all organization-related data operations
 */
class OrganizationResource extends BaseResource {
  constructor() {
    super('organizations');
  }

  /**
   * Get all organizations for the current user
   * Joins through organization_members table
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async index(options = {}) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get organizations through membership table
    const { data: memberships, error } = await this.supabase
      .from('organization_members')
      .select(`
        role,
        is_default,
        joined_at,
        organizations(*)
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Flatten the data structure
    const organizations = (memberships || []).map(m => ({
      ...m.organizations,
      role: m.role,
      is_default: m.is_default,
      joined_at: m.joined_at
    }));

    return { data: organizations, error: null };
  }

  /**
   * Get a single organization with members
   * @param {string} id - Organization ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async show(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        organization_members(
          user_id,
          role,
          is_default,
          joined_at,
          profiles(id, full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  /**
   * Create a new organization
   * Automatically adds creator as owner via trigger
   * @param {Object} orgData - Organization data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(orgData) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Add created_by for RLS policy
    const dataToInsert = {
      ...orgData,
      created_by: user.id,
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(dataToInsert)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get user's default organization
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getDefault() {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    const { data: membership, error } = await this.supabase
      .from('organization_members')
      .select('organizations(*)')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: membership?.organizations || null, error: null };
  }

  /**
   * Set default organization for user
   * @param {string} orgId - Organization ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async setDefault(orgId) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // First, unset all defaults for this user
    await this.supabase
      .from('organization_members')
      .update({ is_default: false })
      .eq('user_id', user.id);

    // Then set the new default
    const { data, error } = await this.supabase
      .from('organization_members')
      .update({ is_default: true })
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .select('organizations(*)')
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data?.organizations || null, error: null };
  }

  /**
   * Add a member to an organization
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID to add
   * @param {string} role - 'owner' or 'associate'
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async addMember(orgId, userId, role = 'associate') {
    const { data, error } = await this.supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: userId,
        role,
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Remove a member from an organization
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID to remove
   * @returns {Promise<{data: null, error: Error|null}>}
   */
  async removeMember(orgId, userId) {
    const { error } = await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    return { data: null, error };
  }

  /**
   * Update member role
   * @param {string} orgId - Organization ID
   * @param {string} userId - User ID
   * @param {string} role - New role ('owner' or 'associate')
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateMemberRole(orgId, userId, role) {
    const { data, error } = await this.supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  }
}

// Export singleton instance
export const Organization = new OrganizationResource();
