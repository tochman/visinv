# GitHub Copilot Instructions for VisInv

## Project Overview

VisInv is a modern, full-featured invoice management SaaS built with React, Supabase, and Tailwind CSS. It provides professional invoice management for freelancers, small businesses, and enterprises with support for Swedish compliance requirements.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Redux Toolkit
- **Backend:** Supabase (Database, Auth, Storage)
- **Payments:** Stripe
- **Email:** Resend
- **Testing:** Cypress E2E tests
- **Internationalization:** i18next (English & Swedish)

## Documentation

Before making changes, consult these comprehensive documentation files in the `/docs` folder:

- **ARCHITECTURE.md** - Code patterns, Resource pattern (ORM-like), best practices for data access
- **REDUX_BEST_PRACTICES.md** - Redux Toolkit patterns and optimization strategies
- **FEATURES.md** - Complete feature list with user stories and implementation status
- **DATABASE.md** - Database schema and setup instructions
- **TESTING.md** - Testing guide with Cypress best practices
- **WORKFLOW.md** - Development workflow and processes
- **Swedish Compliance Docs:** SWEDISH_INVOICE_FORM_REQS.md, IMPLEMENTATION_SWEDISH_TEMPLATES.md

## Architecture Patterns

### Resource Pattern (Critical)

VisInv uses a **Resource Pattern** for all data operations, similar to an ORM. This pattern provides a clean, REST-like API that abstracts database operations.

**Data Flow:**
```
Component → Redux Slice → Resource → Supabase
```

**✅ DO:**
- Use Resources for all data operations
- Keep business logic in Resource methods
- Always go through Redux in components
- Return `{ data, error }` from Resource methods

**❌ DON'T:**
- Never import Supabase client directly in components
- Never bypass Resources with raw Supabase calls
- Never call Resources directly from components (use Redux)

**Example:**
```javascript
// ✅ Good - Component uses Redux
import { useDispatch } from 'react-redux';
import { fetchClients } from '@/features/clients/clientsSlice';

function MyComponent() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);
}

// ❌ Bad - Component calls Resource directly
import { Client } from '@/services/resources';
Client.index(); // NEVER DO THIS
```

### Redux Best Practices

- Use Redux Toolkit's `createSlice` and `createAsyncThunk`
- Keep slices focused and modular
- Use Resources in thunks for data operations
- Handle loading states consistently

### File Structure

```
src/
├── components/       # Pure UI components
├── features/         # Redux slices (state management)
├── services/
│   └── resources/    # Data access layer (Client, Invoice, etc.)
├── pages/            # Page components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── i18n/             # Translations (en.json, sv.json)
└── store/            # Redux store configuration
```

## Code Style Guidelines

### UI Guidelines

- **NEVER use emojis in the UI** - The application maintains a professional appearance without emojis in user-facing components
- Use Tailwind utility classes for styling
- Support dark mode with `dark:` classes
- Add `data-cy` attributes to all testable elements
- Keep components small and focused
- Use functional components with hooks

### Internationalization

- All user-facing text must use i18n translation keys
- Add translations to both `src/i18n/locales/en.json` and `src/i18n/locales/sv.json`
- Use the `useTranslation` hook: `const { t } = useTranslation();`

### Commit Messages

- **Keep commit messages short and concise**
- Use conventional commit format:
  - `feat: add X` - New feature
  - `fix: resolve Y` - Bug fix
  - `refactor: improve Z` - Code refactor
  - `test: add tests for W` - Test changes
  - `docs: update V` - Documentation
  - `chore: U` - Maintenance

## Testing Requirements

### Cypress E2E Tests

All features must have corresponding Cypress E2E tests in `cypress/e2e/`.

**Best Practices:**
- Use `data-cy` attributes for element selection
- Mock API calls with `cy.intercept()`
- Wait for API responses with `cy.wait('@aliasName')`
- Test both happy path and error scenarios
- Use custom commands from `cypress/support/commands.js`

**Test Organization:**
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/table*', { body: [] }).as('getData')
    cy.login('admin')
    cy.visit('/page')
    cy.wait('@getData')
  })

  describe('Happy Path - Success Scenarios', () => {
    it('should successfully do something', () => {
      // Test implementation
    })
  })

  describe('Sad Path - Error Scenarios', () => {
    it('should handle errors gracefully', () => {
      // Test implementation
    })
  })
})
```

**Running Tests:**
- `npm run cy:open` - Interactive mode (development)
- `npm run cy:run` - Headless mode (CI/CD)
- `npm run test:coverage` - With code coverage

## Development Workflow

### Definition of Done

A feature is **COMPLETE** only when:
- ✅ Code implemented following ARCHITECTURE.md patterns
- ✅ Cypress tests written and passing
- ✅ Database migrations applied (if needed)
- ✅ Documentation updated
- ✅ Feature marked with ✅ in FEATURES.md

### Before Implementing Features

1. Check FEATURES.md for the user story (US-XXX)
2. Verify existing code with grep/glob tools
3. Check existing tests in `cypress/e2e/`
4. Check database schema in `docs/DATABASE.md`
5. Understand dependencies and prerequisites

### During Implementation

1. Follow the Resource pattern for data access
2. Use Redux for state management
3. Add i18n keys for all text
4. Include dark mode support
5. Add `data-cy` attributes for testing
6. Write Cypress tests alongside code

### After Implementation

1. Run linter: `npm run lint`
2. Run tests: `npm run cy:run`
3. Update FEATURES.md status
4. Commit with short, descriptive message
5. Update relevant documentation if needed

## Common Patterns

### Creating a New Resource

```javascript
// src/services/resources/MyResource.js
import { BaseResource } from './BaseResource';

class MyResource extends BaseResource {
  constructor() {
    super('table_name');
  }

  // Add custom methods for business logic
  async customQuery(param) {
    return this.where([
      { column: 'field', value: param }
    ]);
  }
}

export const MyResource = new MyResource();
```

### Using Resources in Redux

```javascript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { MyResource } from '../../services/resources';

export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (_, { rejectWithValue }) => {
    const { data, error } = await MyResource.index();
    if (error) return rejectWithValue(error.message);
    return data;
  }
);
```

## Swedish Compliance

The application supports Swedish invoice requirements:
- Invoice numbering in unbroken sequence per organization
- Required fields: Company name, org number, VAT number, address, municipality
- Manual vs automatic invoice numbering modes
- Swedish language support
- See SWEDISH_INVOICE_FORM_REQS.md for full requirements

## Current Implementation Status

Check FEATURES.md for current status of all user stories. Features are marked:
- ✅ Fully implemented and tested
- 🚧 In progress
- ⏸️ Blocked or pending
- (blank) Not started

## Security & Authentication

- Row Level Security (RLS) policies enforce data isolation
- User authentication via email/password or Google OAuth
- Resources automatically inject `user_id` when creating records
- All database operations respect Supabase RLS policies

## Database

- All tables use Supabase PostgreSQL
- RLS policies handle multi-tenancy
- Use migrations for schema changes
- See DATABASE.md for complete schema

## Additional Resources

- **README.md** - Project setup and overview
- **package.json** - Available npm scripts
- **cypress.config.js** - Cypress configuration
- **vite.config.js** - Vite build configuration

## Questions?

If you need clarification on any pattern or practice, refer to the comprehensive documentation in the `/docs` folder or check existing implementations in the codebase for examples.
