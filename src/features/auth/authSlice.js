import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService, supabase } from '../../services/supabase';

// Async thunks
export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    const { data, error } = await authService.signIn(email, password);
    if (error) return rejectWithValue(error.message);
    return data;
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
    return session;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    session: null,
    loading: false,
    error: null,
    isAuthenticated: false,
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
        state.isAuthenticated = true;
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
        state.session = null;
        state.isAuthenticated = false;
      })
      // Check Session
      .addCase(checkSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.session = action.payload;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      });
  },
});

export const { setUser, setSession, clearError } = authSlice.actions;
export default authSlice.reducer;
