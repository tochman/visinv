import { BaseResource } from './BaseResource';
import { uploadLogo, deleteLogo } from '../storage';
import { OrganizationEmailSlugHistory } from './OrganizationEmailSlugHistory';

/**
 * Organization Resource
 * Handles all organization-related data operations
 * US-053: Organization Logo Upload
 * US-264a: Organization Email Slug Management
 * US-283, US-284, US-285: Swedish Accounting Frameworks
 */
class OrganizationResource extends BaseResource {
  constructor() {
    super('organizations');
    
    // Valid framework options
    this.FRAMEWORKS = ['k1', 'k2', 'k3', 'k4'];
    this.KONTOPLAN_VARIANTS = ['bas2024', 'bas_handel', 'bas_service', 'custom'];
    this.ACCOUNTING_METHODS = ['accrual', 'cash'];
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

  /**
   * Upload logo for an organization
   * US-053: Organization Logo Upload
   * @param {string} orgId - Organization ID
   * @param {File} file - Logo image file
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async uploadLogoImage(orgId, file) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get current organization to delete old logo if exists
    const { data: org, error: orgError } = await this.show(orgId);
    if (orgError) {
      return { data: null, error: orgError };
    }

    const oldLogoPath = org?.logo_url ? this.extractPathFromUrl(org.logo_url) : null;

    // Upload new logo
    const { data: uploadData, error: uploadError } = await uploadLogo(file, user.id);
    if (uploadError) {
      return { data: null, error: uploadError };
    }

    // Update organization with new logo URL
    const { data, error } = await this.update(orgId, {
      logo_url: uploadData.url,
    });

    if (error) {
      // Rollback: delete uploaded file if update fails
      await deleteLogo(uploadData.path);
      return { data: null, error };
    }

    // Delete old logo if it existed
    if (oldLogoPath) {
      await deleteLogo(oldLogoPath);
    }

    return { data, error: null };
  }

  /**
   * Delete logo for an organization
   * US-053: Organization Logo Upload
   * @param {string} orgId - Organization ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async deleteLogoImage(orgId) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get current organization
    const { data: org, error: orgError } = await this.show(orgId);
    if (orgError) {
      return { data: null, error: orgError };
    }

    if (!org?.logo_url) {
      return { data: org, error: null }; // Nothing to delete
    }

    const logoPath = this.extractPathFromUrl(org.logo_url);

    // Delete from storage
    const { error: deleteError } = await deleteLogo(logoPath);
    if (deleteError) {
      return { data: null, error: deleteError };
    }

    // Update organization to remove logo URL
    const { data, error } = await this.update(orgId, {
      logo_url: null,
    });

    return { data, error };
  }

  /**
   * Extract storage path from public URL
   * @param {string} url - Public URL
   * @returns {string|null} - Storage path
   */
  extractPathFromUrl(url) {
    if (!url) return null;
    
    // Extract path from URL like:
    // https://xxx.supabase.co/storage/v1/object/public/logos/user-id/logo.jpg
    const match = url.match(/\/logos\/(.*)/);
    return match ? match[1] : null;
  }

  /**
   * Update organization email slug
   * US-264a: Organization Email Slug Management
   * @param {string} orgId - Organization ID
   * @param {string} newSlug - New email slug
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateEmailSlug(orgId, newSlug) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Validate slug format
    const validation = OrganizationEmailSlugHistory.validateSlugFormat(newSlug);
    if (!validation.valid) {
      return { data: null, error: new Error(validation.error) };
    }

    // Check if slug is available
    const { available, error: availabilityError } = await OrganizationEmailSlugHistory.isSlugAvailable(newSlug, orgId);
    if (availabilityError) {
      return { data: null, error: availabilityError };
    }
    if (!available) {
      return { data: null, error: new Error('This email address is already in use') };
    }

    // Update the organization (trigger will handle history)
    const { data, error } = await this.update(orgId, {
      email_slug: newSlug
    });

    return { data, error };
  }

  /**
   * Get email slug history for an organization
   * US-264a: Organization Email Slug Management
   * @param {string} orgId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getEmailSlugHistory(orgId) {
    return OrganizationEmailSlugHistory.getByOrganization(orgId);
  }

  /**
   * Generate a suggested email slug from organization name
   * US-264a: Organization Email Slug Management
   * @param {string} name - Organization name
   * @returns {string} - Suggested slug
   */
  generateEmailSlug(name) {
    return OrganizationEmailSlugHistory.generateSlug(name);
  }

  /**
   * Log framework change to audit trail
   * US-289: Framework change history
   * @param {string} orgId - Organization ID
   * @param {string} changeType - Type of change ('framework', 'method', 'kontoplan')
   * @param {string} fieldName - Field that changed
   * @param {string} oldValue - Old value
   * @param {string} newValue - New value
   * @param {string} reason - Reason for change (optional)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async logFrameworkChange(orgId, changeType, fieldName, oldValue, newValue, reason = null) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError };
    }

    const { data, error } = await this.supabase
      .from('framework_change_history')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        change_type: changeType,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        change_reason: reason
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get framework change history for organization
   * US-289: Framework change audit trail
   * @param {string} orgId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getFrameworkHistory(orgId) {
    const { data, error } = await this.supabase
      .from('framework_change_history')
      .select('*')
      .eq('organization_id', orgId)
      .order('changed_at', { ascending: false });

    return { data, error };
  }

  /**
   * Get framework requirements for accounts
   * US-286: Framework-specific account requirements
   * @param {string} framework - Framework ('k1', 'k2', 'k3', 'k4')
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async getFrameworkRequirements(framework) {
    const { data, error } = await this.supabase
      .from('account_framework_requirements')
      .select('*')
      .eq('framework', framework)
      .eq('is_required', true);

    return { data, error };
  }
}

// Export singleton instance
export const Organization = new OrganizationResource();
