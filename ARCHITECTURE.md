# Architecture & Code Patterns

## Overview

VisInv follows a clean architecture pattern with clear separation of concerns:
- **Components** - Pure UI, no direct data access
- **Resources** - REST-like data access layer
- **Redux Slices** - State management
- **Services** - External integrations (Supabase, Stripe, etc.)

## Resource Pattern

We use a Resource pattern for all data operations, providing a clean REST-like API that abstracts Supabase away from components and Redux slices.

### Why Resources?

✅ **Separation of Concerns** - Components don't know about Supabase  
✅ **Consistency** - All data access follows the same pattern  
✅ **Testability** - Easy to mock for testing  
✅ **Reusability** - Share logic across features  
✅ **Type Safety** - Single source of truth for data operations  

### BaseResource Class

All resources extend `BaseResource` which provides standard CRUD operations:

```javascript
import { BaseResource } from './BaseResource';

class MyResource extends BaseResource {
  constructor() {
    super('table_name');
  }
}
```

#### Standard Methods

| Method | Description | Usage |
|--------|-------------|-------|
| `index(options)` | Get all records | `await Resource.index()` |
| `show(id)` | Get one record | `await Resource.show(id)` |
| `create(data)` | Create record | `await Resource.create({...})` |
| `update(id, data)` | Update record | `await Resource.update(id, {...})` |
| `destroy(id)` | Delete record | `await Resource.destroy(id)` |
| `where(conditions)` | Custom query | `await Resource.where([...])` |

All methods return `{ data, error }` following Supabase conventions.

### Example: Client Resource

**Location:** `src/services/resources/Client.js`

```javascript
import { BaseResource } from './BaseResource';

class ClientResource extends BaseResource {
  constructor() {
    super('clients');
  }

  // Override index to set default ordering
  async index(options = {}) {
    return super.index({
      select: '*',
      order: 'name',
      ascending: true,
      ...options,
    });
  }

  // Custom method for searching
  async search(query) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name');

    return { data, error };
  }

  // Custom method for team filtering
  async byTeam(teamId) {
    return this.where([
      { column: 'team_id', value: teamId }
    ]);
  }
}

export const Client = new ClientResource();
```

### Usage in Redux Slices

Resources replace direct Supabase calls in Redux thunks:

**Before (direct Supabase):**
```javascript
import { supabase } from '../../services/supabase';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) return rejectWithValue(error.message);
    return data;
  }
);
```

**After (using Resource):**
```javascript
import { Client } from '../../services/resources';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Client.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);
```

### Usage in Components

Components should NEVER call Resources directly. Always go through Redux:

**❌ Bad:**
```javascript
import { Client } from '@/services/resources';

function MyComponent() {
  const [clients, setClients] = useState([]);
  
  useEffect(() => {
    Client.index().then(({ data }) => setClients(data));
  }, []);
}
```

**✅ Good:**
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchClients } from '@/features/clients/clientsSlice';

function MyComponent() {
  const dispatch = useDispatch();
  const clients = useSelector(state => state.clients.items);
  
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);
}
```

### Creating New Resources

When adding a new feature (e.g., Invoices), create a new Resource:

1. **Create the resource file:**

```javascript
// src/services/resources/Invoice.js
import { BaseResource } from './BaseResource';

class InvoiceResource extends BaseResource {
  constructor() {
    super('invoices');
  }

  // Custom methods specific to invoices
  async byClient(clientId) {
    return this.where([
      { column: 'client_id', value: clientId }
    ]);
  }

  async pending() {
    return this.where([
      { column: 'status', value: 'pending' }
    ]);
  }
}

export const Invoice = new InvoiceResource();
```

2. **Export from index:**

```javascript
// src/services/resources/index.js
export { Client } from './Client';
export { Invoice } from './Invoice';
```

3. **Use in Redux slice:**

```javascript
// src/features/invoices/invoicesSlice.js
import { Invoice } from '../../services/resources';

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Invoice.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);
```

## Authentication & Authorization

### User ID Injection

BaseResource automatically injects `user_id` when creating records:

```javascript
// This:
await Client.create({ name: 'Acme Corp' });

// Becomes:
await supabase.from('clients').insert({
  name: 'Acme Corp',
  user_id: '<current-user-id>'
});
```

To disable auto-injection (rare cases):
```javascript
await Resource.create(data, false); // false = don't add user_id
```

### Row Level Security (RLS)

All database operations respect Supabase RLS policies:

```sql
-- INSERT: Users can only insert their own records
CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SELECT: Users can only see their own records
CREATE POLICY "Users can select own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);
```

## File Structure

```
src/
├── services/
│   ├── resources/
│   │   ├── BaseResource.js    # Base class for all resources
│   │   ├── Client.js           # Client resource
│   │   ├── Invoice.js          # Invoice resource (future)
│   │   ├── Product.js          # Product resource (future)
│   │   └── index.js            # Export all resources
│   ├── supabase.js             # Supabase client setup
│   └── ...
├── features/
│   ├── clients/
│   │   └── clientsSlice.js     # Uses Client resource
│   └── ...
└── components/
    └── ...                      # Never import resources directly
```

## Best Practices

### ✅ Do's

- Use Resources for all data operations
- Keep custom business logic in Resource methods
- Return `{ data, error }` from all Resource methods
- Add resource-specific methods (e.g., `Client.search()`)
- Use descriptive method names that match your domain
- Always handle errors in components/slices

### ❌ Don'ts

- Don't import Supabase client directly in components
- Don't bypass Resources with raw Supabase calls
- Don't put business logic in components
- Don't forget to export new resources from `index.js`
- Don't call Resources directly from components (use Redux)

## Testing

Resources make testing easier:

```javascript
// Mock the resource
jest.mock('@/services/resources', () => ({
  Client: {
    index: jest.fn().mockResolvedValue({ 
      data: [{ id: '1', name: 'Test' }], 
      error: null 
    }),
  },
}));
```

## Migration from Direct Supabase Calls

When refactoring existing code:

1. Create the Resource class
2. Add custom methods if needed
3. Update Redux slice to use Resource
4. Test thoroughly
5. Remove old Supabase imports

Example commit message:
```
refactor: migrate clients to Resource pattern

- Create Client resource extending BaseResource
- Update clientsSlice to use Client.index(), Client.create(), etc.
- Remove direct Supabase imports from Redux slice
- Maintain backward compatibility with existing components
```

## Future Enhancements

Potential improvements to the Resource pattern:

- **Caching** - Add built-in cache layer
- **Optimistic Updates** - Handle optimistic UI updates
- **Batch Operations** - Support bulk create/update/delete
- **Relationships** - Auto-load related records
- **Validation** - Schema validation before sending to Supabase
- **Events** - Emit events on CRUD operations
- **Retry Logic** - Automatic retry on network failures
