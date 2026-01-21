# Development Workflow

## Feature Development Process

### 1. Feature Selection
- Features are defined in [FEATURES.md](FEATURES.md) as User Stories (US-XXX)
- Check what's actually implemented before starting
- Verify existing code, tests, and migrations

### 2. Definition of Done
A feature is **COMPLETE** only when:
- ✅ Code implemented following [ARCHITECTURE.md](ARCHITECTURE.md)
- ✅ Cypress tests written and passing
- ✅ Database migrations applied (if needed)
- ✅ Documentation updated
- ✅ Feature marked with ✅ in FEATURES.md

### 3. Implementation Checklist

**Before coding:**
- [ ] Read the user story in FEATURES.md
- [ ] Check existing code (`grep`, `file_search`, `semantic_search`)
- [ ] Check existing tests in `cypress/e2e/`
- [ ] Check existing migrations in `supabase/migrations/`
- [ ] Verify what's actually done vs. what needs doing

**During implementation:**
- [ ] Follow Resource pattern (see ARCHITECTURE.md)
- [ ] Components → Redux → Resources → Supabase
- [ ] Never let components touch Supabase directly
- [ ] Add i18n keys to `src/i18n/locales/{en,sv}.json`
- [ ] Include dark mode support (Tailwind `dark:` classes)
- [ ] Use `data-cy` attributes for testable elements

**Testing:**
- [ ] Write Cypress E2E tests in `cypress/e2e/`
- [ ] Cover happy path, validation, edge cases
- [ ] Use mocked Supabase responses
- [ ] Run tests to verify they pass

**Completion:**
- [ ] Update FEATURES.md with ✅ and status
- [ ] Commit with short message (e.g., "feat: add invoice creation")
- [ ] Push to remote

### 4. Commit Message Format

Use conventional commits:
- `feat: add X` - New feature
- `fix: resolve Y` - Bug fix
- `refactor: improve Z` - Code refactor
- `test: add tests for W` - Test changes
- `docs: update V` - Documentation
- `chore: U` - Maintenance

Keep messages short and descriptive.

### 5. Architecture Guidelines

**Resource Pattern:**
```javascript
// ✅ Good - Component uses Redux
const dispatch = useDispatch();
dispatch(fetchClients());

// ❌ Bad - Component calls Resource directly
import { Client } from '@/services/resources';
Client.index(); // NEVER DO THIS
```

**Data Flow:**
```
Component → Redux Slice → Resource → Supabase
```

**File Structure:**
```
src/
├── components/      # Pure UI
├── features/        # Redux slices
├── services/
│   └── resources/   # Data access layer
├── pages/           # Page components
└── i18n/            # Translations
```

### 6. Testing Strategy

**Cypress E2E Tests:**
- Mock Supabase API calls with `cy.intercept()`
- Test user workflows, not implementation
- Use `data-cy` selectors
- Test both success and error paths
- Cover validation errors

**Example:**
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/table*', { body: [] })
    cy.login('admin')
    cy.visit('/page')
  })

  it('is expected to do something', () => {
    cy.get('[data-cy="button"]').click()
    cy.get('[data-cy="modal"]').should('be.visible')
  })
})
```

### 7. Common Mistakes to Avoid

❌ **Don't assume** - Always check actual code  
❌ **Don't skip tests** - Feature isn't done without tests  
❌ **Don't bypass Resources** - Use the pattern  
❌ **Don't forget i18n** - All text needs translation keys  
❌ **Don't ignore dark mode** - All UI needs dark mode support  
❌ **Don't use long commits** - Keep messages concise  

### 8. Current Status Tracking

Check FEATURES.md for:
- ✅ = Fully implemented and tested
- 🚧 = In progress
- ⏸️ = Blocked or pending
- (blank) = Not started

### 9. Documentation to Update

When completing a feature:
- [ ] FEATURES.md - Mark user story complete
- [ ] ARCHITECTURE.md - Add new patterns if introduced
- [ ] README.md - Update feature list if user-facing

### 10. Next Feature Selection

Priority order:
1. MVP features (Phase 1 in FEATURES.md)
2. Features with dependencies met
3. Features that unblock other work
4. Premium features (Phase 2+)

Always verify dependencies are complete before starting.
