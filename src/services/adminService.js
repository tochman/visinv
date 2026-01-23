import { supabase } from './supabase';

export const adminService = {
  getStats: async () => {
    try {
      const [users, orgs, invoices] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
      ]);

      return {
        users: users.count || 0,
        orgs: orgs.count || 0,
        invoices: invoices.count || 0
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  },

  getAllUsers: async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};
