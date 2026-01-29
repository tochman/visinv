import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Supplier } from '../../services/resources/Supplier';

/**
 * Redux slice for supplier management - US-261
 */

// Async thunks
export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchSuppliers',
  async ({ organizationId, activeOnly = false }, { rejectWithValue }) => {
    const { data, error } = await Supplier.getByOrganization(organizationId, activeOnly);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const fetchSupplier = createAsyncThunk(
  'suppliers/fetchSupplier',
  async (supplierId, { rejectWithValue }) => {
    const { data, error } = await Supplier.show(supplierId);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createSupplier = createAsyncThunk(
  'suppliers/createSupplier',
  async (supplierData, { rejectWithValue }) => {
    const { data, error } = await Supplier.create(supplierData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateSupplier = createAsyncThunk(
  'suppliers/updateSupplier',
  async ({ id, ...updates }, { rejectWithValue }) => {
    const { data, error } = await Supplier.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteSupplier = createAsyncThunk(
  'suppliers/deleteSupplier',
  async (supplierId, { rejectWithValue }) => {
    const { error } = await Supplier.destroy(supplierId);
    if (error) return rejectWithValue(error.message);
    return supplierId;
  }
);

export const searchSuppliers = createAsyncThunk(
  'suppliers/searchSuppliers',
  async ({ organizationId, searchTerm }, { rejectWithValue }) => {
    const { data, error } = await Supplier.search(organizationId, searchTerm);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const toggleSupplierActive = createAsyncThunk(
  'suppliers/toggleSupplierActive',
  async ({ id, isActive }, { rejectWithValue }) => {
    const { data, error } = await Supplier.setActiveStatus(id, isActive);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

// Initial state
const initialState = {
  suppliers: [],
  currentSupplier: null,
  loading: false,
  error: null,
  searchResults: [],
  searchLoading: false,
};

// Slice
const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    clearCurrentSupplier: (state) => {
      state.currentSupplier = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch suppliers
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = action.payload;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch single supplier
      .addCase(fetchSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSupplier = action.payload;
      })
      .addCase(fetchSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create supplier
      .addCase(createSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers.push(action.payload);
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update supplier
      .addCase(updateSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.suppliers.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.suppliers[index] = action.payload;
        }
        if (state.currentSupplier?.id === action.payload.id) {
          state.currentSupplier = action.payload;
        }
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete supplier
      .addCase(deleteSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
        if (state.currentSupplier?.id === action.payload) {
          state.currentSupplier = null;
        }
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Search suppliers
      .addCase(searchSuppliers.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchSuppliers.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchSuppliers.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload;
      })
      
      // Toggle active status
      .addCase(toggleSupplierActive.fulfilled, (state, action) => {
        const index = state.suppliers.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.suppliers[index] = action.payload;
        }
        if (state.currentSupplier?.id === action.payload.id) {
          state.currentSupplier = action.payload;
        }
      });
  },
});

export const { clearCurrentSupplier, clearError, clearSearchResults } = suppliersSlice.actions;

// Selectors
export const selectSuppliers = (state) => state.suppliers.suppliers;
export const selectCurrentSupplier = (state) => state.suppliers.currentSupplier;
export const selectSuppliersLoading = (state) => state.suppliers.loading;
export const selectSuppliersError = (state) => state.suppliers.error;
export const selectSearchResults = (state) => state.suppliers.searchResults;
export const selectSearchLoading = (state) => state.suppliers.searchLoading;

export default suppliersSlice.reducer;
