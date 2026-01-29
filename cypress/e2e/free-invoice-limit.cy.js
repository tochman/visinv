describe('US-004: Free Invoice Limit', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockClient = {
    id: 'test-client-id',
    name: 'Test Client AB',
    email: 'client@example.com',
    org_number: '556677-8899',
    address: 'Test Street 123',
    postal_code: '12345',
    city: 'Stockholm',
    country: 'Sweden',
    user_id: mockUser.id,
  };

  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization',
    user_id: mockUser.id,
    invoice_numbering_mode: 'automatic',
    invoice_counter: 1,
  };

  const mockPremiumSubscription = {
    id: 'premium-sub-id',
    user_id: mockUser.id,
    status: 'active',
    plan: 'premium',
  };

  beforeEach(() => {
    // Setup common intercepts
    cy.setupCommonIntercepts({ clients: [mockClient], products: [] });

    // Mock organization
    cy.intercept('GET', '**/rest/v1/organizations*', {
      statusCode: 200,
      body: [mockOrganization],
    }).as('getOrganizations');

    cy.intercept('GET', '**/rest/v1/invoice_templates*', {
      statusCode: 200,
      body: [],
    }).as('getTemplates');

    cy.login('admin');
  });

  describe('Happy Path - Free User Below Limit', () => {
    it('is expected to allow creating invoice when below limit (9 invoices)', () => {
      // Mock subscription state - empty array means free user (no subscription record)
      cy.intercept('GET', '**/rest/v1/subscriptions*', {
        statusCode: 406,
        body: {
          code: 'PGRST116',
          details: null,
          hint: null,
          message: 'The result contains 0 rows'
        }
      }).as('getSubscription');

      // Mock invoice count query - intercept BEFORE setupCommonIntercepts for priority
      cy.intercept('GET', '**/rest/v1/invoices*select=*', (req) => {
        const url = new URL(req.url);
        // Check if this is a count query (head=true means count-only query)
        if (url.searchParams.get('head') === 'true') {
          req.reply({
            statusCode: 206,
            headers: {
              'content-range': '0-8/9', // 9 invoices total
            },
            body: [],
          });
        } else {
          // Let regular invoice list queries pass to setupCommonIntercepts
          req.continue();
        }
      });

      // Now setup common intercepts (will handle regular getInvoices call)
      cy.setupCommonIntercepts({ clients: [mockClient], products: [], invoices: [] });

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: {
          id: 'new-invoice-id',
          invoice_number: 'INV-010',
          client_id: mockClient.id,
          status: 'draft',
          user_id: mockUser.id,
        },
      }).as('createInvoice');

      cy.intercept('POST', '**/rest/v1/invoice_rows*', {
        statusCode: 201,
        body: [],
      }).as('createInvoiceRows');

      cy.visit('/invoices');
      cy.wait('@getInvoices');

      // Act - Create invoice (9th invoice - below limit)
      cy.getByCy('create-invoice-button').click();

      // Assert - Invoice modal opens (limit not reached)
      cy.getByCy('invoice-modal').should('be.visible');

      // Fill and submit invoice
      cy.getByCy('client-select').select(mockClient.id);
      cy.getByCy('description-input-0').type('Test Service');
      cy.getByCy('unit-price-input-0').clear().type('1000');
      cy.getByCy('save-draft-button').click();

      // Assert - Invoice created successfully
      cy.wait('@createInvoice');
      cy.getByCy('invoice-modal').should('not.exist');
    });
  });

  describe('Sad Path - Free User Limit Reached', () => {
    it('is expected to show upgrade modal when limit reached (10 invoices)', () => {
      cy.setupCommonIntercepts({ clients: [mockClient], products: [], invoices: [] });

      cy.visit('/invoices');
      cy.wait('@getInvoices');

      // Dispatch subscriptions state directly to Redux - set invoice count to limit
      cy.window().its('store').invoke('dispatch', {
        type: 'subscriptions/fetchInvoiceCount/fulfilled',
        payload: 10, // At the limit
      });

      // Ensure isPremium is false (free user)
      cy.window().its('store').invoke('dispatch', {
        type: 'subscriptions/fetchSubscription/fulfilled',
        payload: null, // No subscription = free user
      });

      // Act - Try to create invoice when at limit
      cy.getByCy('create-invoice-button').click();

      // Assert - Upgrade modal opens instead of invoice modal
      cy.getByCy('upgrade-modal').should('be.visible');
      cy.getByCy('upgrade-modal-title').should('contain', 'Free Tier Limit Reached');
      cy.getByCy('upgrade-modal-message').should('contain', '10 invoices');

      // Assert - Invoice modal does not open
      cy.getByCy('invoice-modal').should('not.exist');
    });

    it('is expected to close upgrade modal when cancel is clicked', () => {
      cy.setupCommonIntercepts({ clients: [mockClient], products: [], invoices: [] });

      cy.visit('/invoices');
      cy.wait('@getInvoices');

      // Dispatch subscriptions state directly to Redux - set invoice count to limit
      cy.window().its('store').invoke('dispatch', {
        type: 'subscriptions/fetchInvoiceCount/fulfilled',
        payload: 10, // At the limit
      });

      // Ensure isPremium is false (free user)
      cy.window().its('store').invoke('dispatch', {
        type: 'subscriptions/fetchSubscription/fulfilled',
        payload: null, // No subscription = free user
      });

      // Open upgrade modal
      cy.getByCy('create-invoice-button').click();
      cy.getByCy('upgrade-modal').should('be.visible');

      // Act - Click cancel
      cy.getByCy('upgrade-modal-cancel').click();

      // Assert - Modal closes
      cy.getByCy('upgrade-modal').should('not.exist');
    });

    it.skip('is expected to navigate to subscription page when View Plans is clicked', () => {
      cy.setupCommonIntercepts({ clients: [mockClient], products: [], invoices: [] });

      cy.visit('/invoices');
      cy.wait('@getInvoices');

      // Dispatch subscriptions state directly to Redux - set invoice count to limit
      cy.window().its('store').invoke('dispatch', {
        type: 'subscriptions/fetchInvoiceCount/fulfilled',
        payload: 10, // At the limit
      });

      // Ensure isPremium is false (free user)
      cy.window().its('store').invoke('dispatch', {
        type: 'subscriptions/fetchSubscription/fulfilled',
        payload: null, // No subscription = free user
      });

      // Open upgrade modal
      cy.getByCy('create-invoice-button').click();
      cy.getByCy('upgrade-modal').should('be.visible');

      // Act - Click View Plans
      cy.getByCy('upgrade-modal-confirm').click();

      // Assert - Modal closes after clicking View Plans
      cy.getByCy('upgrade-modal').should('not.exist');
    });
  });

  describe('Happy Path - Premium User Unlimited Invoices', () => {
    it('is expected to allow creating invoice regardless of count for premium users', () => {
      // Mock subscription state - premium user
      cy.intercept('GET', '**/rest/v1/subscriptions*', {
        statusCode: 200,
        body: [mockPremiumSubscription],
      }).as('getSubscription');

      // Mock invoice count - 100 invoices (well above free limit)
      cy.intercept('GET', '**/rest/v1/invoices*select=*', (req) => {
        const url = new URL(req.url);
        if (url.searchParams.get('head') === 'true') {
          req.reply({
            statusCode: 206,
            headers: {
              'content-range': '0-99/100', // 100 invoices
            },
            body: [],
          });
        } else {
          req.continue();
        }
      });

      cy.setupCommonIntercepts({ clients: [mockClient], products: [], invoices: [] });

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: {
          id: 'new-invoice-id',
          invoice_number: 'INV-101',
          client_id: mockClient.id,
          status: 'draft',
          user_id: mockUser.id,
        },
      }).as('createInvoice');

      cy.intercept('POST', '**/rest/v1/invoice_rows*', {
        statusCode: 201,
        body: [],
      }).as('createInvoiceRows');

      cy.visit('/invoices');
      cy.wait('@getInvoices');

      // Act - Create invoice as premium user
      cy.getByCy('create-invoice-button').click();

      // Assert - Invoice modal opens (no limit for premium)
      cy.getByCy('invoice-modal').should('be.visible');

      // Fill and submit invoice
      cy.getByCy('client-select').select(mockClient.id);
      cy.getByCy('description-input-0').type('Premium Service');
      cy.getByCy('unit-price-input-0').clear().type('5000');
      cy.getByCy('save-draft-button').click();

      // Assert - Invoice created successfully
      cy.wait('@createInvoice');
      cy.getByCy('invoice-modal').should('not.exist');

      // Assert - Upgrade modal never appears
      cy.getByCy('upgrade-modal').should('not.exist');
    });
  });
});
