/// <reference types="cypress" />

describe('Copy Invoice (US-022-C)', () => {
  const mockClient = {
    id: 'client-123',
    name: 'Test Client AB',
    email: 'client@test.com',
  };

  const mockTemplate = {
    id: 'template-1',
    user_id: null,
    name: 'Modern',
    content: '<html><body><h1>{{invoice_number}}</h1><p>{{client_name}}</p></body></html>',
    is_system: true,
  };

  const mockInvoice = {
    id: 'invoice-1',
    invoice_number: 'INV-0001',
    client_id: mockClient.id,
    client: mockClient,
    invoice_template_id: mockTemplate.id,
    invoice_template: mockTemplate,
    issue_date: '2024-01-15',
    due_date: '2024-02-14',
    delivery_date: '2024-01-15',
    status: 'sent',
    invoice_type: 'DEBET',
    currency: 'SEK',
    tax_rate: 25,
    subtotal: 10000,
    tax_amount: 2500,
    total_amount: 12500,
    notes: 'Original invoice notes',
    terms: 'Original terms and conditions',
    reference: 'REF-001',
    invoice_rows: [
      {
        id: 'row-1',
        description: 'Consulting Services',
        quantity: 10,
        unit_price: 800,
        unit: 'hours',
        tax_rate: 25,
        amount: 8000,
      },
      {
        id: 'row-2',
        description: 'Project Management',
        quantity: 5,
        unit_price: 400,
        unit: 'hours',
        tax_rate: 25,
        amount: 2000,
      },
    ],
  };

  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization AB',
    org_number: '556677-8899',
    organization_number: '556677-8899',
    vat_number: 'SE556677889901',
    address: 'Testgatan 123',
    city: 'Stockholm',
    postal_code: '11122',
    country: 'Sweden',
    email: 'billing@testorg.se',
    phone: '+46701234567',
    bank_name: 'Nordea',
    bank_account: '1234-5678901234',
    bank_bic: 'NDEASESS',
    bank_iban: 'SE1234567890123456789012',
    invoice_numbering_mode: 'auto',
    invoice_prefix: 'INV-',
    next_invoice_number: 2,
  };

  beforeEach(() => {
    // Login first to establish session
    cy.login('admin');

    // Set up common intercepts
    cy.setupCommonIntercepts({
      clients: [mockClient],
      templates: [mockTemplate],
      products: [],
      invoices: [mockInvoice],
      defaultOrganization: mockOrganization,
    });

    // Mock show invoice endpoint for copy operation
    // .single() expects a single object, not an array
    cy.intercept('GET', `**/rest/v1/invoices**id=eq.${mockInvoice.id}**`, {
      statusCode: 200,
      body: mockInvoice,
    }).as('getInvoiceForCopy');

    // Mock create invoice
    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      const invoice = {
        id: 'copied-invoice-id',
        invoice_number: 'INV-0002',
        ...req.body,
        client: mockClient,
        status: 'draft',
      };
      req.reply({
        statusCode: 201,
        body: invoice,
      });
    }).as('createInvoice');

    // Mock invoice rows
    cy.intercept('POST', '**/rest/v1/invoice_rows*', {
      statusCode: 201,
      body: [],
    }).as('createInvoiceRows');

    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoices');
  });

  describe('Happy Path - Copy Invoice', () => {
    it('is expected to display copy button for all invoices', () => {
      // Assert - Copy button should exist and be clickable
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).scrollIntoView().should('exist');
    });

    it('is expected to open invoice modal with copied data when copy button is clicked', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceForCopy');

      // Assert - Modal opens
      cy.getByCy('invoice-modal').should('be.visible');
      
      // Assert - Modal title shows it's a copy
      cy.getByCy('invoice-modal-title').should('contain', 'Copy Invoice');
      cy.getByCy('invoice-modal-title').should('contain', mockInvoice.invoice_number);
      
      // Assert - Copy info banner is visible
      cy.getByCy('copy-info-banner').should('be.visible');
      cy.getByCy('copy-info-banner').should('contain', mockInvoice.invoice_number);
    });

    it('is expected to copy all invoice data correctly', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceForCopy');

      // Wait for modal and data to load
      cy.getByCy('invoice-modal').should('be.visible');
      cy.wait('@getClients');

      // Assert - Client is pre-selected (with retry for async population)
      cy.getByCy('client-select').should('have.value', mockClient.id);

      // Assert - Template is pre-selected
      cy.getByCy('template-select').should('have.value', mockTemplate.id);

      // Assert - Currency is copied
      cy.getByCy('currency-select').should('have.value', 'SEK');

      // Assert - Tax rate is copied - scrollIntoView for visibility
      cy.getByCy('tax-rate-input').scrollIntoView().should('have.value', '25');

      // Assert - Notes are copied
      cy.getByCy('notes-textarea').scrollIntoView().should('have.value', mockInvoice.notes);

      // Assert - Terms are copied
      cy.getByCy('terms-textarea').scrollIntoView().should('have.value', mockInvoice.terms);
    });

    it('is expected to copy all line items with correct data', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceForCopy');

      // Wait for modal and data to load
      cy.getByCy('invoice-modal').should('be.visible');
      cy.wait('@getClients');

      // Assert - First line item (scroll to line items section)
      cy.getByCy('description-input-0').scrollIntoView().should('have.value', 'Consulting Services');
      cy.getByCy('quantity-input-0').should('have.value', '10');
      cy.getByCy('unit-price-input-0').should('have.value', '800');
      cy.getByCy('unit-input-0').should('have.value', 'hours');

      // Assert - Second line item
      cy.getByCy('description-input-1').scrollIntoView().should('have.value', 'Project Management');
      cy.getByCy('quantity-input-1').should('have.value', '5');
      cy.getByCy('unit-price-input-1').should('have.value', '400');
      cy.getByCy('unit-input-1').should('have.value', 'hours');
    });

    it('is expected to have new dates set to today for issue date', () => {
      // Arrange - Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceForCopy');

      // Wait for modal
      cy.getByCy('invoice-modal').should('be.visible');

      // Assert - Issue date is today (not the original date)
      cy.getByCy('issue-date-input').should('have.value', today);
    });

    it('is expected to allow user to modify copied data before saving', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceForCopy');

      // Wait for modal
      cy.getByCy('invoice-modal').should('be.visible');
      cy.wait('@getClients');

      // Act - Modify first line item
      cy.getByCy('description-input-0').clear().type('Modified Service');
      cy.getByCy('quantity-input-0').clear().type('5');

      // Assert - Changes are reflected
      cy.getByCy('description-input-0').should('have.value', 'Modified Service');
      cy.getByCy('quantity-input-0').should('have.value', '5');
    });

    it('is expected to create new draft invoice when copied invoice is saved', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceForCopy');

      // Wait for modal
      cy.getByCy('invoice-modal').should('be.visible');
      cy.wait('@getClients');

      // Verify form is populated before saving
      cy.getByCy('client-select').should('have.value', mockClient.id);
      cy.getByCy('description-input-0').scrollIntoView().should('have.value', 'Consulting Services');

      // Act - Save the copied invoice (uses save-draft-button because it's a new invoice)
      cy.getByCy('save-draft-button').scrollIntoView().click();

      // Assert - Invoice is created
      cy.wait('@createInvoice').its('request.body').should((body) => {
        expect(body.client_id).to.equal(mockClient.id);
        expect(body.currency).to.equal('SEK');
        expect(body.tax_rate).to.equal(25);
      });

      // Assert - Modal closes
      cy.getByCy('invoice-modal').should('not.exist');
    });

    it('is expected to show success toast after copying invoice', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceForCopy');

      // Assert - Success message is shown
      cy.contains('Invoice copied successfully').should('be.visible');
    });

    it('is expected to generate new invoice number for automatic numbering mode', () => {
      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceForCopy');

      // Wait for modal and data to load
      cy.getByCy('invoice-modal').should('be.visible');
      cy.wait('@getClients');

      // Verify form is populated before saving
      cy.getByCy('client-select').should('have.value', mockClient.id);
      cy.getByCy('description-input-0').scrollIntoView().should('have.value', 'Consulting Services');

      // Act - Save the copied invoice (uses save-draft-button because it's a new invoice)
      cy.getByCy('save-draft-button').scrollIntoView().click();

      // Assert - New invoice number is generated (not the copied one)
      cy.wait('@createInvoice').its('request.body.invoice_number').should('not.equal', mockInvoice.invoice_number);
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to handle error when invoice cannot be loaded for copying', () => {
      // Arrange - Mock error response for show invoice
      cy.intercept('GET', `**/rest/v1/invoices**id=eq.${mockInvoice.id}**`, {
        statusCode: 500,
        body: { error: 'Failed to load invoice' },
      }).as('getInvoiceError');

      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceError');

      // Assert - Error message is shown (toast or alert)
      cy.contains('Failed').should('be.visible');
    });

    it('is expected to handle error when creating copied invoice fails', () => {
      // Arrange - Mock error response for create invoice
      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 500,
        body: { error: 'Failed to create invoice' },
      }).as('createInvoiceError');

      // Act - Copy and try to save
      cy.getByCy(`copy-invoice-button-${mockInvoice.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceForCopy');
      cy.getByCy('invoice-modal').should('be.visible');
      cy.wait('@getClients');

      // Verify form is populated before saving
      cy.getByCy('client-select').should('have.value', mockClient.id);
      cy.getByCy('description-input-0').scrollIntoView().should('have.value', 'Consulting Services');

      cy.getByCy('save-draft-button').scrollIntoView().click();

      // Assert - Error is handled
      cy.wait('@createInvoiceError');
      // Modal might stay open to allow retry
      cy.getByCy('invoice-modal').should('be.visible');
    });
  });

  describe('Edge Cases', () => {
    it('is expected to copy invoice with empty notes and terms', () => {
      // Arrange - Invoice with no notes/terms
      const invoiceWithoutNotes = {
        ...mockInvoice,
        id: 'invoice-no-notes',
        notes: '',
        terms: '',
      };

      // Set up intercepts BEFORE navigation
      cy.intercept('GET', '**/rest/v1/invoices*select=*', {
        statusCode: 200,
        body: [invoiceWithoutNotes],
      }).as('getInvoicesUpdated');

      cy.intercept('GET', `**/rest/v1/invoices**id=eq.invoice-no-notes**`, {
        statusCode: 200,
        body: invoiceWithoutNotes,
      }).as('getInvoiceNoNotes');

      // Reload to get new invoice list
      cy.visit('/invoices');
      cy.wait('@getInvoicesUpdated');

      // Act - Click copy button
      cy.getByCy(`copy-invoice-button-${invoiceWithoutNotes.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceNoNotes');

      // Assert - Modal opens successfully
      cy.getByCy('invoice-modal').should('be.visible');

      // Assert - Notes and terms are empty
      cy.getByCy('notes-textarea').scrollIntoView().should('have.value', '');
      cy.getByCy('terms-textarea').scrollIntoView().should('have.value', '');
    });

    it('is expected to copy invoice with single line item', () => {
      // Arrange - Invoice with only one line item
      const invoiceWithOneRow = {
        ...mockInvoice,
        id: 'invoice-one-row',
        invoice_rows: [mockInvoice.invoice_rows[0]],
      };

      // Set up intercepts BEFORE navigation
      cy.intercept('GET', '**/rest/v1/invoices*select=*', {
        statusCode: 200,
        body: [invoiceWithOneRow],
      }).as('getInvoicesOneRow');

      cy.intercept('GET', `**/rest/v1/invoices**id=eq.invoice-one-row**`, {
        statusCode: 200,
        body: invoiceWithOneRow,
      }).as('getInvoiceOneRow');

      cy.visit('/invoices');
      cy.wait('@getInvoicesOneRow');

      // Act - Copy invoice
      cy.getByCy(`copy-invoice-button-${invoiceWithOneRow.id}`).scrollIntoView().click();
      cy.wait('@getInvoiceOneRow');

      // Assert - Only one line item is copied
      cy.getByCy('invoice-modal').should('be.visible');
      cy.getByCy('description-input-0').scrollIntoView().should('exist');
      cy.getByCy('description-input-1').should('not.exist');
    });

    it('is expected to copy draft invoice as well as sent invoices', () => {
      // Arrange - Draft invoice
      const draftInvoice = {
        ...mockInvoice,
        id: 'draft-invoice',
        status: 'draft',
      };

      // Set up intercepts BEFORE navigation
      cy.intercept('GET', '**/rest/v1/invoices*select=*', {
        statusCode: 200,
        body: [draftInvoice],
      }).as('getInvoicesDraft');

      cy.intercept('GET', `**/rest/v1/invoices**id=eq.draft-invoice**`, {
        statusCode: 200,
        body: draftInvoice,
      }).as('getDraftInvoice');

      cy.visit('/invoices');
      cy.wait('@getInvoicesDraft');

      // Assert - Copy button exists for draft invoice
      cy.getByCy(`copy-invoice-button-${draftInvoice.id}`).scrollIntoView().should('exist');

      // Act - Copy draft invoice
      cy.getByCy(`copy-invoice-button-${draftInvoice.id}`).click();
      cy.wait('@getDraftInvoice');

      // Assert - Modal opens
      cy.getByCy('invoice-modal').should('be.visible');
      cy.getByCy('copy-info-banner').should('be.visible');
    });
  });
});
