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
  }
};
