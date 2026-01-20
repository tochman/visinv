import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/constants';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseConfig.url && supabaseConfig.anonKey;

// Create client only if configured, otherwise create a mock that won't crash
export const supabase = isSupabaseConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

// Auth helpers
export const authService = {
  // Sign up with email
  async signUp(email, password, metadata = {}) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured. Please add credentials to .env file.' } };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // Sign in with email
  async signIn(email, password) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured. Please add credentials to .env file.' } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign in with Google
  async signInWithGoogle() {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured. Please add credentials to .env file.' } };
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Sign out
  async signOut() {
    if (!supabase) {
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser() {
    if (!supabase) {
      return { user: null, error: null };
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get session
  async getSession() {
    if (!supabase) {
      return { session: null, error: null };
    }
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Update user profile
  async updateProfile(updates) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    return { data, error };
  },

  // Reset password
  async resetPassword(email) {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase not configured.' } };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { data, error };
  },
};

// Export configuration status for UI
export { isSupabaseConfigured };
