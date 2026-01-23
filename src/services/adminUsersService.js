import { supabase } from './supabase';

export const adminUsersService = {
  list: async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at, subscriptions(plan_type)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Flatten subscription data
    return (data || []).map(user => ({
      ...user,
      plan_type: user.subscriptions?.plan_type || 'free',
      subscriptions: undefined,
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

    // Fetch updated user with subscription
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, updated_at, subscriptions(plan_type)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      plan_type: data.subscriptions?.plan_type || 'free',
      subscriptions: undefined,
    };
  },
};
