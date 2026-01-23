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

All resources follow RESTful conventions:

| Method | HTTP Equivalent | Description | Usage |
|--------|----------------|-------------|-------|
| `index(options)` | GET /resources | Get all records | `await Resource.index()` |
| `show(id)` | GET /resources/:id | Get one record | `await Resource.show(id)` |
| `create(data)` | POST /resources | Create record | `await Resource.create({...})` |
| `update(id, data)` | PATCH /resources/:id | Update record | `await Resource.update(id, {...})` |
| `delete(id)` | DELETE /resources/:id | Delete record | `await Resource.delete(id)` |
| `where(conditions)` | GET /resources?filter | Custom query | `await Resource.where([...])` |

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

### Implemented Resources

**Client Resource** - Customer management  
**InvoiceTemplate Resource** - Template CRUD with shared system templates

Key pattern: Templates with `user_id=null` are system templates visible to all users via RLS:

```javascript
// InvoiceTemplate.js
async index() {
  const { user } = await this.getCurrentUser();
  const { data, error } = await this.supabase
    .from(this.tableName)
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`) // User's + System templates
    .order('created_at', { ascending: false });
  return { data, error };
}
```

### Creating New Resources

When adding a new feature, follow the RESTful resource pattern:

**1. Create the Resource class**

```javascript
// src/services/resources/Invoice.js
import { BaseResource } from './BaseResource';

class InvoiceResource extends BaseResource {
  constructor() {
    super('invoices'); // table name
  }

  // Add custom methods for business logic
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

  async markAsPaid(id) {
    return this.update(id, { 
      status: 'paid',
      paid_at: new Date().toISOString()
    });
  }
}

export const Invoice = new InvoiceResource();
```

**2. Export from resources index**

**2. Export from resources index**

```javascript
// src/services/resources/index.js
export { Client } from './Client';
export { Invoice } from './Invoice';
export { Product } from './Product';
// ... other resources
```

**3. Use in Redux slice**

```javascript
// src/features/invoices/invoicesSlice.js
import { Invoice } from '../../services/resources';

// Fetch all invoices
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (_, { rejectWithValue }) => {
    const { data, error } = await Invoice.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

// Create invoice
export const createInvoice = createAsyncThunk(
  'invoices/create',
  async (invoiceData, { rejectWithValue }) => {
    const { data, error } = await Invoice.create(invoiceData);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

// Update invoice  
export const updateInvoice = createAsyncThunk(
  'invoices/update',
  async ({ id, updates }, { rejectWithValue }) => {
    const { data, error } = await Invoice.update(id, updates);
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

// Delete invoice
export const deleteInvoice = createAsyncThunk(
  'invoices/delete',
  async (id, { rejectWithValue }) => {
    const { error } = await Invoice.delete(id);
    if (error) return rejectWithValue(error.message);
    return id;
  }
);
```

**RESTful Pattern Summary:**
- `.index()` - GET all
- `.show(id)` - GET one  
- `.create(data)` - POST
- `.update(id, data)` - PATCH
- `.delete(id)` - DELETE

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

## Services Layer

### Template Service

**Location:** `src/services/templateService.js`

Handles Handlebars template rendering and PDF export:

```javascript
import Handlebars from 'handlebars';
import html2pdf from 'html2pdf.js';

// Build context with sample or real invoice data
export const buildTemplateContext = (invoiceData) => {
  return invoiceData || {
    invoice_number: 'INV-0001',
    client_name: 'Acme Corporation',
    line_items: [
      { description: 'Consulting Services', quantity: 10, unit_price: 800, amount: 8000 },
      { description: 'Project Management', quantity: 5, unit_price: 400, amount: 2000 }
    ],
    subtotal: 10000,
    tax_rate: 25,
    total: 12500,
    currency: 'SEK'
  };
};

// Render template with Handlebars
export const renderTemplate = (templateContent, context) => {
  const template = Handlebars.compile(templateContent);
  return template(context);
};

// Export to PDF
export const exportToPDF = async (htmlContent, filename) => {
  const options = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  return html2pdf().set(options).from(htmlContent).save();
};
```

**Available Handlebars Helpers:**
- `formatDate` - Format dates (YYYY-MM-DD)
- `formatDateTime` - Format timestamps
- `ifEquals` - Conditional comparison
- `ifContains` - Check array membership
- `add`, `subtract`, `multiply`, `divide` - Math operations
- `pluralize`, `uppercase`, `lowercase`, `truncate` - String utilities
- `json` - Debug JSON output

**Template Variables:**
- **Invoice fields:** invoice_number, client_name, client_email, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, currency, notes
- **Line items:** `{{#each line_items}}` - description, quantity, unit_price, amount
- **Iteration:** `@index`, `@first`, `@last`

## TipTap Editor Integration

### Location
`src/components/templates/TemplateEditor.jsx` (2039 lines)  
Copied from legacy wheel project, adapted for invoice domain.

### Features
- **Modes:** Visual (TipTap WYSIWYG), Code (HTML+Handlebars), Preview (rendered)
- **Extensions:** StarterKit, TextAlign, TextStyle, Color, Highlight, GlobalDragHandle, ColumnExtension
- **Themes:** 6 design themes (modern, professional, warm, dark, nature, corporate)
- **Block Library:** Header, Paragraph, Table, List, Image, Columns, Page Break
- **Variable Insertion:** Click to insert Handlebars variables in both visual and code modes
- **Syntax Highlighting:** Prism.js for HTML + Handlebars in code mode
- **Dark Mode:** Full dark mode support via Tailwind
- **PDF Export:** Generate PDF from preview using html2pdf.js

### Property Mapping

Database uses `content` but editor expects `template_content`:

```javascript
// TemplateEditorPage.jsx - Load
const editorTemplate = currentTemplate ? {
  ...currentTemplate,
  template_content: currentTemplate.content  // Map DB to editor
} : null;

// TemplateEditorPage.jsx - Save
const { template_content, ...rest } = templateData;
const dbData = {
  ...rest,
  content: template_content  // Map editor to DB
};
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
