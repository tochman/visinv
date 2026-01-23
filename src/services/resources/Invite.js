import { BaseResource } from './BaseResource';

/**
 * Invite Resource
 * Handles organization invitation operations
 */
class InviteResource extends BaseResource {
  constructor() {
    super('organization_invitations');
  }

  /**
   * Get all invitations for an organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async byOrganization(orgId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        inviter:profiles!invited_by(id, full_name, email)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Get pending invitations for an organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<{data: Array|null, error: Error|null}>}
   */
  async pending(orgId) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        inviter:profiles!invited_by(id, full_name, email)
      `)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    return { data, error };
  }

  /**
   * Create an invitation
   * @param {Object} inviteData - Invitation data
   * @param {string} inviteData.organization_id - Organization ID
   * @param {string} inviteData.email - Invitee email
   * @param {string} inviteData.role - Role ('owner' or 'associate')
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async create(inviteData) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Generate token (UUID)
    const token = crypto.randomUUID();

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const dataToInsert = {
      ...inviteData,
      token,
      invited_by: user.id,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(dataToInsert)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get invitation by token
   * @param {string} token - Invitation token
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getByToken(token) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        organization:organizations(*),
        inviter:profiles!invited_by(id, full_name, email)
      `)
      .eq('token', token)
      .single();

    return { data, error };
  }

  /**
   * Accept an invitation
   * @param {string} token - Invitation token
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async accept(token) {
    const { user, error: authError } = await this.getCurrentUser();
    if (authError || !user) {
      return { data: null, error: authError || new Error('Not authenticated') };
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await this.getByToken(token);
    if (inviteError || !invitation) {
      return { data: null, error: inviteError || new Error('Invitation not found') };
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return { data: null, error: new Error('Invitation has expired') };
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return { data: null, error: new Error('Invitation already accepted') };
    }

    // Add user to organization
    const { error: memberError } = await this.supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError) {
      return { data: null, error: memberError };
    }

    // Mark invitation as accepted
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('token', token)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Cancel/revoke an invitation
   * @param {string} id - Invitation ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async cancel(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status: 'cancelled',
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Resend an invitation (creates a new token and expiry)
   * @param {string} id - Invitation ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async resend(id) {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }
}

// Export singleton instance
export const Invite = new InviteResource();
