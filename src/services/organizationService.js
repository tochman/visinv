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

    // Get current user to set created_by (required for RLS policy)
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert([{ ...organizationData, created_by: user.user.id }])
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

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: [], error: null };
    }

    // Get organizations through membership table
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        is_default,
        joined_at,
        organizations(*)
      `)
      .eq('user_id', user.user.id)
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

    // First try to get the default organization
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        is_default,
        organizations(*)
      `)
      .eq('user_id', user.user.id)
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    // If we found a default, return the organization
    if (data?.organizations) {
      return { 
        data: { 
          ...data.organizations, 
          role: data.role 
        }, 
        error: null 
      };
    }

    // If no default, get the first organization the user belongs to
    const { data: firstMember, error: firstError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations(*)
      `)
      .eq('user_id', user.user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstError) {
      return { data: null, error: firstError };
    }

    if (firstMember?.organizations) {
      return { 
        data: { 
          ...firstMember.organizations, 
          role: firstMember.role 
        }, 
        error: null 
      };
    }

    // No organizations found at all
    return { data: null, error: null };
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
