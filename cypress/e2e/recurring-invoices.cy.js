describe('Recurring Invoices (US-025)', () => {
  beforeEach(() => {
    // Set up test-specific intercepts BEFORE login
    cy.intercept('GET', '**/rest/v1/recurring_invoices*', []).as('getRecurringInvoices');
    cy.intercept('GET', '**/rest/v1/clients*', []).as('getClients');
    cy.intercept('GET', '**/rest/v1/invoice_templates*', []).as('getTemplates');
    cy.intercept('GET', '**/rest/v1/products*', []).as('getProducts');
    
    // Login as premium user (visits / first)
    cy.login('premiumUser');
  });

  describe('Page Access and Navigation', () => {
    it.only('is expected to display recurring invoices page for premium users', () => {
      // Verify we're premium by checking sidebar link is not disabled
      cy.get('[data-cy="sidebar-nav-recurring-invoices"]').should('not.have.class', 'cursor-not-allowed');
      
      // Navigate via sidebar
      cy.get('[data-cy="sidebar-nav-recurring-invoices"]').click();
      
      // Verify URL changed
      cy.url().should('include', '/recurring-invoices');
      
      cy.get('[data-cy="recurring-invoices-page"]').should('be.visible');
    });

    it('is expected to show empty state when no recurring invoices exist', () => {
      cy.visit('/recurring-invoices');

      cy.get('[data-cy="empty-state"]').should('be.visible');
      cy.contains('No Recurring Schedules').should('be.visible');
    });
  });

  describe('Create Recurring Invoice', () => {
    beforeEach(() => {
      const mockClient = {
        id: 'client-1',
        name: 'Test Client',
        email: 'client@test.com'
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'Modern',
        is_system: true
      };

      cy.intercept('GET', '**/rest/v1/clients*', [mockClient]).as('getClients');
      cy.intercept('GET', '**/rest/v1/invoice_templates*', [mockTemplate]).as('getTemplates');
    });

    it('is expected to open create modal when clicking create button', () => {
      cy.visit('/recurring-invoices');

      cy.get('[data-cy="create-recurring-invoice-button"]').click();
      cy.get('[data-cy="recurring-invoice-modal"]').should('be.visible');
      cy.get('[data-cy="recurring-invoice-modal-title"]').should('contain', 'Create');
    });

    it('is expected to display all frequency options in dropdown', () => {
      cy.visit('/recurring-invoices');

      cy.get('[data-cy="create-recurring-invoice-button"]').click();
      cy.get('[data-cy="recurring-invoice-modal"]').should('be.visible');

      cy.get('[data-cy="frequency-select"]').should('be.visible');
      
      // Verify all frequency options
      const frequencies = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
      frequencies.forEach(freq => {
        cy.get('[data-cy="frequency-select"]').find('option').should('contain.value', freq);
      });

      // Default should be monthly
      cy.get('[data-cy="frequency-select"]').should('have.value', 'monthly');
    });

    it('is expected to create a monthly recurring invoice schedule', () => {
      cy.intercept('POST', '**/rest/v1/recurring_invoices*', (req) => {
        expect(req.body.frequency).to.eq('monthly');
        expect(req.body.name).to.eq('Monthly Service Fee');
        req.reply({
          statusCode: 201,
          body: { 
            id: 'recurring-1',
            ...req.body,
            client: { id: 'client-1', name: 'Test Client' },
            invoice_count: 0,
            status: 'active'
          }
        });
      }).as('createRecurring');

      cy.visit('/recurring-invoices');

      cy.get('[data-cy="create-recurring-invoice-button"]').click();
      cy.get('[data-cy="recurring-invoice-modal"]').should('be.visible');

      // Fill in the form
      cy.get('[data-cy="schedule-name-input"]').type('Monthly Service Fee');
      cy.get('[data-cy="client-select"]').select('client-1');
      cy.get('[data-cy="frequency-select"]').select('monthly');
      
      // Add line item
      cy.get('[data-cy="description-input-0"]').type('Monthly hosting service');
      cy.get('[data-cy="quantity-input-0"]').clear().type('1');
      cy.get('[data-cy="unit-price-input-0"]').clear().type('500');

      // Submit
      cy.get('[data-cy="submit-button"]').click();
      cy.wait('@createRecurring');

      // Modal should close
      cy.get('[data-cy="recurring-invoice-modal"]').should('not.exist');
    });

    it('is expected to require schedule name', () => {
      cy.visit('/recurring-invoices');

      cy.get('[data-cy="create-recurring-invoice-button"]').click();
      cy.get('[data-cy="recurring-invoice-modal"]').should('be.visible');

      // Don't fill name, just select client and add line item
      cy.get('[data-cy="client-select"]').select('client-1');
      cy.get('[data-cy="description-input-0"]').type('Test service');
      cy.get('[data-cy="unit-price-input-0"]').clear().type('100');

      cy.get('[data-cy="submit-button"]').click();

      // Error should show
      cy.get('[data-cy="recurring-invoice-form-error"]').should('be.visible');
    });
  });

  describe('List and Actions', () => {
    const mockRecurringInvoice = {
      id: 'recurring-1',
      name: 'Monthly Hosting',
      client_id: 'client-1',
      client: { id: 'client-1', name: 'Test Client', email: 'test@example.com' },
      frequency: 'monthly',
      start_date: '2026-01-01',
      next_invoice_date: '2026-02-01',
      last_invoice_date: '2026-01-15',
      invoice_count: 1,
      status: 'active',
      currency: 'SEK',
      tax_rate: 25,
      rows_template: JSON.stringify([
        { description: 'Monthly hosting service', quantity: 1, unit_price: 500, unit: 'st', tax_rate: 25 }
      ])
    };

    it('is expected to display recurring invoice in list with correct details', () => {
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [mockRecurringInvoice]).as('getRecurring');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');
      
      cy.visit('/recurring-invoices');

      cy.get(`[data-cy="recurring-invoice-row-${mockRecurringInvoice.id}"]`).should('be.visible');
      cy.get('[data-cy="schedule-name"]').should('contain', 'Monthly Hosting');
      cy.get('[data-cy="client-name"]').should('contain', 'Test Client');
      cy.get('[data-cy="frequency"]').should('contain', 'Monthly');
      cy.get('[data-cy="status-badge"]').should('contain', 'Active');
    });

    it('is expected to pause an active recurring invoice', () => {
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [mockRecurringInvoice]).as('getRecurring');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');
      cy.intercept('PATCH', '**/rest/v1/recurring_invoices*', (req) => {
        expect(req.body.status).to.eq('paused');
        req.reply({
          statusCode: 200,
          body: { ...mockRecurringInvoice, status: 'paused' }
        });
      }).as('pauseRecurring');

      cy.visit('/recurring-invoices');

      cy.get('[data-cy="pause-button"]').click();
      cy.wait('@pauseRecurring');
    });

    it('is expected to resume a paused recurring invoice', () => {
      const pausedInvoice = { ...mockRecurringInvoice, status: 'paused' };
      
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [pausedInvoice]).as('getPausedInvoices');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');
      cy.intercept('PATCH', '**/rest/v1/recurring_invoices*', (req) => {
        expect(req.body.status).to.eq('active');
        req.reply({
          statusCode: 200,
          body: { ...pausedInvoice, status: 'active' }
        });
      }).as('resumeRecurring');

      cy.visit('/recurring-invoices');

      cy.get('[data-cy="resume-button"]').click();
      cy.wait('@resumeRecurring');
    });

    it('is expected to delete a recurring invoice', () => {
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [mockRecurringInvoice]).as('getRecurring');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');
      cy.intercept('DELETE', '**/rest/v1/recurring_invoices*', {
        statusCode: 204
      }).as('deleteRecurring');

      cy.visit('/recurring-invoices');

      cy.get('[data-cy="delete-button"]').click();
      
      // Confirm deletion
      cy.get('[data-cy="confirm-delete-button"]').click();
      cy.wait('@deleteRecurring');
    });

    it('is expected to open edit modal with existing data', () => {
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [mockRecurringInvoice]).as('getRecurring');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');
      
      cy.visit('/recurring-invoices');

      cy.get('[data-cy="edit-button"]').click();
      cy.get('[data-cy="recurring-invoice-modal"]').should('be.visible');
      cy.get('[data-cy="recurring-invoice-modal-title"]').should('contain', 'Edit');
      
      // Check that form is populated with existing data
      cy.get('[data-cy="schedule-name-input"]').should('have.value', 'Monthly Hosting');
      cy.get('[data-cy="frequency-select"]').should('have.value', 'monthly');
    });

    it('is expected to filter by status', () => {
      const activeInvoice = { ...mockRecurringInvoice, id: 'recurring-1', status: 'active' };
      const pausedInvoice = { ...mockRecurringInvoice, id: 'recurring-2', name: 'Paused Schedule', status: 'paused' };
      
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [activeInvoice, pausedInvoice]).as('getAllInvoices');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');

      cy.visit('/recurring-invoices');

      // Initially should show both
      cy.get('[data-cy^="recurring-invoice-row"]').should('have.length', 2);

      // Filter by paused
      cy.get('[data-cy="status-filter"]').select('paused');
      cy.get('[data-cy^="recurring-invoice-row"]').should('have.length', 1);
      cy.get('[data-cy="schedule-name"]').should('contain', 'Paused Schedule');

      // Filter by active
      cy.get('[data-cy="status-filter"]').select('active');
      cy.get('[data-cy^="recurring-invoice-row"]').should('have.length', 1);
      cy.get('[data-cy="schedule-name"]').should('contain', 'Monthly Hosting');
    });

    it('is expected to search by name', () => {
      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [mockRecurringInvoice]).as('getRecurring');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurringInvoice.client]).as('getClients');
      
      cy.visit('/recurring-invoices');

      // Search for existing name
      cy.get('[data-cy="search-input"]').type('Monthly');
      cy.get('[data-cy^="recurring-invoice-row"]').should('have.length', 1);

      // Search for non-existing name
      cy.get('[data-cy="search-input"]').clear().type('Nonexistent');
      cy.get('[data-cy^="recurring-invoice-row"]').should('have.length', 0);
    });
  });

  describe('Generate Invoice', () => {
    it('is expected to generate invoice from recurring schedule', () => {
      const mockRecurring = {
        id: 'recurring-1',
        name: 'Monthly Hosting',
        client_id: 'client-1',
        client: { id: 'client-1', name: 'Test Client' },
        frequency: 'monthly',
        start_date: '2026-01-01',
        next_invoice_date: '2026-01-23',
        invoice_count: 0,
        status: 'active',
        currency: 'SEK',
        tax_rate: 25,
        rows_template: JSON.stringify([
          { description: 'Monthly hosting', quantity: 1, unit_price: 500, unit: 'st', tax_rate: 25 }
        ])
      };

      cy.intercept('GET', '**/rest/v1/recurring_invoices*', [mockRecurring]).as('getRecurring');
      cy.intercept('GET', '**/rest/v1/clients*', [mockRecurring.client]).as('getClients');

      // Mock the invoice creation
      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: {
          id: 'invoice-1',
          invoice_number: 'INV-0001',
          recurring_invoice_id: 'recurring-1'
        }
      }).as('createInvoice');

      // Mock recurring invoice update
      cy.intercept('PATCH', '**/rest/v1/recurring_invoices*', {
        statusCode: 200,
        body: { ...mockRecurring, invoice_count: 1, last_invoice_date: '2026-01-23' }
      }).as('updateRecurring');

      // Mock invoices list refresh
      cy.intercept('GET', '**/rest/v1/invoices*', []).as('getInvoices');

      cy.visit('/recurring-invoices');

      cy.get('[data-cy="generate-now-button"]').click();
      
      // Should show success message
      cy.on('window:alert', (text) => {
        expect(text).to.contain('generated');
      });
    });
  });
});
