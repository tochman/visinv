import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService, supabase } from '../../services/supabase';
import { Profile } from '../../services/resources';

// Helper to fetch user profile
const fetchUserProfile = async (userId) => {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
};

// Async thunks
export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await authService.signIn(email, password);
    if (error) return rejectWithValue(error.message);
    
    // Fetch profile to get admin status
    const profile = await fetchUserProfile(data.user.id);
    return { ...data, profile };
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, metadata }, { rejectWithValue }) => {
    const { data, error } = await authService.signUp(email, password, metadata);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    const { data, error } = await authService.signInWithGoogle();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    const { error } = await authService.signOut();
    if (error) return rejectWithValue(error.message);
    return null;
  }
);

export const checkSession = createAsyncThunk(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    const { session, error } = await authService.getSession();
    if (error) return rejectWithValue(error.message);
    
    // Fetch profile if session exists
    let profile = null;
    if (session?.user) {
      profile = await fetchUserProfile(session.user.id);
    }
    return { session, profile };
  }
);

/**
 * Update user proficiency level
 * US-124: User Proficiency Level & Adaptive UI
 */
export const updateProficiency = createAsyncThunk(
  'auth/updateProficiency',
  async (level, { rejectWithValue }) => {
    const { data, error } = await Profile.updateProficiency(level);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    profile: null,
    session: null,
    loading: true, // Start with loading true to check session first
    error: null,
    isAuthenticated: false,
    isAdmin: false,
    initialized: false, // Track if we've checked the session
    proficiency: 'basic', // US-124: Default proficiency level
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setSession: (state, action) => {
      state.session = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // US-124: Set proficiency directly (for onboarding before profile exists)
    setProficiency: (state, action) => {
      state.proficiency = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign In
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.profile = action.payload.profile;
        state.isAuthenticated = true;
        state.isAdmin = action.payload.profile?.is_admin || false;
        state.proficiency = action.payload.profile?.proficiency_level || 'basic';
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Sign Out
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.profile = null;
        state.session = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
        state.proficiency = 'basic';
      })
      // Check Session
      .addCase(checkSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        if (action.payload.session) {
          state.session = action.payload.session;
          state.user = action.payload.session.user;
          state.profile = action.payload.profile;
          state.isAuthenticated = true;
          state.isAdmin = action.payload.profile?.is_admin || false;
          state.proficiency = action.payload.profile?.proficiency_level || 'basic';
        } else {
          state.isAuthenticated = false;
        }
      })
      .addCase(checkSession.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
        state.isAuthenticated = false;
      })
      // Update Proficiency (US-124)
      .addCase(updateProficiency.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.proficiency = action.payload.proficiency_level;
      });
  },
});

export const { setUser, setSession, clearError, setProficiency } = authSlice.actions;
export default authSlice.reducer;
