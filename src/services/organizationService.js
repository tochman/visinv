import { supabase } from './supabase';

const organizationService = {
  /**
   * Create a new organization
   * Automatically adds the creator as owner via trigger
   */
  async create(organizationData) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert([organizationData])
      .select()
      .single();

    return { data, error };
  },

  /**
   * Get all organizations for the current user
   */
  async getAll() {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(
          role,
          is_default,
          joined_at
        )
      `)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  /**
   * Get a specific organization by ID
   */
  async getById(id) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members(
          user_id,
          role,
          is_default,
          joined_at,
          profiles(full_name, email)
        )
      `)
      .eq('id', id)
      .single();

    return { data, error };
  },

  /**
   * Get user's default organization
   */
  async getDefault() {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(
          role,
          is_default
        )
      `)
      .eq('organization_members.user_id', user.user.id)
      .eq('organization_members.is_default', true)
      .single();

    // If no default, get the first organization
    if (!data && !error) {
      const { data: orgs } = await this.getAll();
      return { data: orgs?.[0] || null, error: null };
    }

    return { data, error };
  },

  /**
   * Update an organization
   */
  async update(id, updates) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Delete an organization
   */
  async delete(id) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    return { error };
  },

  /**
   * Set user's default organization
   */
  async setDefault(organizationId) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { error: { message: 'Not authenticated' } };
    }

    // First, unset all defaults for this user
    await supabase
      .from('organization_members')
      .update({ is_default: false })
      .eq('user_id', user.user.id);

    // Then set the new default
    const { error } = await supabase
      .from('organization_members')
      .update({ is_default: true })
      .eq('organization_id', organizationId)
      .eq('user_id', user.user.id);

    return { error };
  },

  /**
   * Get organization members
   */
  async getMembers(organizationId) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true });

    return { data, error };
  },

  /**
   * Add a member to an organization
   */
  async addMember(organizationId, userId, role = 'member') {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        role,
      }])
      .select()
      .single();

    return { data, error };
  },

  /**
   * Update member role
   */
  async updateMemberRole(organizationId, userId, role) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Remove a member from an organization
   */
  async removeMember(organizationId, userId) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    return { error };
  },

  /**
   * Get next invoice number for organization
   */
  async getNextInvoiceNumber(organizationId) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('invoice_number_prefix, next_invoice_number')
      .eq('id', organizationId)
      .single();

    if (error) return { data: null, error };

    const { invoice_number_prefix, next_invoice_number } = data;
    const invoiceNumber = `${invoice_number_prefix}-${String(next_invoice_number).padStart(4, '0')}`;

    return { data: invoiceNumber, error: null };
  },

  /**
   * Increment invoice number for organization
   */
  async incrementInvoiceNumber(organizationId) {
    if (!supabase) {
      return { error: { message: 'Supabase not configured.' } };
    }

    const { error } = await supabase.rpc('increment_org_invoice_number', {
      org_id: organizationId,
    });

    // If RPC doesn't exist, fall back to manual increment
    if (error?.message?.includes('function') || error?.code === '42883') {
      const { data: org } = await supabase
        .from('organizations')
        .select('next_invoice_number')
        .eq('id', organizationId)
        .single();

      if (org) {
        await supabase
          .from('organizations')
          .update({ next_invoice_number: org.next_invoice_number + 1 })
          .eq('id', organizationId);
        return { error: null };
      }
    }

    return { error };
  },
};

export default organizationService;
