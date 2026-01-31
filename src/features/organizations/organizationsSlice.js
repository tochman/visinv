import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Organization } from '../../services/resources';

/**
 * Fetch all organizations for the current user
 */
export const fetchOrganizations = createAsyncThunk(
  'organizations/fetchOrganizations',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Organization.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch a single organization by ID
 */
export const fetchOrganization = createAsyncThunk(
  'organizations/fetchOrganization',
  async (id, { rejectWithValue }) => {
    const { data, error } = await Organization.show(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch the user's default organization
 */
export const fetchDefaultOrganization = createAsyncThunk(
  'organizations/fetchDefaultOrganization',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Organization.getDefault();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Create a new organization
 */
export const createOrganization = createAsyncThunk(
  'organizations/createOrganization',
  async (organizationData, { rejectWithValue }) => {
    const { data, error } = await Organization.create(organizationData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Update an organization
 */
export const updateOrganization = createAsyncThunk(
  'organizations/updateOrganization',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await Organization.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return { id, ...updates };
  }
);

/**
 * Delete an organization
 */
export const deleteOrganization = createAsyncThunk(
  'organizations/deleteOrganization',
  async (id, { rejectWithValue }) => {
    const { error } = await Organization.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

/**
 * Update organization email slug
 * US-264a: Organization Email Slug Management
 */
export const updateEmailSlug = createAsyncThunk(
  'organizations/updateEmailSlug',
  async ({ id, slug }, { rejectWithValue }) => {
    const { data, error } = await Organization.updateEmailSlug(id, slug);
    if (error) return rejectWithValue(error.message);
    return { id, email_slug: slug };
  }
);

/**
 * Fetch email slug history for an organization
 * US-264a: Organization Email Slug Management
 */
export const fetchEmailSlugHistory = createAsyncThunk(
  'organizations/fetchEmailSlugHistory',
  async (organizationId, { rejectWithValue }) => {
    const { data, error } = await Organization.getEmailSlugHistory(organizationId);
    if (error) return rejectWithValue(error.message);
    return { organizationId, history: data };
  }
);

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState: {
    items: [],
    currentOrganization: null,
    emailSlugHistory: [],
    loading: false,
    slugHistoryLoading: false,
    error: null,
  },
  reducers: {
    setCurrentOrganization: (state, action) => {
      state.currentOrganization = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearEmailSlugHistory: (state) => {
      state.emailSlugHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all organizations
      .addCase(fetchOrganizations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOrganizations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch single organization
      .addCase(fetchOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganization.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrganization = action.payload;
      })
      .addCase(fetchOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch default organization
      .addCase(fetchDefaultOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefaultOrganization.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrganization = action.payload;
      })
      .addCase(fetchDefaultOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create organization
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      
      // Update organization
      .addCase(updateOrganization.fulfilled, (state, action) => {
        const index = state.items.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
        if (state.currentOrganization?.id === action.payload.id) {
          state.currentOrganization = { ...state.currentOrganization, ...action.payload };
        }
      })
      
      // Delete organization
      .addCase(deleteOrganization.fulfilled, (state, action) => {
        state.items = state.items.filter(org => org.id !== action.payload);
        if (state.currentOrganization?.id === action.payload) {
          state.currentOrganization = null;
        }
      })
      
      // Update email slug
      .addCase(updateEmailSlug.fulfilled, (state, action) => {
        const index = state.items.findIndex(org => org.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], email_slug: action.payload.email_slug };
        }
        if (state.currentOrganization?.id === action.payload.id) {
          state.currentOrganization = { ...state.currentOrganization, email_slug: action.payload.email_slug };
        }
      })
      
      // Fetch email slug history
      .addCase(fetchEmailSlugHistory.pending, (state) => {
        state.slugHistoryLoading = true;
      })
      .addCase(fetchEmailSlugHistory.fulfilled, (state, action) => {
        state.slugHistoryLoading = false;
        state.emailSlugHistory = action.payload.history || [];
      })
      .addCase(fetchEmailSlugHistory.rejected, (state) => {
        state.slugHistoryLoading = false;
        state.emailSlugHistory = [];
      });
  },
});

export const { setCurrentOrganization, clearError, clearEmailSlugHistory } = organizationsSlice.actions;
export default organizationsSlice.reducer;
