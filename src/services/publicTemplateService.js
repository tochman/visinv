import { createClient } from '@supabase/supabase-js';

// Create a public client with service role for fetching system templates
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE;

const publicSupabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Fetch system templates for public display (landing page)
 * Uses service role to bypass RLS for system templates only
 */
export async function fetchSystemTemplates() {
  try {
    const { data, error } = await publicSupabase
      .from('invoice_templates')
      .select('*')
      .eq('is_system', true)
      .is('user_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching system templates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSystemTemplates:', error);
    return [];
  }
}
