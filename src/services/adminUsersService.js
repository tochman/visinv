import { supabase } from './supabase';

export const adminUsersService = {
  list: async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, plan_type, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  update: async (id, updates) => {
    if (!supabase) return { id, ...updates };
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        email: updates.email,
        plan_type: updates.plan_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, email, full_name, plan_type, created_at, updated_at')
      .single();
    if (error) throw error;
    return data;
  },
};
