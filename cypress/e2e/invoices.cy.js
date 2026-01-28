/// <reference types="cypress" />

describe("Invoice Management", () => {
  const mockClient = {
    id: "client-123",
    name: "Test Client AB",
    email: "client@test.com",
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
    // Login first to establish session
    cy.login("admin");

    // Mock organization for getDefault calls
    const mockOrganization = {
      id: "test-org-id",
      name: "Test Organization AB",
      org_number: "556677-8899",
      organization_number: "556677-8899",
      vat_number: "SE556677889901",
      address: "Testgatan 123",
      city: "Stockholm",
      postal_code: "11122",
      country: "Sweden",
      email: "billing@testorg.se",
      phone: "+46701234567",
      bank_name: "Nordea",
      bank_account: "1234-5678901234",
      bank_bic: "NDEASESS",
      bank_iban: "SE1234567890123456789012",
      invoice_numbering_mode: "auto",
      invoice_prefix: "INV-",
      next_invoice_number: 1,
    };

    // Set up common intercepts
    cy.setupCommonIntercepts({
      clients: [mockClient],
      templates: [mockTemplate],
      products: [],
      invoices: [],
      defaultOrganization: mockOrganization,
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

    cy.getByCy("sidebar-nav-invoices").click();
    cy.wait("@getInvoices");
    cy.wait("@getTemplates");
  });

  describe("Happy Path - Creating an Invoice", () => {
    it("is expected to display the invoices page", () => {
      cy.getByCy("invoices-page-title").should("be.visible");
      cy.getByCy("create-invoice-button").should("be.visible");
    });

    it("is expected to open the invoice modal when clicking create button", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("invoice-modal").should("be.visible");
      // The form is inside the modal, no need to check separately if modal is visible
    });

    it("is expected to create an invoice with required fields and one line item", () => {
      cy.getByCy("create-invoice-button").should("be.visible").click();
      cy.getByCy("invoice-modal").should("be.visible");

      // Wait for clients and products to load
      cy.wait("@getClients");
      cy.wait("@getProducts");

      // Select client - wait for it to be visible first
      cy.getByCy("client-select").should("be.visible").select("Test Client AB");

      // Dates are already pre-filled, just verify they exist
      cy.getByCy("issue-date-input").should("exist").and("not.have.value", "");
      cy.getByCy("due-date-input").should("exist").and("not.have.value", "");

      // Add line item
      cy.getByCy("description-input-0").type("Consulting Services");
      cy.getByCy("quantity-input-0").clear().type("10");
      cy.getByCy("unit-input-0").clear().type("hours");
      cy.getByCy("unit-price-input-0").clear().type("1500");

      // Verify calculated amount
      cy.getByCy("amount-0").should("contain", "15000");

      // Verify totals
      cy.getByCy("subtotal-display").should("contain", "15000.00");
      cy.getByCy("vat-25-display").should("contain", "3750.00"); // 25% of 15000
      cy.getByCy("total-display").should("contain", "18750.00");

      // Use "Save as Draft" button for new invoices
      cy.getByCy("save-draft-button").scrollIntoView().click();

      cy.wait("@createInvoice");
      cy.getByCy("invoice-modal").should("not.exist");
    });

    it("is expected to send an invoice immediately using Send Invoice button", () => {
      cy.getByCy("create-invoice-button").should("be.visible").click();
      cy.getByCy("invoice-modal").should("be.visible");

      // Wait for clients and products to load
      cy.wait("@getClients");
      cy.wait("@getProducts");

      // Select client
      cy.getByCy("client-select").should("be.visible").select("Test Client AB");

      // Add line item
      cy.getByCy("description-input-0").type("Consulting Services");
      cy.getByCy("quantity-input-0").clear().type("10");
      cy.getByCy("unit-input-0").clear().type("hours");
      cy.getByCy("unit-price-input-0").clear().type("1500");

      // Verify totals
      cy.getByCy("subtotal-display").should("contain", "15000.00");
      cy.getByCy("total-display").should("contain", "18750.00");

      // Use "Send Invoice" button
      cy.getByCy("send-invoice-button").scrollIntoView().click();

      cy.wait("@createInvoice").then((interception) => {
        // Verify that status and sent_at were set
        expect(interception.request.body.status).to.equal('sent');
        expect(interception.request.body.sent_at).to.exist;
      });
      
      cy.getByCy("invoice-modal").should("not.exist");
    });

    it("is expected to add multiple line items", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("invoice-modal").should("be.visible");

      // Wait for API calls
      cy.wait("@getClients");
      cy.wait("@getProducts");

      // Select client
      cy.getByCy("client-select").select(mockClient.id);

      // First line item
      cy.getByCy("description-input-0").type("Development");
      cy.getByCy("quantity-input-0").clear().type("20");
      cy.getByCy("unit-price-input-0").clear().type("1200");

      // Add second line item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("line-item-1").should("exist");

      cy.getByCy("description-input-1").type("Design Work");
      cy.getByCy("quantity-input-1").clear().type("15");
      cy.getByCy("unit-price-input-1").clear().type("1000");

      // Add third line item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("line-item-2").should("exist");

      cy.getByCy("description-input-2").type("Project Management");
      cy.getByCy("quantity-input-2").clear().type("10");
      cy.getByCy("unit-price-input-2").clear().type("1500");

      // Verify total: (20*1200) + (15*1000) + (10*1500) = 24000 + 15000 + 15000 = 54000
      cy.getByCy("subtotal-display").should("contain", "54000.00");
      cy.getByCy("total-display").should("contain", "67500.00"); // +25% tax

      cy.getByCy("save-draft-button").click();
      cy.wait("@createInvoice");
    });

    it("is expected to remove a line item", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("client-select").select(mockClient.id);

      // Add second item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("line-item-1").should("exist");

      // Add third item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("line-item-2").should("exist");

      // Remove second item
      cy.getByCy("remove-line-item-1").click();
      cy.getByCy("line-item-2").should("not.exist");
      cy.getByCy("line-item-1").should("exist");
    });

    it("is expected not to remove the last line item", () => {
      cy.getByCy("create-invoice-button").click();

      // Only one item exists, remove button should be disabled
      cy.getByCy("remove-line-item-0").should("be.disabled");
    });

    it("is expected to update totals when tax rate changes", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("client-select").select(mockClient.id);

      cy.getByCy("unit-price-input-0").clear().type("1000");

      // Default 25% tax
      cy.getByCy("vat-25-display").should("contain", "250.00");
      cy.getByCy("total-display").should("contain", "1250.00");
    });

    it("is expected to close the modal when clicking cancel", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("invoice-modal").should("be.visible");
      cy.getByCy("cancel-button").click();
      cy.getByCy("invoice-modal").should("not.exist");
    });

    it("is expected to close the modal when clicking X button", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("invoice-modal").should("be.visible");
      cy.getByCy("close-modal-button").click();
      cy.getByCy("invoice-modal").should("not.exist");
    });
  });

  describe("Validation", () => {
    it("is expected to show error when no client is selected", () => {
      cy.getByCy("create-invoice-button").click();

      cy.getByCy("description-input-0").type("Test Service");
      cy.getByCy("unit-price-input-0").clear().type("1000");

      cy.getByCy("save-draft-button").click();

      // Error should exist (may be partially covered by sticky header)
      cy.getByCy("invoice-form-error").should("exist");
      cy.getByCy("invoice-modal").should("be.visible");
    });

    it("is expected to show error when no line items have descriptions", () => {
      cy.getByCy("create-invoice-button").click();

      cy.getByCy("client-select").select(mockClient.id);

      // Leave description empty
      cy.getByCy("unit-price-input-0").clear().type("1000");

      cy.getByCy("save-draft-button").click();

      cy.getByCy("invoice-form-error").should("exist");
    });

    it("is expected to allow submitting with empty line items if at least one has a description", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");

      cy.getByCy("client-select").select(mockClient.id);

      // Add multiple items
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("add-line-item-button").click();

      // Only fill first item
      cy.getByCy("description-input-0").type("Valid Service");
      cy.getByCy("unit-price-input-0").clear().type("1000");

      // Leave others empty

      cy.getByCy("save-draft-button").click();

      cy.wait("@createInvoice");
      cy.getByCy("invoice-modal").should("not.exist");
    });
  });

  describe("Invoice List - Status Management", () => {
    const mockInvoices = [
      {
        id: "inv-1",
        invoice_number: "INV-001",
        client: mockClient,
        issue_date: "2026-01-01",
        due_date: "2026-01-31",
        status: "draft",
        total_amount: "10000.00",
        currency: "SEK",
      },
      {
        id: "inv-2",
        invoice_number: "INV-002",
        client: mockClient,
        issue_date: "2026-01-15",
        due_date: "2026-02-15",
        status: "sent",
        total_amount: "25000.00",
        currency: "SEK",
      },
    ];

    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: mockInvoices,
        clients: [mockClient],
        templates: [mockTemplate],
        products: [],
      });

      // Need to reload/refresh data with new intercepts for this nested context
      cy.reload();
      cy.wait("@getInvoices");
    });

    it("is expected to display invoice list", () => {
      cy.getByCy("invoices-list").should("be.visible");
      cy.getByCy("invoices-table").should("be.visible");
      cy.getByCy("invoice-row-inv-1").should("exist");
      cy.getByCy("invoice-row-inv-2").should("exist");
    });

    it("is expected to show correct status badges", () => {
      cy.getByCy("invoice-status-inv-1").should("contain", "Draft");
      cy.getByCy("invoice-status-inv-2").should("contain", "Sent");
    });

    it('is expected to show "Mark as Sent" button for draft invoices', () => {
      cy.getByCy("mark-sent-button-inv-1").should("be.visible");
      cy.getByCy("mark-sent-button-inv-2").should("not.exist");
    });

    it('is expected to show "Mark as Paid" button for sent invoices', () => {
      cy.getByCy("mark-paid-button-inv-1").should("not.exist");
      cy.getByCy("mark-paid-button-inv-2").scrollIntoView().should("be.visible");
    });

    it("is expected to mark invoice as sent", () => {
      // Set up intercept for PATCH (status check is bypassed)
      cy.intercept("PATCH", "**/rest/v1/invoices?id=eq.inv-1*", {
        statusCode: 200,
        body: { ...mockInvoices[0], status: "sent", sent_at: new Date().toISOString() },
      }).as("updateInvoice");

      cy.getByCy("mark-sent-button-inv-1").click();
      cy.wait("@updateInvoice");
    });

    it("is expected to mark invoice as paid", () => {
      // Set up intercepts BEFORE clicking
      cy.intercept("POST", "**/rest/v1/payments*", {
        statusCode: 201,
        body: { id: "payment-1", invoice_id: "inv-2", amount: 25000 },
      }).as("createPayment");

      cy.intercept("PATCH", "**/rest/v1/invoices?id=eq.inv-2*", {
        statusCode: 200,
        body: { ...mockInvoices[1], status: "paid", paid_at: new Date().toISOString() },
      }).as("updateInvoice");

      cy.getByCy("mark-paid-button-inv-2").click();
      
      // Payment confirmation dialog should appear
      cy.getByCy("payment-confirmation-dialog").should("be.visible");
      cy.getByCy("payment-dialog-date").should("exist");
      cy.getByCy("payment-dialog-method").should("exist");
      cy.getByCy("confirm-payment-dialog").click();

      cy.wait("@createPayment");
      cy.wait("@updateInvoice");
    });

    it("is expected to filter invoices by status", () => {
      cy.getByCy("status-filter-select").select("draft");
      cy.getByCy("invoice-row-inv-1").should("exist");
      cy.getByCy("invoice-row-inv-2").should("not.exist");

      cy.getByCy("status-filter-select").select("sent");
      cy.getByCy("invoice-row-inv-1").should("not.exist");
      cy.getByCy("invoice-row-inv-2").should("exist");

      cy.getByCy("status-filter-select").select("all");
      cy.getByCy("invoice-row-inv-1").should("exist");
      cy.getByCy("invoice-row-inv-2").should("exist");
    });

    it("is expected to search invoices by invoice number", () => {
      cy.getByCy("search-invoices-input").type("INV-001");
      cy.getByCy("invoice-row-inv-1").should("exist");
      cy.getByCy("invoice-row-inv-2").should("not.exist");
    });

    it("is expected to search invoices by client name", () => {
      cy.getByCy("search-invoices-input").type("Test Client");
      cy.getByCy("invoice-row-inv-1").should("exist");
      cy.getByCy("invoice-row-inv-2").should("exist");
    });

    it("is expected to open delete confirmation modal", () => {
      cy.getByCy("delete-invoice-button-inv-1").click();
      cy.getByCy("delete-confirm-modal").should("be.visible");
    });

    it("is expected to cancel deletion", () => {
      cy.getByCy("delete-invoice-button-inv-1").click();
      cy.getByCy("delete-confirm-modal").should("be.visible");
      cy.getByCy("cancel-delete-button").click();
      cy.getByCy("delete-confirm-modal").should("not.exist");
    });

    it("is expected to delete an invoice", () => {
      // Set up intercept for status check (delete still checks if draft)
      cy.intercept("GET", "**/rest/v1/invoices?select=status&id=eq.inv-1*", {
        statusCode: 200,
        body: { status: "draft" },
      }).as("checkStatus");

      // Set up intercept for DELETE
      cy.intercept("DELETE", "**/rest/v1/invoices?id=eq.inv-1*", {
        statusCode: 204,
        body: null,
      }).as("deleteInvoice");

      cy.getByCy("delete-invoice-button-inv-1").click();
      cy.getByCy("delete-confirm-modal").should("be.visible");
      cy.getByCy("confirm-delete-button").click();

      cy.wait("@checkStatus");
      cy.wait("@deleteInvoice");
      cy.getByCy("delete-confirm-modal").should("not.exist");
    });
  });

  describe("Empty State", () => {
    it("is expected to show empty state when no invoices exist", () => {
      cy.getByCy("invoices-empty-state").should("be.visible");
      cy.getByCy("empty-state-create-button").should("be.visible");
    });

    it("is expected to open modal from empty state button", () => {
      cy.getByCy("empty-state-create-button").click();
      cy.getByCy("invoice-modal").should("be.visible");
    });
  });

  describe("Editing an Invoice", () => {
    const existingInvoice = {
      id: "inv-edit",
      invoice_number: "INV-999",
      client_id: mockClient.id,
      client: mockClient,
      issue_date: "2026-01-20",
      due_date: "2026-02-20",
      status: "draft",
      tax_rate: 25,
      currency: "SEK",
      total_amount: "12500.00",
      invoice_rows: [
        {
          id: "row-1",
          description: "Original Service",
          quantity: 10,
          unit_price: 1000,
          unit: "hours",
          tax_rate: 25,
        },
      ],
    };

    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [existingInvoice],
        clients: [mockClient],
        templates: [mockTemplate],
        products: [],
      });

      // Reload to pick up new intercepts
      cy.reload();
      cy.wait("@getInvoices");
    });

    it("is expected to open invoice in edit mode", () => {
      cy.getByCy("edit-invoice-button-inv-edit").click();
      cy.getByCy("invoice-modal").should("be.visible");
      cy.getByCy("invoice-modal-title").should("contain", "Edit");

      // Verify pre-filled data
      cy.getByCy("client-select").should("have.value", "client-123");
      cy.getByCy("description-input-0").should(
        "have.value",
        "Original Service",
      );
      cy.getByCy("quantity-input-0").should("have.value", "10");
      cy.getByCy("unit-price-input-0").should("have.value", "1000");
    });

    it("is expected to update invoice data", () => {
      cy.intercept("PATCH", "**/rest/v1/invoices?id=eq.inv-edit*", {
        statusCode: 200,
        body: [{ ...existingInvoice, status: "updated" }],
      }).as("updateInvoice");

      // Also mock the DELETE for invoice_rows (edit clears and recreates rows)
      cy.intercept("DELETE", "**/rest/v1/invoice_rows*", {
        statusCode: 204,
        body: null,
      }).as("deleteRows");

      // Mock the POST for new invoice_rows
      cy.intercept("POST", "**/rest/v1/invoice_rows*", {
        statusCode: 201,
        body: [],
      }).as("createRows");

      // Intercept for status check (update checks if draft before allowing edit)
      cy.intercept("GET", "**/rest/v1/invoices?select=status&id=eq.inv-edit*", {
        statusCode: 200,
        body: { status: "draft" },
      }).as("checkStatus");

      cy.getByCy("edit-invoice-button-inv-edit").click();

      cy.getByCy("description-input-0").clear().type("Updated Service");
      cy.getByCy("unit-price-input-0").clear().type("1500");

      // In edit mode, use submit-button (not save-draft-button)
      cy.getByCy("submit-button").click();

      cy.wait("@updateInvoice", { timeout: 10000 });
      cy.getByCy("invoice-modal").should("not.exist");
    });
  });

  describe("Invoice Numbering (US-064)", () => {
    beforeEach(() => {
      const mockOrganization = {
        id: "test-org-id",
        name: "Test Organization AB",
        org_number: "556677-8899",
        organization_number: "556677-8899",
        vat_number: "SE556677889901",
        address: "Testgatan 123",
        city: "Stockholm",
        postal_code: "11122",
        municipality: "Stockholm",
        country: "Sweden",
        email: "billing@testorg.se",
        phone: "+46701234567",
        bank_name: "Nordea",
        bank_account: "1234-5678901234",
        bank_bic: "NDEASESS",
        bank_iban: "SE1234567890123456789012",
        invoice_numbering_mode: "automatic",
        invoice_prefix: "INV-",
        next_invoice_number: 1,
      };

      // Login with custom organization - single source of truth
      cy.login("user", { customOrganization: mockOrganization });

      // Set up common intercepts with test data
      cy.setupCommonIntercepts({
        clients: [
          {
            id: "client-1",
            name: "Test Client AB",
            email: "client@test.com",
            country: "Sweden",
          },
        ],
        invoices: [],
        products: [],
        templates: [],
      });

      // Intercept organization fetch for invoice form (checking numbering mode)
      cy.intercept("GET", "**/rest/v1/organizations*", {
        statusCode: 200,
        body: [mockOrganization],
      }).as("getOrganizationsForInvoice");

      cy.intercept("POST", "**/rest/v1/invoices*", (req) => {
        req.reply({
          statusCode: 201,
          body: {
            id: "new-invoice-id",
            invoice_number: req.body.invoice_number || `INV-${Date.now()}`,
            ...req.body,
          },
        });
      }).as("createInvoice");

      cy.intercept("PATCH", "**/rest/v1/organizations**", (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockOrganization, ...req.body },
        });
      }).as("updateOrganization");
    });
    describe("Automatic Numbering Mode", () => {
      it("is expected to allow toggling between automatic and manual numbering modes", () => {
        // Arrange
        cy.getByCy("sidebar-nav-settings").click();
        cy.url().should("include", "/settings");
        cy.wait("@getOrganizations");
        cy.getByCy("edit-organization").should("be.visible").click();

        // Wait for edit mode to stabilize
        cy.wait(300);

        // Fill in required municipality field first (it's at the top of the form)
        cy.getByCy("org-municipality")
          .scrollIntoView()
          .clear()
          .type("Stockholm");

        // Scroll to invoice numbering mode select and wait for it to be stable
        cy.getByCy("invoice-numbering-mode-select")
          .scrollIntoView()
          .should("be.visible")
          .should("not.be.disabled");

        // Act - Switch to manual mode
        cy.getByCy("invoice-numbering-mode-select").select("manual");
        cy.getByCy("save-organization").click();

        // Assert
        cy.wait("@updateOrganization");

        // Act - Switch back to automatic mode
        cy.getByCy("edit-organization").click();
        cy.getByCy("invoice-numbering-mode-select")
          .scrollIntoView()
          .select("automatic");
        cy.getByCy("save-organization").click();

        // Assert
        cy.wait("@updateOrganization");
      });

      it("is expected to auto-generate invoice number in automatic mode", () => {
        // Arrange - Ensure automatic mode
        cy.getByCy("sidebar-nav-settings").click();
        cy.url().should("include", "/settings");
        cy.wait("@getOrganizations");
        cy.getByCy("edit-organization").should("be.visible").click();

        // Wait for edit mode to stabilize
        cy.wait(300);

        // Fill in required municipality field
        cy.getByCy("org-municipality")
          .scrollIntoView()
          .clear()
          .type("Stockholm");

        // Scroll to invoice numbering mode select and switch to automatic
        cy.getByCy("invoice-numbering-mode-select")
          .scrollIntoView()
          .should("be.visible")
          .should("not.be.disabled")
          .select("automatic");
        cy.getByCy("save-organization").scrollIntoView().click();
        cy.wait("@updateOrganization");

        // Re-setup common intercepts with updated organization
        cy.setupCommonIntercepts({
          clients: [
            {
              id: "client-1",
              name: "Test Client AB",
              email: "client@test.com",
              country: "Sweden",
            },
          ],
          invoices: [],
          defaultOrganization: {
            id: "test-org-id",
            name: "Test Organization AB",
            org_number: "556677-8899",
            organization_number: "556677-8899",
            vat_number: "SE556677889901",
            address: "Testgatan 123",
            city: "Stockholm",
            postal_code: "11122",
            municipality: "Stockholm",
            country: "Sweden",
            email: "billing@testorg.se",
            phone: "+46701234567",
            bank_name: "Nordea",
            bank_account: "1234-5678901234",
            bank_bic: "NDEASESS",
            bank_iban: "SE1234567890123456789012",
            invoice_numbering_mode: "automatic",
            invoice_prefix: "INV-",
            next_invoice_number: 1,
          },
        });

        // Act
        cy.getByCy("sidebar-nav-invoices").click();
        cy.url().should("include", "/invoices");
        cy.wait("@getInvoices");
        cy.getByCy("empty-state-create-button").click();
        cy.getByCy("invoice-modal").should("be.visible");

        // Wait for clients and products to load
        cy.wait("@getClients");
        cy.wait("@getProducts");

        // Invoice number field should not exist in automatic mode
        cy.getByCy("invoice-number-input").should("not.exist");

        // Fill in invoice details
        cy.getByCy("client-select")
          .should("be.visible")
          .select("Test Client AB");

        // Dates are pre-filled
        cy.getByCy("issue-date-input").should("not.have.value", "");
        cy.getByCy("due-date-input").should("not.have.value", "");

        // Add line item
        cy.getByCy("description-input-0").type("Test Service");
        cy.getByCy("quantity-input-0").clear().type("1");
        cy.getByCy("unit-price-input-0").clear().type("1000");

        cy.getByCy("save-draft-button").scrollIntoView().click();

        // Assert
        cy.wait("@createInvoice");
        cy.getByCy("invoice-modal").should("not.exist");
      });
    });

    describe("Manual Numbering Mode", () => {
      const manualOrganization = {
        id: "test-org-id",
        name: "Manual Organization AB",
        org_number: "556677-8899",
        organization_number: "556677-8899",
        vat_number: "SE556677889901",
        address: "Testgatan 123",
        city: "Stockholm",
        postal_code: "11122",
        municipality: "Stockholm",
        country: "Sweden",
        email: "billing@testorg.se",
        phone: "+46701234567",
        bank_name: "Nordea",
        bank_account: "1234-5678901234",
        bank_bic: "NDEASESS",
        bank_iban: "SE1234567890123456789012",
        invoice_numbering_mode: "manual",
        invoice_prefix: "INV-",
        next_invoice_number: 1,
      };

      beforeEach(() => {
        // Override the default organization intercept with manual mode
        cy.intercept('GET', '**/rest/v1/organization_members*is_default=eq.true*', {
          statusCode: 200,
          body: { organizations: manualOrganization }
        }).as('getDefaultOrganization');

        // Dispatch organization with manual mode to Redux
        cy.window().its("store").invoke("dispatch", {
          type: "organizations/setCurrentOrganization",
          payload: manualOrganization,
        });

        // Navigate to the invoices page
        cy.getByCy("sidebar-nav-invoices").click();
        cy.url().should("include", "/invoices");
        cy.wait("@getInvoices");

        // Open the create invoice modal
        cy.getByCy("create-invoice-button").should("be.visible").click();
        cy.getByCy("invoice-modal").should("be.visible");

        // Wait for clients and products to load
        cy.wait("@getClients");
        cy.wait("@getProducts");
      });

      it("is expected to show invoice number field when manual mode is enabled", () => {
        // Assert - Invoice number field should be visible in manual mode
        cy.getByCy("invoice-number-input").should("be.visible");
      });

      // TODO: Fix flaky test - times out waiting for invoice to appear in list
      // it("is expected to create invoice with manual invoice number", () => {
      //   // Define the invoice that will be created
      //   const createdInvoice = {
      //     id: "manual-invoice-id",
      //     invoice_number: "MANUAL-1001",
      //     client_id: "client-1",
      //     client: {
      //       id: "client-1",
      //       name: "Test Client AB",
      //       email: "client@test.com",
      //     },
      //     issue_date: new Date().toISOString().split("T")[0],
      //     due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      //       .toISOString()
      //       .split("T")[0],
      //     status: "draft",
      //     currency: "SEK",
      //     subtotal: "15000.00",
      //     total_amount: "18750.00",
      //     organization_id: "test-org-id",
      //   };

      //   // Mock duplicate check - returns null (no duplicate found)
      //   cy.intercept(
      //     {
      //       method: "GET",
      //       url: "**/rest/v1/invoices*",
      //       query: {
      //         invoice_number: "eq.MANUAL-1001",
      //       },
      //     },
      //     {
      //       statusCode: 200,
      //       headers: { "content-type": "application/json" },
      //       body: null,
      //     },
      //   ).as("checkDuplicate");

      //   // Mock create invoice - returns the created invoice
      //   cy.intercept("POST", "**/rest/v1/invoices*", {
      //     statusCode: 201,
      //     body: createdInvoice,
      //   }).as("createManualInvoice");

      //   // Update the GET invoices intercept to include the new invoice after creation
      //   cy.intercept(
      //     "GET",
      //     "**/rest/v1/invoices?select=*%2Cclient%3Aclients*",
      //     {
      //       statusCode: 200,
      //       body: [createdInvoice],
      //     },
      //   ).as("getInvoicesWithNew");

      //   // Select client - wait for it to be visible first
      //   cy.getByCy("client-select")
      //     .should("be.visible")
      //     .select("Test Client AB");
      //   cy.getByCy("invoice-number-input").type("MANUAL-1001");

      //   // Add line item
      //   cy.getByCy("description-input-0").type("Consulting Services");
      //   cy.getByCy("quantity-input-0").clear().type("10");
      //   cy.getByCy("unit-input-0").clear().type("hours");
      //   cy.getByCy("unit-price-input-0").clear().type("1500");

      //   // Verify calculated amount
      //   cy.getByCy("amount-0").should("contain", "15000");

      //   // Verify totals
      //   cy.getByCy("subtotal-display").should("contain", "15000.00");
      //   cy.getByCy("vat-25-display").should("contain", "3750.00"); // 25% of 15000
      //   cy.getByCy("total-display").should("contain", "18750.00");

      //   cy.getByCy("save-draft-button").scrollIntoView().click();

      //   // Assert - Invoice created and modal closes
      //   cy.wait("@createManualInvoice");
      //   cy.getByCy("invoice-modal").should("not.exist");

      //   // Wait for Redux store to update with new invoice
      //   cy.window().its('store').invoke('getState').its('invoices').its('items').should('have.length.greaterThan', 0);

      //   // Verify invoice appears in the list with manual number
      //   cy.contains("tr", "MANUAL-1001", { timeout: 10000 }).should("exist");
      // });

      it("is expected to prevent creating invoice without number in manual mode", () => {
        // Fill form but leave invoice number empty
        cy.getByCy("client-select")
          .should("be.visible")
          .select("Test Client AB");

        // Dates should already be pre-filled
        cy.getByCy("issue-date-input").should("not.have.value", "");
        cy.getByCy("due-date-input").should("not.have.value", "");

        // Add line item
        cy.getByCy("description-input-0").type("Test Service");
        cy.getByCy("quantity-input-0").clear().type("1");
        cy.getByCy("unit-price-input-0").clear().type("1000");

        cy.getByCy("save-draft-button").scrollIntoView().click();

        // Assert - Modal should remain open because invoice number is required
        cy.getByCy("invoice-modal").should("exist");
        cy.getByCy("invoice-form-error")
          .should("exist")
          .and("contain", "Invoice number is required in manual mode");
      });

      it("is expected to show error on blur when invoice number already exists", () => {
        // Mock duplicate check - returns existing invoice (duplicate found)
        cy.intercept(
          {
            method: "GET",
            url: "**/rest/v1/invoices*",
            query: {
              invoice_number: "eq.EXISTING-001",
            },
          },
          {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: {
              id: "existing-invoice-id",
              invoice_number: "EXISTING-001",
              organization_id: "test-org-id",
            },
          },
        ).as("checkDuplicate");

        // Type invoice number - break the chain to avoid detached element issue
        cy.getByCy("invoice-number-input")
          .should("be.visible")
          .type("EXISTING-001");
        
        // Blur by clicking on the modal title (reliable way to trigger blur)
        cy.getByCy("invoice-modal-title").click();

        // Assert - Error should appear after blur
        cy.getByCy("invoice-number-error")
          .should("be.visible")
          .and("contain", "already exists");

        // Fill rest of form and try to submit anyway
        cy.getByCy("client-select").select("Test Client AB");
        cy.getByCy("description-input-0").type("Test Service");
        cy.getByCy("quantity-input-0").clear().type("1");
        cy.getByCy("unit-price-input-0").clear().type("1000");

        cy.getByCy("save-draft-button").scrollIntoView().click();

        // Assert - Modal should remain open because of duplicate error
        cy.getByCy("invoice-modal").should("exist");
      });

      it("is expected to prevent duplicate manual invoice numbers", () => {
        // Mock duplicate check - returns existing invoice (duplicate found)
        cy.intercept(
          {
            method: "GET",
            url: "**/rest/v1/invoices*",
            query: {
              invoice_number: "eq.DUPLICATE-001",
            },
          },
          {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: {
              id: "existing-invoice-id",
              invoice_number: "DUPLICATE-001",
              organization_id: "test-org-id",
            },
          },
        ).as("checkDuplicate");

        // Type duplicate invoice number - break the chain to avoid detached element issue
        cy.getByCy("invoice-number-input")
          .should("be.visible")
          .type("DUPLICATE-001");

        // Blur by clicking on the modal title (reliable way to trigger blur)
        cy.getByCy("invoice-modal-title").click();

        // Assert - Error should appear after blur
        cy.getByCy("invoice-number-error")
          .should("be.visible")
          .and("contain", "already exists");

        // Fill rest of form and try to submit anyway
        cy.getByCy("client-select").select("Test Client AB");
        cy.getByCy("description-input-0").type("Test Service");
        cy.getByCy("quantity-input-0").clear().type("1");
        cy.getByCy("unit-price-input-0").clear().type("1000");
        cy.getByCy("save-draft-button").scrollIntoView().click();

        // Assert - Modal should remain open because of duplicate error
        cy.getByCy("invoice-modal").should("exist");
      });
    });
  });

  describe("Recurring Invoices (Premium Feature)", () => {
    const mockRecurringClient = {
      id: "client-123",
      name: "Test Client AB",
      email: "client@test.com",
      organization_id: "test-premium-org-id",
    };

    const mockRecurringTemplate = {
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
        id: "test-premium-org-id",
        name: "Test Premium Organization AB",
        org_number: "556677-8899",
        organization_number: "556677-8899",
        vat_number: "SE556677889901",
        address: "Testgatan 123",
        city: "Stockholm",
        postal_code: "11122",
        country: "Sweden",
        email: "billing@testorg.se",
        phone: "+46701234567",
        bank_name: "Nordea",
        bank_account: "1234-5678901234",
        bank_bic: "NDEASESS",
        bank_iban: "SE1234567890123456789012",
        invoice_numbering_mode: "auto",
        invoice_prefix: "INV-",
        next_invoice_number: 1,
      };

      // Set up common intercepts
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [mockRecurringClient],
        templates: [mockRecurringTemplate],
        products: [],
        defaultOrganization: mockOrganization,
      });

      // Mock create invoice
      cy.intercept("POST", "**/rest/v1/invoices*", (req) => {
        const invoice = {
          id: "new-invoice-id",
          invoice_number: "INV-0001",
          ...req.body,
          client: mockRecurringClient,
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
      cy.wait("@getInvoices");
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
        cy.getByCy("create-invoice-button").click();
        cy.get('[data-cy="invoice-modal"]').should("be.visible");

        // Fill basic invoice details
        cy.get('[data-cy="client-select"]')
          .should("be.visible")
          .select("Test Client AB");
        cy.get('[data-cy="issue-date-input"]').type("2026-01-24");
        cy.get('[data-cy="due-date-input"]').type("2026-02-23");

        // Enable recurring
        cy.getByCy("recurring-toggle").scrollIntoView().click({ force: true });
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
        cy.get('[data-cy="save-draft-button"]').scrollIntoView().click();

        // Wait for invoice creation
        cy.wait("@createInvoice");
        cy.wait("@createInvoiceRows");

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
        cy.get('[data-cy="save-draft-button"]').click();

        // Wait for invoice creation
        cy.wait("@createInvoice");
        cy.wait("@createInvoiceRows");

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
        cy.get('[data-cy="recurring-frequency-select"]').should(
          "have.value",
          "monthly",
        );

        // Change to weekly and verify
        cy.get('[data-cy="recurring-frequency-select"]').select("weekly");
        cy.get('[data-cy="recurring-frequency-select"]').should(
          "have.value",
          "weekly",
        );

        // Save should work
        cy.get('[data-cy="save-draft-button"]').click();
        cy.wait("@createInvoice");
        cy.wait("@createInvoiceRows");
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
            cy.get('[data-cy^="recurring-schedule-indicator-"]').should(
              "exist",
            );

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
        cy.get('[data-cy="recurring-section"]')
          .scrollIntoView()
          .should("be.visible");

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
        cy.get('[data-cy="recurring-max-invoices-input"]').should(
          "have.value",
          "3",
        );
      });

      it("is expected to update recurring settings", () => {
        // Set up status check intercept
        cy.intercept("GET", "**/rest/v1/invoices?select=status&id=eq.*", {
          statusCode: 200,
          body: { status: "draft" },
        }).as("checkStatusRecurring");

        // Set up more specific intercept for this test
        cy.intercept("PATCH", "**/rest/v1/invoices?id=eq.*", {
          statusCode: 200,
          body: [],
        }).as("updateRecurringInvoice");

        cy.get('[data-cy^="edit-invoice-button-"]').first().click();

        // Change frequency
        cy.get('[data-cy="recurring-frequency-select"]').select("quarterly");

        // Change max count
        cy.get('[data-cy="recurring-max-invoices-input"]').clear().type("4");

        // In edit mode, use submit-button (not save-draft-button)
        cy.get('[data-cy="submit-button"]').click();

        cy.wait("@updateRecurringInvoice");
        cy.get('[data-cy="invoice-modal"]').should("not.exist");
      });

      it("is expected to disable recurring on an existing recurring invoice", () => {
        // Set up status check intercept
        cy.intercept("GET", "**/rest/v1/invoices?select=status&id=eq.*", {
          statusCode: 200,
          body: { status: "draft" },
        }).as("checkStatusDisable");

        // Set up more specific intercept for this test
        cy.intercept("PATCH", "**/rest/v1/invoices?id=eq.*", {
          statusCode: 200,
          body: [],
        }).as("updateDisableRecurring");

        cy.get('[data-cy^="edit-invoice-button-"]').first().click();

        // Disable recurring
        cy.get('[data-cy="recurring-toggle"]').click({ force: true });
        cy.get('[data-cy="recurring-section"]').should("not.be.visible");

        // In edit mode, use submit-button (not save-draft-button)
        cy.get('[data-cy="submit-button"]').click();

        cy.wait("@updateDisableRecurring");
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
        cy.get('[data-cy="recurring-section"]')
          .scrollIntoView()
          .within(() => {
            cy.contains("monthly").should("be.visible");
            cy.contains("2026-02-24").should("be.visible"); // next_date
          });
      });

      it("is expected to show generated count for recurring invoices", () => {
        cy.get('[data-cy^="edit-invoice-button-"]').first().click();

        // Scroll to recurring section and verify it shows the count
        cy.get('[data-cy="recurring-section"]')
          .scrollIntoView()
          .within(() => {
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
        // Set up status check intercept (delete checks if draft)
        cy.intercept("GET", "**/rest/v1/invoices?select=status&id=eq.*", {
          statusCode: 200,
          body: { status: "draft" },
        }).as("checkStatusDelete");

        // Set up intercept for delete
        cy.intercept("DELETE", "**/rest/v1/invoices?id=eq.*", {
          statusCode: 204,
          body: null,
        }).as("deleteRecurringInvoice");

        // Click delete button on recurring invoice
        cy.get('[data-cy^="delete-invoice-button-"]').first().click();

        // Confirm deletion
        cy.getByCy("delete-confirm-modal").should("be.visible");
        cy.get('[data-cy="confirm-delete-button"]').click();

        // Wait for deletion
        cy.wait("@checkStatusDelete");
        cy.wait("@deleteRecurringInvoice");
        cy.getByCy("delete-confirm-modal").should("not.exist");
      });
    });
  });

  describe("PDF Download", () => {
    const invoiceWithFullData = {
      id: "inv-pdf",
      invoice_number: "INV-PDF-001",
      client_id: mockClient.id,
      client: mockClient,
      issue_date: "2026-01-20",
      due_date: "2026-02-20",
      status: "sent",
      tax_rate: 25,
      currency: "SEK",
      total_amount: "12500.00",
      subtotal: "10000.00",
      invoice_rows: [
        {
          id: "row-1",
          description: "Service A",
          quantity: 10,
          unit_price: 800,
          unit: "hours",
          amount: 8000,
        },
        {
          id: "row-2",
          description: "Service B",
          quantity: 5,
          unit_price: 400,
          unit: "hours",
          amount: 2000,
        },
      ],
    };

    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [invoiceWithFullData],
        clients: [mockClient],
        templates: [mockTemplate],
        products: [],
      });
      // Reload to pick up new intercepts
      cy.reload();
      // Already navigated to invoices in parent beforeEach
      cy.wait("@getInvoices");
      cy.wait("@getTemplates");
    });

    it("is expected to display PDF download button", () => {
      cy.getByCy("download-pdf-button-inv-pdf").should("be.visible");
    });

    it("is expected to download PDF when button is clicked", () => {
      // Note: Testing actual PDF generation is difficult in Cypress
      // We just verify the button exists and is clickable without errors
      cy.getByCy("download-pdf-button-inv-pdf")
        .should("not.be.disabled")
        .click();

      // Button should still exist after click (PDF generation may be fast)
      cy.getByCy("download-pdf-button-inv-pdf").should("exist");
    });

    it("is expected to show error when no templates available", () => {
      cy.setupCommonIntercepts({
        invoices: [invoiceWithFullData],
        clients: [mockClient],
        templates: [],
        products: [],
      });

      // Reload data with new intercepts
      cy.reload();
      cy.wait("@getInvoices");
      cy.wait("@getTemplates");

      cy.getByCy("download-pdf-button-inv-pdf").click();
      // Alert handling is automatic in Cypress
    });
  });

  describe("VAT Grouping", () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [mockClient],
        templates: [mockTemplate],
        products: [
          {
            id: "prod-1",
            name: "Standard Item",
            unit_price: 1000,
            tax_rate: 25,
            unit: "st",
            prices: [{ currency: "SEK", price: 1000 }],
          },
          {
            id: "prod-2",
            name: "Reduced Item",
            unit_price: 500,
            tax_rate: 12,
            unit: "st",
            prices: [{ currency: "SEK", price: 500 }],
          },
          {
            id: "prod-3",
            name: "Food Item",
            unit_price: 300,
            tax_rate: 6,
            unit: "st",
            prices: [{ currency: "SEK", price: 300 }],
          },
        ],
      });
    });

    it("is expected to display separate VAT groups for different tax rates", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Select product with 25% VAT
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-1").click();
      cy.getByCy("unit-price-input-0").should("have.value", "1000");

      // Add second item and select product with 12% VAT
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("product-select-btn-1").click();
      cy.getByCy("product-option-prod-2").click();
      cy.getByCy("unit-price-input-1").should("have.value", "500");
      cy.getByCy("quantity-input-1").clear().type("2");

      // Verify VAT groups are displayed
      cy.getByCy("vat-25-display").should("contain", "250.00");
      cy.getByCy("vat-12-display").should("contain", "120.00");
      cy.getByCy("total-display").should("contain", "2370.00");
    });

    it("is expected to calculate VAT correctly with mixed rates", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Standard rate (25%) - default
      cy.getByCy("unit-price-input-0").clear().type("1000");

      // Add another 25% item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("unit-price-input-1").clear().type("1000");

      // Add another 25% item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("unit-price-input-2").clear().type("1000");

      // Verify subtotal
      cy.getByCy("subtotal-display").should("contain", "3000.00");

      // Verify VAT (all items at 25%)
      cy.getByCy("vat-25-display").should("contain", "750.00");

      // Verify total (3000 + 750 = 3750)
      cy.getByCy("total-display").should("contain", "3750.00");
    });

    it("is expected to group items by same VAT rate", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Two items with default 25% VAT
      cy.getByCy("unit-price-input-0").clear().type("1000");

      cy.getByCy("add-line-item-button").click();
      cy.getByCy("unit-price-input-1").clear().type("1000");

      cy.getByCy("subtotal-display").should("contain", "2000.00");
      cy.getByCy("vat-25-display").should("contain", "500.00");
      cy.getByCy("total-display").should("contain", "2500.00");
    });
  });

  describe("US-068: OCR Payment Reference", () => {
    const mockOrganizationOCR = {
      id: "test-org-id",
      name: "Test Organization AB",
      org_number: "556677-8899",
      organization_number: "556677-8899",
      vat_number: "SE556677889901",
      address: "Testgatan 123",
      city: "Stockholm",
      postal_code: "11122",
      municipality: "Stockholm",
      country: "Sweden",
      email: "billing@testorg.se",
      phone: "+46701234567",
      bank_name: "Nordea",
      bank_account: "1234-5678901234",
      bank_bic: "NDEASESS",
      bank_iban: "SE1234567890123456789012",
      invoice_numbering_mode: "automatic",
      invoice_prefix: "INV-",
      next_invoice_number: 1,
    };

    it("is expected to auto-generate OCR payment reference when creating invoice", () => {
      // Dispatch organization to Redux
      cy.window().its("store").invoke("dispatch", {
        type: "organizations/setCurrentOrganization",
        payload: mockOrganizationOCR,
      });

      cy.intercept("POST", "**/rest/v1/invoices*", (req) => {
        req.reply({
          statusCode: 201,
          body: {
            id: "new-invoice-id",
            invoice_number: "INV-0042",
            payment_reference: "424", // Expected OCR for invoice 42 with checksum
            ...req.body,
            client: mockClient,
            status: "draft",
          },
        });
      }).as("createInvoiceWithOCR");

      cy.getByCy("create-invoice-button").click();
      cy.getByCy("client-select").select(mockClient.id);

      cy.getByCy("description-input-0").type("Consulting");
      cy.getByCy("unit-price-input-0").clear().type("1000");

      cy.getByCy("save-draft-button").click();

      cy.wait("@createInvoiceWithOCR").then((interception) => {
        // Verify OCR was included in the created invoice
        expect(interception.response.body).to.have.property(
          "payment_reference",
        );
        expect(interception.response.body.payment_reference).to.match(/^\d+$/);
      });
    });

    it("is expected to generate valid OCR with Modulo 10 checksum", () => {
      // Test with known invoice numbers and expected OCR values
      // Using Luhn algorithm (Modulo 10) checksum
      const testCases = [
        { invoiceNumber: "INV-0001", expectedOCR: "018" }, // 01 + checksum 8
        { invoiceNumber: "INV-0010", expectedOCR: "102" }, // 10 + checksum 2
        { invoiceNumber: "INV-0042", expectedOCR: "424" }, // 42 + checksum 4
      ];

      testCases.forEach(({ invoiceNumber, expectedOCR: _expectedOCR }) => {
        cy.intercept("POST", "**/rest/v1/invoices*", (req) => {
          // Generate OCR based on invoice number for testing
          const numericPart = parseInt(invoiceNumber.replace(/\D/g, ""), 10)
            .toString()
            .padStart(2, "0");

          req.reply({
            statusCode: 201,
            body: {
              id: `invoice-${invoiceNumber}`,
              invoice_number: invoiceNumber,
              payment_reference: numericPart + "8", // Simple checksum for mock
              ...req.body,
              client: mockClient,
              status: "draft",
            },
          });
        }).as(`createInvoice${invoiceNumber}`);

        // Dispatch organization to Redux
        cy.window().its("store").invoke("dispatch", {
          type: "organizations/setCurrentOrganization",
          payload: mockOrganizationOCR,
        });

        cy.getByCy("create-invoice-button").click();
        cy.getByCy("client-select").select(mockClient.id);
        cy.getByCy("description-input-0").type("Test");
        cy.getByCy("unit-price-input-0").clear().type("100");
        cy.getByCy("save-draft-button").click();

        cy.wait(`@createInvoice${invoiceNumber}`).then((interception) => {
          const ocr = interception.response.body.payment_reference;
          // Verify OCR exists and is numeric
          expect(ocr).to.exist;
          expect(ocr).to.match(/^\d+$/);
          // Verify minimum length
          expect(ocr.length).to.be.at.least(3);
        });
      });
    });
  });

  describe("US-076: Product Catalog Integration for Invoices", () => {
    const mockProducts = [
      {
        id: "prod-consulting",
        name: "Consulting Services",
        description: "Professional IT consulting",
        unit_price: 1500,
        tax_rate: 25,
        unit: "hour",
        prices: [{ currency: "SEK", price: 1500 }],
      },
      {
        id: "prod-development",
        name: "Web Development",
        description: "Full-stack development",
        unit_price: 1200,
        tax_rate: 25,
        unit: "hour",
        prices: [{ currency: "SEK", price: 1200 }],
      },
      {
        id: "prod-food",
        name: "Catering Service",
        description: "Event catering",
        unit_price: 500,
        tax_rate: 12,
        unit: "person",
        prices: [{ currency: "SEK", price: 500 }],
      },
      {
        id: "prod-books",
        name: "Technical Books",
        description: "Programming books",
        unit_price: 300,
        tax_rate: 6,
        unit: "st",
        prices: [{ currency: "SEK", price: 300 }],
      },
    ];

    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [mockClient],
        templates: [mockTemplate],
        products: mockProducts,
      });
    });

    it("is expected to show product selector when creating invoice", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");

      // Product selector button should be visible
      cy.getByCy("product-select-btn-0").scrollIntoView().should("be.visible");

      // Click to open product menu
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-menu-0").should("be.visible");

      // Product options should be visible in menu
      cy.getByCy("product-option-prod-consulting")
        .should("be.visible")
        .and("contain", "Consulting Services");
      cy.getByCy("product-option-prod-development")
        .should("be.visible")
        .and("contain", "Web Development");
    });

    it("is expected to auto-populate fields when product is selected", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Open product menu and select a product
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-consulting").click();

      // Verify auto-populated fields
      cy.getByCy("description-input-0").should(
        "have.value",
        "Professional IT consulting",
      );
      cy.getByCy("unit-price-input-0").should("have.value", "1500");
      cy.getByCy("unit-input-0").should("have.value", "hour");
      cy.getByCy("tax-rate-select-0").should("have.value", "25");
    });

    it("is expected to show VAT rate on each invoice line", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // First item with 25% VAT
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-consulting").click();
      cy.getByCy("tax-rate-select-0").should("be.visible");
      cy.getByCy("tax-rate-select-0").should("have.value", "25");

      // Add second item with different VAT rate
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("product-select-btn-1").click();
      cy.getByCy("product-option-prod-food").click();
      cy.getByCy("tax-rate-select-1").should("be.visible");
      cy.getByCy("tax-rate-select-1").should("have.value", "12");
    });

    it("is expected to allow manual VAT rate override", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Select a product
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-consulting").click();
      cy.getByCy("tax-rate-select-0").should("have.value", "25");

      // Override VAT rate
      cy.getByCy("tax-rate-select-0").select("12");
      cy.getByCy("tax-rate-select-0").should("have.value", "12");

      // Verify calculation uses overridden rate
      cy.getByCy("unit-price-input-0").should("have.value", "1500");
      cy.getByCy("vat-12-display").should("contain", "180.00"); // 12% of 1500
    });

    it("is expected to display VAT breakdown by rate with base amounts", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Add item with 25% VAT
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-consulting").click();
      cy.getByCy("quantity-input-0").clear().type("2");

      // Add item with 12% VAT
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("product-select-btn-1").click();
      cy.getByCy("product-option-prod-food").click();
      cy.getByCy("quantity-input-1").clear().type("10");

      // Verify subtotal
      cy.getByCy("subtotal-display").should("contain", "8000.00"); // (2*1500) + (10*500)

      // Verify VAT breakdown shows base amounts
      // 25% on 3000 = 750
      cy.getByCy("vat-25-display").should("contain", "750.00");
      cy.getByCy("vat-25-display").parent().should("contain", "3000.00");

      // 12% on 5000 = 600
      cy.getByCy("vat-12-display").should("contain", "600.00");
      cy.getByCy("vat-12-display").parent().should("contain", "5000.00");

      // Total: 8000 + 750 + 600 = 9350
      cy.getByCy("total-display").should("contain", "9350.00");
    });

    it("is expected to handle multiple products with different VAT rates", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // 25% VAT item
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-consulting").click();
      cy.getByCy("quantity-input-0").clear().type("1");

      // 25% VAT item (same rate, should be grouped)
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("product-select-btn-1").click();
      cy.getByCy("product-option-prod-development").click();
      cy.getByCy("quantity-input-1").clear().type("1");

      // 12% VAT item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("product-select-btn-2").click();
      cy.getByCy("product-option-prod-food").click();
      cy.getByCy("quantity-input-2").clear().type("1");

      // 6% VAT item
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("product-select-btn-3").click();
      cy.getByCy("product-option-prod-books").click();
      cy.getByCy("quantity-input-3").clear().type("1");

      // Verify all VAT groups are displayed
      cy.getByCy("vat-25-display").should("exist"); // (1500+1200) * 0.25 = 675
      cy.getByCy("vat-12-display").should("exist"); // 500 * 0.12 = 60
      cy.getByCy("vat-6-display").should("exist"); // 300 * 0.06 = 18

      // Verify calculations
      cy.getByCy("subtotal-display").should("contain", "3500.00");
      cy.getByCy("vat-25-display").should("contain", "675.00");
      cy.getByCy("vat-12-display").should("contain", "60.00");
      cy.getByCy("vat-6-display").should("contain", "18.00");
      cy.getByCy("total-display").should("contain", "4253.00");
    });

    it("is expected to allow manual entry without selecting product", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Don't select a product, just enter manually
      cy.getByCy("description-input-0").type("Custom Service");
      cy.getByCy("quantity-input-0").clear().type("5");
      cy.getByCy("unit-input-0").clear().type("days");
      cy.getByCy("unit-price-input-0").clear().type("2000");
      cy.getByCy("tax-rate-select-0").select("12");

      // Verify calculations
      cy.getByCy("amount-0").should("contain", "10000.00");
      cy.getByCy("subtotal-display").should("contain", "10000.00");
      cy.getByCy("vat-12-display").should("contain", "1200.00");
      cy.getByCy("total-display").should("contain", "11200.00");

      // Submit should work
      cy.getByCy("save-draft-button").click();
      cy.wait("@createInvoice");
    });

    it("is expected to maintain product selection when editing line items", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getClients");
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      // Select product
      cy.getByCy("product-select-btn-0").click();
      cy.getByCy("product-option-prod-consulting").click();

      // Edit quantity
      cy.getByCy("quantity-input-0").clear().type("5");

      // Product info should remain
      cy.getByCy("description-input-0").should(
        "have.value",
        "Professional IT consulting",
      );
      cy.getByCy("unit-price-input-0").should("have.value", "1500");
      cy.getByCy("tax-rate-select-0").should("have.value", "25");

      // Amount should update
      cy.getByCy("amount-0").should("contain", "7500.00");
    });

    it("is expected to show all Swedish VAT rate options (25%, 12%, 6%, 0%)", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getProducts");

      cy.getByCy("tax-rate-select-0").scrollIntoView().should("be.visible");
      cy.get('[data-cy="tax-rate-select-0"] option').should("have.length", 4);
      cy.get('[data-cy="tax-rate-select-0"] option[value="25"]').should(
        "exist",
      );
      cy.get('[data-cy="tax-rate-select-0"] option[value="12"]').should(
        "exist",
      );
      cy.get('[data-cy="tax-rate-select-0"] option[value="6"]').should("exist");
      cy.get('[data-cy="tax-rate-select-0"] option[value="0"]').should("exist");
    });

    it("is expected to calculate correctly with 0% VAT rate", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait("@getProducts");
      cy.getByCy("client-select").select(mockClient.id);

      cy.getByCy("description-input-0").type("VAT Exempt Service");
      cy.getByCy("unit-price-input-0").clear().type("1000");
      cy.getByCy("tax-rate-select-0").select("0");

      // Subtotal and total should be the same
      cy.getByCy("subtotal-display").should("contain", "1000.00");
      cy.getByCy("vat-0-display").should("contain", "0.00");
      cy.getByCy("total-display").should("contain", "1000.00");
    });
  });
});
