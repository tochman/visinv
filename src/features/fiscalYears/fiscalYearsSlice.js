import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FiscalYear } from '../../services/resources';

/**
 * Fetch all fiscal years for the organization
 */
export const fetchFiscalYears = createAsyncThunk(
  'fiscalYears/fetchFiscalYears',
  async (organizationId, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await FiscalYear.index(organizationId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Fetch the current fiscal year
 */
export const fetchCurrentFiscalYear = createAsyncThunk(
  'fiscalYears/fetchCurrentFiscalYear',
  async (organizationId, { rejectWithValue }) => {
    if (!organizationId) {
      return rejectWithValue('No organization selected');
    }

    const { data, error } = await FiscalYear.current(organizationId);
    // Not finding a current fiscal year is not necessarily an error
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return rejectWithValue(error.message);
    }
    return data;
  }
);

/**
 * Create a new fiscal year
 */
export const createFiscalYear = createAsyncThunk(
  'fiscalYears/createFiscalYear',
  async (fiscalYearData, { rejectWithValue }) => {
    const { data, error } = await FiscalYear.create(fiscalYearData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Update a fiscal year
 */
export const updateFiscalYear = createAsyncThunk(
  'fiscalYears/updateFiscalYear',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await FiscalYear.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Close a fiscal year
 */
export const closeFiscalYear = createAsyncThunk(
  'fiscalYears/closeFiscalYear',
  async (id, { rejectWithValue }) => {
    const { data, error } = await FiscalYear.close(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

/**
 * Reopen a fiscal year
 */
export const reopenFiscalYear = createAsyncThunk(
  'fiscalYears/reopenFiscalYear',
  async (id, { rejectWithValue }) => {
    const { data, error } = await FiscalYear.reopen(id);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const initialState = {
  items: [],
  currentFiscalYear: null,
  selectedFiscalYearId: null,
  loading: false,
  error: null,
};

const fiscalYearsSlice = createSlice({
  name: 'fiscalYears',
  initialState,
  reducers: {
    clearFiscalYears: (state) => {
      state.items = [];
      state.currentFiscalYear = null;
      state.selectedFiscalYearId = null;
      state.error = null;
    },
    setSelectedFiscalYear: (state, action) => {
      state.selectedFiscalYearId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFiscalYears
      .addCase(fetchFiscalYears.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFiscalYears.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
        // Auto-select the first open fiscal year if none selected
        if (!state.selectedFiscalYearId && action.payload?.length > 0) {
          const openYear = action.payload.find((fy) => !fy.is_closed);
          state.selectedFiscalYearId = openYear?.id || action.payload[0].id;
        }
      })
      .addCase(fetchFiscalYears.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchCurrentFiscalYear
      .addCase(fetchCurrentFiscalYear.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentFiscalYear.fulfilled, (state, action) => {
        state.loading = false;
        state.currentFiscalYear = action.payload;
        // Auto-select current if no selection
        if (!state.selectedFiscalYearId && action.payload) {
          state.selectedFiscalYearId = action.payload.id;
        }
      })
      .addCase(fetchCurrentFiscalYear.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createFiscalYear
      .addCase(createFiscalYear.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFiscalYear.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        // Select newly created fiscal year
        state.selectedFiscalYearId = action.payload.id;
      })
      .addCase(createFiscalYear.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateFiscalYear
      .addCase(updateFiscalYear.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFiscalYear.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((fy) => fy.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateFiscalYear.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // closeFiscalYear
      .addCase(closeFiscalYear.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(closeFiscalYear.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((fy) => fy.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(closeFiscalYear.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // reopenFiscalYear
      .addCase(reopenFiscalYear.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reopenFiscalYear.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((fy) => fy.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(reopenFiscalYear.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearFiscalYears, setSelectedFiscalYear, clearError } = fiscalYearsSlice.actions;

// Selectors
export const selectFiscalYears = (state) => state.fiscalYears.items;
export const selectCurrentFiscalYear = (state) => state.fiscalYears.currentFiscalYear;
export const selectSelectedFiscalYearId = (state) => state.fiscalYears.selectedFiscalYearId;
export const selectSelectedFiscalYear = (state) => {
  const id = state.fiscalYears.selectedFiscalYearId;
  return state.fiscalYears.items.find((fy) => fy.id === id) || null;
};
export const selectOpenFiscalYears = (state) => 
  state.fiscalYears.items.filter((fy) => !fy.is_closed);
export const selectFiscalYearsLoading = (state) => state.fiscalYears.loading;
export const selectFiscalYearsError = (state) => state.fiscalYears.error;

export default fiscalYearsSlice.reducer;
