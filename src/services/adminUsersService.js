import { supabase } from './supabase';

export const adminUsersService = {
  list: async () => {
    if (!supabase) return [];
    
    // Fetch profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (profileError) throw profileError;
    
    // Fetch subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_type');
    
    if (subError) throw subError;
    
    // Create subscription map for quick lookup
    const subMap = new Map((subscriptions || []).map(s => [s.user_id, s.plan_type]));
    
    // Merge data
    return (profiles || []).map(user => ({
      ...user,
      plan_type: subMap.get(user.id) || 'free',
    }));
  },
  update: async (id, updates) => {
    if (!supabase) return { id, ...updates };
    
    // Update profile fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        email: updates.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (profileError) throw profileError;

    // Update subscription plan_type if changed
    if (updates.plan_type) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ plan_type: updates.plan_type })
        .eq('user_id', id);
      
      if (subError) throw subError;
    }

    // Fetch updated profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Fetch subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', id)
      .single();
    
    return {
      ...profile,
      plan_type: subscription?.plan_type || 'free',
    };
  },
};
