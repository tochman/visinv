/**
 * E2E Tests: NPS Survey System (US-120)
 * 
 * Tests the Net Promoter Score (NPS) survey functionality:
 * - Eligibility checks (minimum activity requirements)
 * - Display rules (30-day interval, 20% re-show chance)
 * - Survey interaction (score selection, feedback submission)
 * - Data persistence and tracking
 */

describe('NPS Survey System', () => {
  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization',
    invoice_numbering_mode: 'auto',
    next_invoice_number: 1,
  };

  const mockClient = {
    id: 'client-1',
    name: 'Test Client AB',
    email: 'client@test.com',
    address: 'Test Street 1',
    city: 'Stockholm',
    postal_code: '12345',
    country: 'Sweden',
  };

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test Description',
    unit: 'pcs',
    tax_rate: 25,
    prices: [{ currency: 'SEK', price: 100 }],
  };

  beforeEach(() => {
    cy.login('admin');
    cy.setupCommonIntercepts({
      clients: [],
      products: [],
      invoices: [],
      templates: [],
      defaultOrganization: mockOrganization,
    });
  });

  describe('Eligibility - Minimum Activity Requirements', () => {
    it('is expected to NOT show NPS if user has created less than 3 invoices/clients/products', () => {
      // Mock low activity counts
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        headers: { 'Content-Range': '0-1/2' },
        body: [],
      }).as('getInvoices');

      cy.intercept('GET', '**/rest/v1/clients*', {
        statusCode: 200,
        headers: { 'Content-Range': '0-1/2' },
        body: [],
      }).as('getClients');

      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        headers: { 'Content-Range': '0-1/2' },
        body: [],
      }).as('getProducts');

      // Mock NPS eligibility check returning false
      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [],
      }).as('checkNpsEligibility');

      cy.visit('/clients');
      cy.getByCy('add-client-button').click();
      
      // Mock successful client creation
      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: { ...mockClient },
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');

      // NPS modal should NOT appear
      cy.getByCy('nps-modal').should('not.exist');
    });

    it('is expected to show NPS after creating 3rd invoice', () => {
      // Mock 2 existing invoices
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        headers: { 'Content-Range': '0-1/2' },
        body: [],
      }).as('getInvoices');

      // Mock count headers to indicate 2 existing invoices
      cy.intercept('GET', '**/rest/v1/invoices*count*', (req) => {
        req.reply({
          statusCode: 200,
          headers: { 'Content-Range': '*/2' },
          body: [],
        });
      }).as('countInvoices');

      cy.intercept('GET', '**/rest/v1/clients*', {
        statusCode: 200,
        body: [mockClient],
      }).as('getClients');

      // Mock NPS eligibility check - eligible after 3rd invoice
      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [],
      }).as('checkEligibility');

      // Mock recording survey shown
      cy.intercept('POST', '**/rest/v1/nps_responses*', (req) => {
        req.reply({
          statusCode: 201,
          body: {
            id: 'nps-response-1',
            user_id: 'user-123',
            trigger_context: 'invoice_created',
            shown_at: new Date().toISOString(),
            score: null,
            feedback: null,
            responded_at: null,
          },
        });
      }).as('recordNpsShown');

      cy.visit('/invoices');
      cy.getByCy('create-invoice-button').click();

      // Fill and submit invoice form
      cy.getByCy('client-select').select(mockClient.id);
      cy.getByCy('description-input-0').type('Test Item');
      cy.getByCy('quantity-input-0').clear().type('1');
      cy.getByCy('unit-price-input-0').clear().type('100');

      // Mock successful invoice creation
      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: {
          id: 'invoice-3',
          invoice_number: 'INV-0003',
          client_id: mockClient.id,
          client: mockClient,
          status: 'draft',
        },
      }).as('createInvoice');

      cy.getByCy('save-invoice-button').click();
      cy.wait('@createInvoice');

      // NPS modal SHOULD appear
      cy.wait('@recordNpsShown');
      cy.getByCy('nps-modal').should('be.visible');
    });
  });

  describe('Survey Interaction - Score Selection & Feedback', () => {
    beforeEach(() => {
      // Set up eligible state
      cy.intercept('GET', '**/rest/v1/invoices*count*', {
        statusCode: 200,
        headers: { 'Content-Range': '*/3' },
        body: [],
      });

      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('POST', '**/rest/v1/nps_responses*', (req) => {
        if (!req.body.score) {
          // Initial "shown" record
          req.reply({
            statusCode: 201,
            body: {
              id: 'nps-response-1',
              user_id: 'user-123',
              trigger_context: req.body.trigger_context,
              shown_at: new Date().toISOString(),
              score: null,
              feedback: null,
              responded_at: null,
            },
          });
        }
      }).as('recordNpsShown');
    });

    it('is expected to display all score buttons (0-10)', () => {
      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');
      cy.wait('@recordNpsShown');

      cy.getByCy('nps-modal').should('be.visible');

      // Check all score buttons exist
      for (let i = 0; i <= 10; i++) {
        cy.getByCy(`nps-score-${i}`).should('be.visible');
      }
    });

    it('is expected to show feedback textarea after selecting a score', () => {
      cy.visit('/products');
      cy.getByCy('add-product-button').click();

      cy.intercept('POST', '**/rest/v1/products*', {
        statusCode: 201,
        body: mockProduct,
      }).as('createProduct');

      cy.getByCy('product-name-input').type('New Product');
      cy.getByCy('product-unit-select').select('pcs');
      cy.getByCy('product-price-SEK').type('100');
      cy.getByCy('save-product-button').click();
      cy.wait('@createProduct');
      cy.wait('@recordNpsShown');

      cy.getByCy('nps-modal').should('be.visible');

      // Feedback input should not exist initially
      cy.getByCy('nps-feedback-input').should('not.exist');

      // Select a score
      cy.getByCy('nps-score-8').click();

      // Feedback input should now appear
      cy.getByCy('nps-feedback-input').should('be.visible');
    });

    it('is expected to submit response with score and feedback', () => {
      cy.intercept('PATCH', '**/rest/v1/nps_responses*', (req) => {
        expect(req.body.score).to.equal(9);
        expect(req.body.feedback).to.include('Great product');
        expect(req.body.responded_at).to.exist;

        req.reply({
          statusCode: 200,
          body: {
            id: 'nps-response-1',
            score: 9,
            feedback: 'Great product!',
            responded_at: new Date().toISOString(),
          },
        });
      }).as('submitNpsResponse');

      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');
      cy.wait('@recordNpsShown');

      cy.getByCy('nps-modal').should('be.visible');
      cy.getByCy('nps-score-9').click();
      cy.getByCy('nps-feedback-input').type('Great product!');
      cy.getByCy('nps-submit-button').click();

      cy.wait('@submitNpsResponse');
      cy.getByCy('nps-modal').should('not.exist');
    });

    it('is expected to dismiss survey without submitting', () => {
      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');
      cy.wait('@recordNpsShown');

      cy.getByCy('nps-modal').should('be.visible');
      cy.getByCy('nps-dismiss-button').click();

      cy.getByCy('nps-modal').should('not.exist');
    });

    it('is expected to close survey when clicking backdrop', () => {
      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');
      cy.wait('@recordNpsShown');

      cy.getByCy('nps-modal').should('be.visible');
      cy.getByCy('nps-modal-backdrop').click({ force: true });

      cy.getByCy('nps-modal').should('not.exist');
    });
  });

  describe('Display Rules - 30-Day Interval & 20% Re-show', () => {
    it('is expected to NOT show NPS if shown in last 30 days', () => {
      // Mock recent survey shown 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [
          {
            id: 'nps-response-old',
            shown_at: tenDaysAgo.toISOString(),
            responded_at: null,
          },
        ],
      }).as('checkRecentSurvey');

      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');

      // NPS modal should NOT appear
      cy.getByCy('nps-modal').should('not.exist');
    });

    it('is expected to show NPS if last shown was 31 days ago', () => {
      // Mock survey shown 31 days ago
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [
          {
            id: 'nps-response-old',
            shown_at: thirtyOneDaysAgo.toISOString(),
            responded_at: thirtyOneDaysAgo.toISOString(),
          },
        ],
      }).as('checkOldSurvey');

      cy.intercept('POST', '**/rest/v1/nps_responses*', {
        statusCode: 201,
        body: {
          id: 'nps-response-new',
          shown_at: new Date().toISOString(),
          score: null,
        },
      }).as('recordNpsShown');

      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      }).as('createClient');

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@createClient');

      cy.wait('@recordNpsShown');
      cy.getByCy('nps-modal').should('be.visible');
    });
  });

  describe('Trigger Context Tracking', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/invoices*count*', {
        statusCode: 200,
        headers: { 'Content-Range': '*/3' },
        body: [],
      });

      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [],
      });
    });

    it('is expected to record "invoice_created" trigger context', () => {
      cy.intercept('POST', '**/rest/v1/nps_responses*', (req) => {
        expect(req.body.trigger_context).to.equal('invoice_created');
        req.reply({
          statusCode: 201,
          body: { id: 'nps-1', trigger_context: 'invoice_created' },
        });
      }).as('recordNpsShown');

      cy.intercept('GET', '**/rest/v1/clients*', { body: [mockClient] });

      cy.visit('/invoices');
      cy.getByCy('create-invoice-button').click();
      cy.getByCy('client-select').select(mockClient.id);
      cy.getByCy('description-input-0').type('Test');
      cy.getByCy('unit-price-input-0').clear().type('100');

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: { id: 'inv-1', invoice_number: 'INV-0001' },
      });

      cy.getByCy('save-invoice-button').click();
      cy.wait('@recordNpsShown');
    });

    it('is expected to record "client_created" trigger context', () => {
      cy.intercept('POST', '**/rest/v1/nps_responses*', (req) => {
        expect(req.body.trigger_context).to.equal('client_created');
        req.reply({
          statusCode: 201,
          body: { id: 'nps-2', trigger_context: 'client_created' },
        });
      }).as('recordNpsShown');

      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      });

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@recordNpsShown');
    });

    it('is expected to record "product_created" trigger context', () => {
      cy.intercept('POST', '**/rest/v1/nps_responses*', (req) => {
        expect(req.body.trigger_context).to.equal('product_created');
        req.reply({
          statusCode: 201,
          body: { id: 'nps-3', trigger_context: 'product_created' },
        });
      }).as('recordNpsShown');

      cy.visit('/products');
      cy.getByCy('add-product-button').click();

      cy.intercept('POST', '**/rest/v1/products*', {
        statusCode: 201,
        body: mockProduct,
      });

      cy.getByCy('product-name-input').type('New Product');
      cy.getByCy('product-unit-select').select('pcs');
      cy.getByCy('product-price-SEK').type('100');
      cy.getByCy('save-product-button').click();
      cy.wait('@recordNpsShown');
    });
  });

  describe('Score Category Styling', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/invoices*count*', {
        statusCode: 200,
        headers: { 'Content-Range': '*/3' },
        body: [],
      });

      cy.intercept('GET', '**/rest/v1/nps_responses*', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('POST', '**/rest/v1/nps_responses*', {
        statusCode: 201,
        body: { id: 'nps-1', shown_at: new Date().toISOString() },
      }).as('recordNpsShown');

      cy.visit('/clients');
      cy.getByCy('add-client-button').click();

      cy.intercept('POST', '**/rest/v1/clients*', {
        statusCode: 201,
        body: mockClient,
      });

      cy.getByCy('client-name-input').type('New Client');
      cy.getByCy('save-client-button').click();
      cy.wait('@recordNpsShown');
    });

    it('is expected to style detractors (0-6) with red color when selected', () => {
      cy.getByCy('nps-score-3').click();
      cy.getByCy('nps-score-3').should('have.class', 'bg-red-600');
    });

    it('is expected to style passives (7-8) with yellow color when selected', () => {
      cy.getByCy('nps-score-7').click();
      cy.getByCy('nps-score-7').should('have.class', 'bg-yellow-500');
    });

    it('is expected to style promoters (9-10) with green color when selected', () => {
      cy.getByCy('nps-score-10').click();
      cy.getByCy('nps-score-10').should('have.class', 'bg-green-600');
    });
  });
});
