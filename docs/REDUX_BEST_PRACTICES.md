# Redux Best Practices

## Current Implementation ✅

Our Redux implementation follows best practices using **Redux Toolkit (RTK)**:

### ✅ What We're Doing Right

1. **Redux Toolkit** - Using `@reduxjs/toolkit` for all Redux logic
2. **createAsyncThunk** - Standardized async operations with automatic loading states
3. **Resource Pattern** - Resources used exclusively in thunks, never in components
4. **Immer Integration** - Direct state mutations in reducers (Immer handles immutability)
5. **Single Source of Truth** - All data operations go through Redux
6. **Consistent State Shape** - All slices follow `{ items, loading, error }` pattern
7. **Error Handling** - Consistent `rejectWithValue` pattern
8. **Serializable State** - Configured checks for non-serializable data

### Store Configuration

```javascript
// src/store/index.js
export const store = configureStore({
  reducer: {
    auth: authReducer,
    invoices: invoicesReducer,
    clients: clientsReducer,
    products: productsReducer,
    templates: templatesReducer,
    subscriptions: subscriptionsReducer,
    teams: teamsReducer,
    invoiceTemplates: invoiceTemplatesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user'],
      },
    }),
});
```

### Slice Structure Pattern

All slices follow this consistent pattern:

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Resource } from '../../services/resources';

// Thunks
export const fetchItems = createAsyncThunk(
  'slice/fetchItems',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Resource.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const createItem = createAsyncThunk(
  'slice/createItem',
  async (itemData, { rejectWithValue }) => {
    const { data, error } = await Resource.create(itemData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const updateItem = createAsyncThunk(
  'slice/updateItem',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await Resource.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const deleteItem = createAsyncThunk(
  'slice/deleteItem',
  async (id, { rejectWithValue }) => {
    const { error } = await Resource.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);

// Slice
const itemsSlice = createSlice({
  name: 'items',
  initialState: {
    items: [],
    currentItem: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createItem.fulfilled, (state, action) => {
        state.items.unshift(action.payload); // Add to beginning
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentItem?.id === action.payload.id) {
          state.currentItem = action.payload;
        }
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  },
});

export const { clearError, clearCurrentItem } = itemsSlice.actions;
export default itemsSlice.reducer;
```

### Component Usage Pattern

Components consume Redux state without knowing about data sources:

```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchClients, deleteClient } from '../features/clients/clientsSlice';

export default function Clients() {
  const dispatch = useDispatch();
  const { items: clients, loading, error } = useSelector((state) => state.clients);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      dispatch(fetchClients());
    }
  }, [dispatch, user]);

  const handleDelete = async (id) => {
    await dispatch(deleteClient(id));
  };

  // Component renders clients from Redux state
}
```

## Optimizations We Could Add 🔄

### 1. Memoized Selectors (Optional)

For complex computations, we could add **reselect**:

```javascript
// features/invoices/selectors.js
import { createSelector } from '@reduxjs/toolkit';

export const selectInvoices = (state) => state.invoices.items;

export const selectUnpaidInvoices = createSelector(
  [selectInvoices],
  (invoices) => invoices.filter(inv => inv.status !== 'paid')
);

export const selectOverdueInvoices = createSelector(
  [selectInvoices],
  (invoices) => {
    const now = new Date();
    return invoices.filter(inv => 
      inv.status !== 'paid' && new Date(inv.due_date) < now
    );
  }
);

export const selectTotalRevenue = createSelector(
  [selectInvoices],
  (invoices) => invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)
);
```

**When to use selectors:**
- ✅ Complex filtering/sorting that happens on every render
- ✅ Derived data calculations (totals, aggregations)
- ✅ Multiple components need the same computed data
- ❌ Simple property access (overkill)

### 2. Normalized State (Optional)

For deeply nested data, we could use **normalizing**:

```javascript
// Current (array-based)
{
  items: [
    { id: 1, name: 'Invoice 1', client_id: 5 },
    { id: 2, name: 'Invoice 2', client_id: 5 },
  ]
}

// Normalized (object-based with adapters)
import { createEntityAdapter } from '@reduxjs/toolkit';

const invoicesAdapter = createEntityAdapter();

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: invoicesAdapter.getInitialState({
    loading: false,
    error: null,
  }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        invoicesAdapter.setAll(state, action.payload);
        state.loading = false;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        invoicesAdapter.updateOne(state, {
          id: action.payload.id,
          changes: action.payload,
        });
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        invoicesAdapter.removeOne(state, action.payload);
      });
  },
});

// Auto-generated selectors
export const {
  selectAll: selectAllInvoices,
  selectById: selectInvoiceById,
  selectIds: selectInvoiceIds,
} = invoicesAdapter.getSelectors((state) => state.invoices);
```

**When to normalize:**
- ✅ Deeply nested relational data
- ✅ Many components accessing same data by ID
- ✅ Frequent updates to individual items
- ❌ Simple flat lists (current approach is fine)

### 3. RTK Query (Future Enhancement)

For auto-caching and real-time sync, we could use **RTK Query**:

```javascript
import { createApi } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../services/supabase';

export const clientsApi = createApi({
  reducerPath: 'clientsApi',
  baseQuery: async (args) => {
    // Custom Supabase base query
    const { data, error } = await supabase
      .from(args.table)
      .select(args.select);
    
    return error ? { error } : { data };
  },
  endpoints: (builder) => ({
    getClients: builder.query({
      query: () => ({ table: 'clients', select: '*' }),
      providesTags: ['Clients'],
    }),
    createClient: builder.mutation({
      query: (client) => ({ table: 'clients', method: 'insert', body: client }),
      invalidatesTags: ['Clients'],
    }),
  }),
});

export const { useGetClientsQuery, useCreateClientMutation } = clientsApi;
```

**Benefits of RTK Query:**
- ✅ Automatic caching and deduplication
- ✅ Background refetching
- ✅ Optimistic updates
- ✅ Less boilerplate

**Trade-offs:**
- ❌ More complex setup
- ❌ Different mental model from Resources
- ❌ Would require refactoring existing code

## Current Assessment: ✅ OPTIMAL

Our current Redux implementation is **production-ready and follows best practices**:

1. ✅ **Redux Toolkit** - Modern, recommended approach
2. ✅ **Consistent patterns** - All slices follow same structure
3. ✅ **Resource abstraction** - Clean separation of concerns
4. ✅ **Error handling** - Proper error states
5. ✅ **Loading states** - User feedback for async operations
6. ✅ **Immutability** - Immer handles this automatically
7. ✅ **Type safety** - Consistent return types from Resources

### When to Add Optimizations:

- **Add selectors** when you notice performance issues from re-renders
- **Add normalization** if you have deeply nested relational data
- **Consider RTK Query** for real-time features or when you need aggressive caching

For now, **the current implementation is optimal for your use case**. The Resource pattern provides excellent abstraction, and Redux Toolkit handles the heavy lifting.

## Anti-Patterns We're Avoiding ✅

1. ❌ **Direct Supabase in components** - We use Resources in Redux only
2. ❌ **Mutating state directly** - Immer handles immutability
3. ❌ **Manual action types** - RTK generates these
4. ❌ **Overuse of Redux** - UI-only state stays in components (e.g., modal open/closed)
5. ❌ **Prop drilling** - Redux provides global state access
6. ❌ **Non-serializable state** - Configured checks prevent this

## Summary

**Your Redux implementation is optimal.** You're using modern best practices with Redux Toolkit, following consistent patterns, and maintaining clean separation of concerns through the Resource pattern. The code is maintainable, testable, and performant.
