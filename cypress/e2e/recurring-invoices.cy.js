/// <reference types="cypress" />

describe("Recurring Invoices", () => {
  const mockClient = {
    id: "client-123",
    name: "Test Client AB",
    email: "client@test.com",
    organization_id: "test-premium-org-id",
  };

  const mockTemplate = {
    id: "template-1",
    user_id: null,
    name: "Modern",
    content:
      "<html><body><h1>{{invoice_number}}</h1><p>{{client_name}}</p></body></html>",
    is_system: true,
  };
  
  beforeEach(() => {
    // Use premiumUserWithOrganization - organization mocking is handled by login command
    cy.login("premiumUserWithOrganization");
    
    // Additional organization mock for getDefault calls (uses .single() which expects single object)
    const mockOrganization = {
      id: 'test-premium-org-id',
      name: 'Test Premium Organization AB',
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
      next_invoice_number: 1
    };
    
    // Set up common intercepts
    cy.setupCommonIntercepts({
      invoices: [],
      clients: [mockClient],
      templates: [mockTemplate],
      products: [],
      defaultOrganization: mockOrganization
    });
    
    // Mock create invoice
    cy.intercept("POST", "**/rest/v1/invoices*", (req) => {
      const invoice = {
        id: "new-invoice-id",
        invoice_number: "INV-0001",
        ...req.body,
        client: mockClient,
        status: "draft",
      };
      req.reply({
        statusCode: 201,
        body: invoice,
      });
    }).as("createInvoice");

    // Mock invoice rows
    cy.intercept("POST", "**/rest/v1/invoice_rows*", {
      statusCode: 201,
      body: [],
    }).as("createInvoiceRows");
    
    // Mock update invoice
    cy.intercept("PATCH", "**/rest/v1/invoices*", (req) => {
      req.reply({
        statusCode: 200,
        body: { ...req.body },
      });
    }).as("updateInvoice");
    
    // Mock delete invoice
    cy.intercept("DELETE", "**/rest/v1/invoices*", {
      statusCode: 204,
      body: null,
    }).as("deleteInvoice");
    
    cy.getByCy("sidebar-nav-invoices").click();
    cy.wait('@getInvoices');
  });

  describe("Create Recurring Invoice", () => {
    it("is expected to show recurring options for premium users", () => {
      cy.get('[data-cy="create-invoice-button"]').click();
      cy.get('[data-cy="invoice-modal"]').should("be.visible");

      // Recurring section should be visible for premium users
      cy.contains("Make Recurring").scrollIntoView().should("be.visible");
      cy.get('[data-cy="recurring-toggle"]').should("exist");
    });

    it("is expected to create a recurring invoice with monthly frequency", () => {
      cy.getByCy('create-invoice-button').click();
      cy.get('[data-cy="invoice-modal"]').should("be.visible");

      // Fill basic invoice details
      cy.get('[data-cy="client-select"]').should('be.visible').select("Test Client AB");
      cy.get('[data-cy="issue-date-input"]').type("2026-01-24");
      cy.get('[data-cy="due-date-input"]').type("2026-02-23");

      

      // Enable recurring
      cy.getByCy('recurring-toggle').scrollIntoView().click({ force: true });
      cy.get('[data-cy="recurring-section"]').should("be.visible");
      
      // Set recurring options
      cy.get('[data-cy="recurring-frequency-select"]').select("monthly");
      cy.get('[data-cy="recurring-end-date-input"]').type("2026-12-31");
      cy.get('[data-cy="recurring-max-invoices-input"]').clear().type("12");

      // Add a line item
      cy.get('[data-cy="add-line-item-button"]').click();
      cy.get('[data-cy="description-input-0"]').type("IT Consulting");
      cy.get('[data-cy="quantity-input-0"]').clear().type("1");
      cy.get('[data-cy="unit-price-input-0"]').clear().type("1000");
      // cy.screenshot("recurring-invoice-before-enabling");
      // Save invoice
      cy.get('[data-cy="submit-button"]').scrollIntoView().click();
      
      // Wait for invoice creation
      cy.wait('@createInvoice');
      cy.wait('@createInvoiceRows');
      
      
      // Should close modal and return to invoices list
      cy.get('[data-cy="invoice-modal"]').should("not.exist");
      cy.url().should("include", "/invoices");
    });

    it("is expected to create recurring invoice with unlimited occurrences", () => {
      cy.get('[data-cy="create-invoice-button"]').click();

      cy.get('[data-cy="client-select"]').select("Test Client AB");
      cy.get('[data-cy="issue-date-input"]').type("2026-01-24");
      cy.get('[data-cy="due-date-input"]').type("2026-02-23");

      cy.get('[data-cy="add-line-item-button"]').click();
      cy.get('[data-cy="description-input-0"]').type("Monthly Subscription");
      cy.get('[data-cy="quantity-input-0"]').clear().type("1");
      cy.get('[data-cy="unit-price-input-0"]').clear().type("500");

      cy.get('[data-cy="recurring-toggle"]').click({ force: true });
      cy.get('[data-cy="recurring-frequency-select"]').select("monthly");

      // Don't set end date or max count - should be unlimited
      cy.get('[data-cy="submit-button"]').click();

      // Wait for invoice creation
      cy.wait('@createInvoice');
      cy.wait('@createInvoiceRows');
      
      cy.url().should("include", "/invoices");
    });

    it("is expected to validate recurring settings", () => {
      cy.get('[data-cy="create-invoice-button"]').click();

      cy.get('[data-cy="client-select"]').select("Test Client AB");
      cy.get('[data-cy="issue-date-input"]').type("2026-01-24");
      cy.get('[data-cy="due-date-input"]').type("2026-02-23");

      cy.get('[data-cy="add-line-item-button"]').click();
      cy.get('[data-cy="description-input-0"]').type("Service");
      cy.get('[data-cy="quantity-input-0"]').clear().type("1");
      cy.get('[data-cy="unit-price-input-0"]').clear().type("100");

      // Enable recurring - should show recurring section with default frequency
      cy.get('[data-cy="recurring-toggle"]').click({ force: true });
      cy.get('[data-cy="recurring-section"]').should("be.visible");
      
      // Verify default frequency is monthly
      cy.get('[data-cy="recurring-frequency-select"]').should("have.value", "monthly");
      
      // Change to weekly and verify
      cy.get('[data-cy="recurring-frequency-select"]').select("weekly");
      cy.get('[data-cy="recurring-frequency-select"]').should("have.value", "weekly");
      
      // Save should work
      cy.get('[data-cy="submit-button"]').click();
      cy.wait('@createInvoice');
      cy.wait('@createInvoiceRows');
    });
  });

  describe("View Recurring Invoices", () => {
    beforeEach(() => {
      // Override invoices with fixture data containing recurring invoice
      cy.intercept("GET", "**/rest/v1/invoices*", {
        fixture: "recurring_invoices.json",
      }).as("getInvoicesFixture");

      cy.getByCy("sidebar-nav-invoices").click();
      cy.wait("@getInvoicesFixture");
    });

    it("is expected to display recurring indicator for recurring invoices", () => {
      // First invoice in fixture is recurring
      cy.get('[data-cy^="recurring-schedule-indicator-"]').should(
        "have.length",
        1,
      );

      // Verify the tooltip contains the frequency (visible on hover)
      cy.get('[data-cy^="recurring-schedule-indicator-"]')
        .first()
        .within(() => {
          // The tooltip span contains the frequency text
          cy.get('[data-cy^="recurring-tooltip-"]')
            .should("exist")
            .and("contain", "Monthly");
        });
    });

    it("is expected to show recurring invoice details", () => {
      cy.get('[data-cy^="invoice-row-"]')
        .first()
        .within(() => {
          // Should show recurring indicator
          cy.get('[data-cy^="recurring-schedule-indicator-"]').should("exist");

          // Should show invoice number
          cy.contains("INV-0004").should("be.visible");

          // Should show status
          cy.get('[data-cy^="invoice-status-"]').should("contain", "Draft");
        });
    });

    it("is expected to filter recurring invoices", () => {
      // Add a search term that matches recurring invoice
      cy.get('[data-cy="search-invoices-input"]').type("INV-0004");

      // Should show only the recurring invoice
      cy.get('[data-cy^="invoice-row-"]').should("have.length", 1);
      cy.get('[data-cy^="recurring-schedule-indicator-"]').should("exist");
    });
  });

  describe("Edit Recurring Invoice", () => {
    beforeEach(() => {
      // Override invoices with fixture data containing recurring invoice
      cy.intercept("GET", "**/rest/v1/invoices*", {
        fixture: "recurring_invoices.json",
      }).as("getInvoicesFixture");

      cy.getByCy("sidebar-nav-invoices").click();
      cy.wait("@getInvoicesFixture");
    });

    it("is expected to open recurring invoice in edit mode with recurring settings visible", () => {
      // Click edit button on first invoice (recurring one)
      cy.get('[data-cy^="edit-invoice-button-"]').first().click();

      cy.get('[data-cy="invoice-modal"]').should("be.visible");

      // Scroll to recurring section and verify it's visible
      cy.get('[data-cy="recurring-section"]').scrollIntoView().should("be.visible");
      
      // Recurring toggle should be checked
      cy.get('[data-cy="recurring-toggle"]').should("be.checked");

      // Should show current settings
      cy.get('[data-cy="recurring-frequency-select"]').should(
        "have.value",
        "monthly",
      );
      cy.get('[data-cy="recurring-end-date-input"]').should(
        "have.value",
        "2026-01-31",
      );
      cy.get('[data-cy="recurring-max-invoices-input"]').should("have.value", "3");
    });

    it("is expected to update recurring settings", () => {
      cy.get('[data-cy^="edit-invoice-button-"]').first().click();

      // Change frequency
      cy.get('[data-cy="recurring-frequency-select"]').select("quarterly");

      // Change max count
      cy.get('[data-cy="recurring-max-invoices-input"]').clear().type("4");

      cy.get('[data-cy="submit-button"]').click();

      cy.wait('@updateInvoice');
      cy.get('[data-cy="invoice-modal"]').should("not.exist");
    });

    it("is expected to disable recurring on an existing recurring invoice", () => {
      cy.get('[data-cy^="edit-invoice-button-"]').first().click();

      // Disable recurring
      cy.get('[data-cy="recurring-toggle"]').click({ force: true });
      cy.get('[data-cy="recurring-section"]').should("not.be.visible");

      cy.get('[data-cy="submit-button"]').click();

      cy.wait('@updateInvoice');
      cy.get('[data-cy="invoice-modal"]').should("not.exist");
    });
  });

  describe("Recurring Invoice Information Display", () => {
    beforeEach(() => {
      // Override invoices with fixture data containing recurring invoice
      cy.intercept("GET", "**/rest/v1/invoices*", {
        fixture: "recurring_invoices.json",
      }).as("getInvoicesFixture");

      cy.getByCy("sidebar-nav-invoices").click();
      cy.wait("@getInvoicesFixture");
    });

    it("is expected to show next invoice date for active recurring invoices", () => {
      // Open edit modal to see details
      cy.get('[data-cy^="edit-invoice-button-"]').first().click();

      cy.get('[data-cy="invoice-modal"]').should("be.visible");

      // Scroll to recurring section and verify it shows recurring information
      cy.get('[data-cy="recurring-section"]').scrollIntoView().within(() => {
        cy.contains("monthly").should("be.visible");
        cy.contains("2026-02-24").should("be.visible"); // next_date
      });
    });

    it("is expected to show generated count for recurring invoices", () => {
      cy.get('[data-cy^="edit-invoice-button-"]').first().click();

      // Scroll to recurring section and verify it shows the count
      cy.get('[data-cy="recurring-section"]').scrollIntoView().within(() => {
        // This would show something like "0 of 3 generated"
        cy.contains("0").should("be.visible");
      });
    });
  });

  describe("Non-premium User Access", () => {
    it("is expected not to show recurring options for non-premium users", () => {
      // Login as regular (non-premium) user - this starts fresh
      cy.clearLocalStorage();
      cy.login("user");
      
      // Need to set up intercepts for the regular user
      cy.intercept("GET", "**/rest/v1/invoices*", {
        statusCode: 200,
        body: [],
      }).as("getInvoicesUser");
      
      cy.intercept("GET", "**/rest/v1/clients*", {
        statusCode: 200,
        body: [],
      }).as("getClientsUser");
      
      cy.intercept("GET", "**/rest/v1/invoice_templates*", {
        statusCode: 200,
        body: [],
      }).as("getTemplatesUser");
      
      cy.intercept("GET", "**/rest/v1/products*", {
        statusCode: 200,
        body: [],
      }).as("getProductsUser");

      cy.getByCy("sidebar-nav-invoices").click();
      cy.wait("@getInvoicesUser");

      cy.get('[data-cy="create-invoice-button"]').click();
      cy.get('[data-cy="invoice-modal"]').should("be.visible");

      // Recurring section should be visible but disabled for non-premium users
      cy.contains("Make Recurring").scrollIntoView().should("be.visible");
      cy.get('[data-cy="recurring-toggle"]').should("be.disabled");
      
      // Should show PRO badge
      cy.contains("PRO").should("be.visible");
    });

    it("is expected to still show invoices for non-premium user", () => {
      cy.clearLocalStorage();
      cy.login("user");

      cy.intercept("GET", "**/rest/v1/invoices*", {
        fixture: "recurring_invoices.json",
      }).as("getInvoicesUser");
      
      cy.intercept("GET", "**/rest/v1/clients*", {
        statusCode: 200,
        body: [],
      }).as("getClientsUser");

      cy.getByCy("sidebar-nav-invoices").click();
      cy.wait("@getInvoicesUser");

      // Should still show invoices
      cy.get('[data-cy^="invoice-row-"]').should("have.length.at.least", 1);
    });
  });

  describe("Delete Recurring Invoice", () => {
    beforeEach(() => {
      // Override invoices with fixture data containing recurring invoice
      cy.intercept("GET", "**/rest/v1/invoices*", {
        fixture: "recurring_invoices.json",
      }).as("getInvoicesFixture");

      cy.getByCy("sidebar-nav-invoices").click();
      cy.wait("@getInvoicesFixture");
    });

    it("is expected to delete a recurring invoice", () => {
      // Click delete button on recurring invoice
      cy.get('[data-cy^="delete-invoice-button-"]').first().click();

      // Confirm deletion
      cy.getByCy("delete-confirm-modal").should("be.visible");
      cy.get('[data-cy="confirm-delete-button"]').click();

      // Wait for deletion
      cy.wait('@deleteInvoice');
      cy.getByCy("delete-confirm-modal").should("not.exist");
    });
  });
});
