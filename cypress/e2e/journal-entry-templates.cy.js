/// <reference types="cypress" />

describe('Journal Entry Templates (US-213)', () => {
  // Test fiscal year data
  const testFiscalYear = {
    id: 'test-fiscal-year-id',
    organization_id: 'test-org-id',
    name: '2024',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_closed: false,
    next_verification_number: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Test accounts data
  const testAccounts = [
    { id: 'acc-1510', account_number: '1510', name: 'Kundfordringar', name_en: 'Accounts Receivable', account_class: 'assets', is_active: true },
    { id: 'acc-1930', account_number: '1930', name: 'Företagskonto', name_en: 'Bank Account', account_class: 'assets', is_active: true },
    { id: 'acc-3010', account_number: '3010', name: 'Försäljning varor', name_en: 'Sales Revenue', account_class: 'revenue', is_active: true },
    { id: 'acc-4010', account_number: '4010', name: 'Inköp material', name_en: 'Material Purchases', account_class: 'expenses', is_active: true },
    { id: 'acc-5010', account_number: '5010', name: 'Lokalhyra', name_en: 'Rent Expense', account_class: 'expenses', is_active: true },
    { id: 'acc-2440', account_number: '2440', name: 'Leverantörsskulder', name_en: 'Accounts Payable', account_class: 'liabilities', is_active: true }
  ]

  // Test template data
  const testTemplate = {
    id: 'test-template-id',
    organization_id: 'test-org-id',
    name: 'Monthly Rent Payment',
    description: 'Template for recording monthly rent',
    default_description: 'Monthly rent expense',
    use_count: 5,
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lines: [
      { id: 'line-1', account_id: 'acc-5010', account: testAccounts[4], debit_amount: 10000, credit_amount: 0, line_order: 0 },
      { id: 'line-2', account_id: 'acc-2440', account: testAccounts[5], debit_amount: 0, credit_amount: 10000, line_order: 1 }
    ]
  }

  const setupTemplateIntercepts = (templates = [], fiscalYears = [testFiscalYear], accounts = testAccounts) => {
    // Intercept fiscal years
    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: fiscalYears
    }).as('getFiscalYears')

    // Intercept journal entries
    cy.intercept('GET', '**/rest/v1/journal_entries*', {
      statusCode: 200,
      body: []
    }).as('getJournalEntries')

    // Intercept accounts
    cy.intercept('GET', '**/rest/v1/accounts*', {
      statusCode: 200,
      body: accounts
    }).as('getAccounts')

    // Intercept templates list
    cy.intercept('GET', '**/rest/v1/journal_entry_templates*', {
      statusCode: 200,
      body: templates
    }).as('getTemplates')

    // Intercept create template
    cy.intercept('POST', '**/rest/v1/journal_entry_templates*', (req) => {
      req.reply({
        statusCode: 201,
        body: { ...req.body, id: 'new-template-id', created_at: new Date().toISOString() }
      })
    }).as('createTemplate')

    // Intercept template lines
    cy.intercept('POST', '**/rest/v1/journal_entry_template_lines*', {
      statusCode: 201,
      body: []
    }).as('createTemplateLines')

    // Intercept delete template
    cy.intercept('DELETE', '**/rest/v1/journal_entry_templates*', {
      statusCode: 204
    }).as('deleteTemplate')

    // Intercept create journal entry
    cy.intercept('POST', '**/rest/v1/journal_entries*', (req) => {
      req.reply({
        statusCode: 201,
        body: { ...req.body, id: 'new-entry-id', verification_number: 1, created_at: new Date().toISOString() }
      })
    }).as('createJournalEntry')

    // Intercept RPC for verification number
    cy.intercept('POST', '**/rest/v1/rpc/get_next_verification_number', {
      statusCode: 200,
      body: 1
    }).as('getNextVerificationNumber')
  }

  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts({ clients: [], products: [] })
    cy.wait('@getDefaultOrg')
  })

  describe('Save as Template', () => {
    beforeEach(() => {
      setupTemplateIntercepts()
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to show Save as Template button when entry has at least 2 account lines', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('journal-entry-modal').should('be.visible')
      
      // Initially no save as template button (not enough lines with accounts)
      cy.getByCy('save-as-template-button').should('not.exist')
      
      // Fill first line with account
      cy.getByCy('line-account-0').type('1510')
      cy.contains('1510 - Accounts Receivable').click()
      cy.getByCy('line-debit-0').type('1000')
      
      // Still no button (only 1 line with account)
      cy.getByCy('save-as-template-button').should('not.exist')
      
      // Fill second line with account
      cy.getByCy('line-account-1').type('3010')
      cy.contains('3010 - Sales Revenue').click()
      cy.getByCy('line-credit-1').type('1000')
      
      // Now the button should appear
      cy.getByCy('save-as-template-button').should('be.visible')
    })

    it('is expected to open Save as Template modal when clicking the button', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      
      // Fill two lines
      cy.getByCy('line-account-0').type('1510')
      cy.contains('1510 - Accounts Receivable').click()
      cy.getByCy('line-debit-0').type('1000')
      cy.getByCy('line-account-1').type('3010')
      cy.contains('3010 - Sales Revenue').click()
      cy.getByCy('line-credit-1').type('1000')
      
      // Click save as template
      cy.getByCy('save-as-template-button').click()
      cy.getByCy('save-as-template-modal').should('be.visible')
    })

    it('is expected to display form fields in Save as Template modal', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      
      // Fill two lines
      cy.getByCy('line-account-0').type('1510')
      cy.contains('1510 - Accounts Receivable').click()
      cy.getByCy('line-debit-0').type('1000')
      cy.getByCy('line-account-1').type('3010')
      cy.contains('3010 - Sales Revenue').click()
      cy.getByCy('line-credit-1').type('1000')
      
      cy.getByCy('save-as-template-button').click()
      
      cy.getByCy('template-name-input').should('be.visible')
      cy.getByCy('template-description-input').should('be.visible')
      cy.getByCy('include-amounts-checkbox').should('be.visible')
    })

    it('is expected to close modal when clicking cancel', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      
      // Fill two lines
      cy.getByCy('line-account-0').type('1510')
      cy.contains('1510 - Accounts Receivable').click()
      cy.getByCy('line-debit-0').type('1000')
      cy.getByCy('line-account-1').type('3010')
      cy.contains('3010 - Sales Revenue').click()
      cy.getByCy('line-credit-1').type('1000')
      
      cy.getByCy('save-as-template-button').click()
      cy.getByCy('cancel-save-template').click()
      cy.getByCy('save-as-template-modal').should('not.exist')
    })

    it('is expected to show error when name is empty', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      
      // Fill two lines
      cy.getByCy('line-account-0').type('1510')
      cy.contains('1510 - Accounts Receivable').click()
      cy.getByCy('line-debit-0').type('1000')
      cy.getByCy('line-account-1').type('3010')
      cy.contains('3010 - Sales Revenue').click()
      cy.getByCy('line-credit-1').type('1000')
      
      cy.getByCy('save-as-template-button').click()
      cy.getByCy('confirm-save-template').click()
      cy.getByCy('save-template-error').should('be.visible')
    })
  })

  describe('Load from Template', () => {
    describe('when no templates exist', () => {
      beforeEach(() => {
        setupTemplateIntercepts([])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntries')
      })

      it('is expected to show Load from Template button for new entries', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').should('be.visible')
      })

      it('is expected to show empty state when no templates exist', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy('template-list-modal').should('be.visible')
        cy.getByCy('no-templates-message').should('be.visible')
      })
    })

    describe('when templates exist', () => {
      beforeEach(() => {
        setupTemplateIntercepts([testTemplate])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntries')
      })

      it('is expected to display template list', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy('template-list-modal').should('be.visible')
        cy.getByCy(`template-item-${testTemplate.id}`).should('be.visible')
      })

      it('is expected to show template name and description', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy(`template-item-${testTemplate.id}`).should('contain', 'Monthly Rent Payment')
        cy.getByCy(`template-item-${testTemplate.id}`).should('contain', 'Template for recording monthly rent')
      })

      it('is expected to show template usage count', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy(`template-item-${testTemplate.id}`).should('contain', 'Used 5 times')
      })

      it('is expected to show template line count', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy(`template-item-${testTemplate.id}`).should('contain', '2 lines')
      })

      it('is expected to close modal when clicking cancel', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy('close-template-list').click()
        cy.getByCy('template-list-modal').should('not.exist')
      })

      it('is expected to filter templates by search query', () => {
        setupTemplateIntercepts([
          testTemplate,
          { ...testTemplate, id: 'template-2', name: 'Supplier Payment', description: 'Pay suppliers' }
        ])
        
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy('template-search-input').type('Rent')
        cy.getByCy(`template-item-${testTemplate.id}`).should('be.visible')
        cy.getByCy('template-item-template-2').should('not.exist')
      })

      it('is expected to load template data when clicking Use button', () => {
        cy.getByCy('create-journal-entry-button').click()
        cy.wait('@getAccounts')
        cy.getByCy('load-from-template-button').click()
        cy.wait('@getTemplates')
        
        cy.getByCy(`use-template-${testTemplate.id}`).click()
        
        // Modal should close
        cy.getByCy('template-list-modal').should('not.exist')
        
        // Entry description should be populated
        cy.getByCy('entry-description').should('have.value', 'Monthly rent expense')
        
        // Lines should be populated (check debit amount on first line)
        cy.getByCy('line-debit-0').should('have.value', '10000')
        cy.getByCy('line-credit-1').should('have.value', '10000')
      })
    })
  })

  describe('Delete Template', () => {
    beforeEach(() => {
      setupTemplateIntercepts([testTemplate])
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to show delete button on templates', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('load-from-template-button').click()
      cy.wait('@getTemplates')
      
      cy.getByCy(`delete-template-${testTemplate.id}`).should('be.visible')
    })

    it('is expected to show confirmation dialog when clicking delete', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('load-from-template-button').click()
      cy.wait('@getTemplates')
      
      cy.getByCy(`delete-template-${testTemplate.id}`).click()
      cy.getByCy('confirm-delete-template-dialog').should('be.visible')
    })

    it('is expected to close dialog when clicking cancel', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('load-from-template-button').click()
      cy.wait('@getTemplates')
      
      cy.getByCy(`delete-template-${testTemplate.id}`).click()
      cy.getByCy('cancel-delete-template').click()
      cy.getByCy('confirm-delete-template-dialog').should('not.exist')
    })
  })

  describe('Template not shown for editing', () => {
    const testEntry = {
      id: 'test-entry-id',
      organization_id: 'test-org-id',
      fiscal_year_id: 'test-fiscal-year-id',
      verification_number: 1,
      entry_date: '2024-03-15',
      description: 'Test entry',
      status: 'draft',
      source_type: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fiscal_year: testFiscalYear,
      lines: [
        { id: 'line-1', account_id: 'acc-1510', account: testAccounts[0], debit_amount: 1000, credit_amount: 0, line_order: 0 },
        { id: 'line-2', account_id: 'acc-3010', account: testAccounts[2], debit_amount: 0, credit_amount: 1000, line_order: 1 }
      ]
    }

    beforeEach(() => {
      setupTemplateIntercepts([testTemplate])
      
      // Override to include an entry
      cy.intercept('GET', '**/rest/v1/journal_entries*', {
        statusCode: 200,
        body: [testEntry]
      }).as('getJournalEntries')
      
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to not show Load from Template button when editing an entry', () => {
      cy.getByCy('edit-entry-1').click()
      cy.wait('@getAccounts')
      cy.getByCy('journal-entry-modal').should('be.visible')
      
      // Load from template button should not be visible for editing
      cy.getByCy('load-from-template-button').should('not.exist')
    })
  })
})
