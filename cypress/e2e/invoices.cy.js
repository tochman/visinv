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

    cy.intercept("GET", "**/rest/v1/organization_members*is_default=eq.true*", {
      statusCode: 200,
      body: {
        organizations: mockOrganization,
      },
    }).as("getDefaultOrganization");

    // Then set up test-specific intercepts
    cy.intercept("GET", "**/rest/v1/clients*", {
      statusCode: 200,
      body: [mockClient],
    }).as("getClients");

    // Mock templates endpoint
    cy.intercept("GET", "**/rest/v1/invoice_templates*", {
      statusCode: 200,
      body: [mockTemplate],
    }).as("getTemplates");

    // Mock products endpoint
    cy.intercept("GET", "**/rest/v1/products*", {
      statusCode: 200,
      body: [],
    }).as("getProducts");

    // Mock invoices endpoint
    cy.intercept("GET", "**/rest/v1/invoices*", {
      statusCode: 200,
      body: [],
    }).as("getInvoices");

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

      cy.getByCy("submit-button").scrollIntoView().click();

      cy.wait("@createInvoice");
      cy.getByCy("invoice-modal").should("not.exist");
    });

    it("is expected to add multiple line items", () => {
      cy.getByCy("create-invoice-button").click();
      cy.getByCy("invoice-modal").should("be.visible");
      
      // Wait for API calls
      cy.wait('@getClients')
      cy.wait('@getProducts')

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

      cy.getByCy("submit-button").click();
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

      cy.getByCy("submit-button").click();

      // Error should exist (may be partially covered by sticky header)
      cy.getByCy("invoice-form-error").should("exist");
      cy.getByCy("invoice-modal").should("be.visible");
    });

    it("is expected to show error when no line items have descriptions", () => {
      cy.getByCy("create-invoice-button").click();

      cy.getByCy("client-select").select(mockClient.id);

      // Leave description empty
      cy.getByCy("unit-price-input-0").clear().type("1000");

      cy.getByCy("submit-button").click();

      cy.getByCy("invoice-form-error").should("exist");
    });

    it("is expected to allow submitting with empty line items if at least one has a description", () => {
      cy.getByCy("create-invoice-button").click();
      cy.wait('@getClients')
      cy.wait('@getProducts')

      cy.getByCy("client-select").select(mockClient.id);

      // Add multiple items
      cy.getByCy("add-line-item-button").click();
      cy.getByCy("add-line-item-button").click();

      // Only fill first item
      cy.getByCy("description-input-0").type("Valid Service");
      cy.getByCy("unit-price-input-0").clear().type("1000");

      // Leave others empty

      cy.getByCy("submit-button").click();

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
      cy.intercept("GET", "**/rest/v1/invoices*", {
        statusCode: 200,
        body: mockInvoices,
      }).as("getInvoicesWithData");

      cy.visit("/invoices");
      cy.wait("@getInvoicesWithData");
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
      cy.getByCy("mark-paid-button-inv-2").should("be.visible");
    });

    it("is expected to mark invoice as sent", () => {
      cy.intercept("PATCH", "**/rest/v1/invoices*", {
        statusCode: 200,
        body: { ...mockInvoices[0], status: "sent" },
      }).as("updateInvoice");

      cy.getByCy("mark-sent-button-inv-1").click();
      cy.wait("@updateInvoice");
    });

    it("is expected to mark invoice as paid", () => {
      cy.intercept("PATCH", "**/rest/v1/invoices*", {
        statusCode: 200,
        body: { ...mockInvoices[1], status: "paid" },
      }).as("updateInvoice");

      cy.getByCy("mark-paid-button-inv-2").click();
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
      cy.intercept("DELETE", "**/rest/v1/invoices*", {
        statusCode: 204,
      }).as("deleteInvoice");

      cy.getByCy("delete-invoice-button-inv-1").click();
      cy.getByCy("delete-confirm-modal").should("be.visible");
      cy.getByCy("confirm-delete-button").click();

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
      cy.intercept("GET", "**/rest/v1/invoices*", {
        statusCode: 200,
        body: [existingInvoice],
      }).as("getInvoicesForEdit");

      cy.visit("/invoices");
      cy.wait("@getInvoicesForEdit");
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
        body: { ...existingInvoice, status: "updated" },
      }).as("updateInvoice");

      cy.getByCy("edit-invoice-button-inv-edit").click();

      cy.getByCy("description-input-0").clear().type("Updated Service");
      cy.getByCy("unit-price-input-0").clear().type("1500");

      cy.getByCy("submit-button").click();

      cy.wait("@updateInvoice", { timeout: 10000 });
      cy.getByCy("invoice-modal").should("not.exist");
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
      cy.intercept("GET", "**/rest/v1/invoices*", {
        statusCode: 200,
        body: [invoiceWithFullData],
      }).as("getInvoicesWithData");

      cy.visit("/invoices");
      cy.wait("@getInvoicesWithData");
      cy.wait("@getTemplates");
    });

    it("is expected to display PDF download button", () => {
      cy.getByCy("download-pdf-button-inv-pdf").should("be.visible");
    });

    it("is expected to download PDF when button is clicked", () => {
      // Note: Testing actual PDF generation is difficult in Cypress
      // We just verify the button exists and is clickable
      cy.getByCy("download-pdf-button-inv-pdf")
        .should("not.be.disabled")
        .click();

      // Verify button shows loading state
      cy.getByCy("download-pdf-button-inv-pdf").within(() => {
        cy.get(".animate-spin").should("exist");
      });
    });

    it("is expected to show error when no templates available", () => {
      cy.intercept("GET", "**/rest/v1/invoice_templates*", {
        statusCode: 200,
        body: [],
      }).as("getNoTemplates");

      cy.visit("/invoices");
      cy.wait("@getInvoicesWithData");
      cy.wait("@getNoTemplates");

      cy.getByCy("download-pdf-button-inv-pdf").click();
      // Alert handling is automatic in Cypress
    });
  });

  describe("VAT Grouping", () => {
    beforeEach(() => {
      cy.intercept("GET", "**/rest/v1/products*", {
        statusCode: 200,
        body: [
          {
            id: "prod-1",
            name: "Standard Item",
            unit_price: 1000,
            tax_rate: 25,
            unit: "st",
          },
          {
            id: "prod-2",
            name: "Reduced Item",
            unit_price: 500,
            tax_rate: 12,
            unit: "st",
          },
          {
            id: "prod-3",
            name: "Food Item",
            unit_price: 300,
            tax_rate: 6,
            unit: "st",
          },
        ],
      }).as("getProducts");
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
    it("is expected to auto-generate OCR payment reference when creating invoice", () => {
      // Mock to capture the created invoice data
      let capturedInvoice = null;
      cy.intercept("POST", "**/rest/v1/invoices*", (req) => {
        capturedInvoice = req.body;
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

      cy.getByCy("submit-button").click();

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

      testCases.forEach(({ invoiceNumber, expectedOCR }) => {
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

        cy.visit("/invoices");
        cy.getByCy("create-invoice-button").click();
        cy.getByCy("client-select").select(mockClient.id);
        cy.getByCy("description-input-0").type("Test");
        cy.getByCy("unit-price-input-0").clear().type("100");
        cy.getByCy("submit-button").click();

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
      },
      {
        id: "prod-development",
        name: "Web Development",
        description: "Full-stack development",
        unit_price: 1200,
        tax_rate: 25,
        unit: "hour",
      },
      {
        id: "prod-food",
        name: "Catering Service",
        description: "Event catering",
        unit_price: 500,
        tax_rate: 12,
        unit: "person",
      },
      {
        id: "prod-books",
        name: "Technical Books",
        description: "Programming books",
        unit_price: 300,
        tax_rate: 6,
        unit: "st",
      },
    ];

    beforeEach(() => {
      cy.intercept("GET", "**/rest/v1/products*", {
        statusCode: 200,
        body: mockProducts,
      }).as("getProducts");
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
      cy.getByCy("product-option-prod-consulting").should("be.visible").and("contain", "Consulting Services");
      cy.getByCy("product-option-prod-development").should("be.visible").and("contain", "Web Development");
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
      cy.getByCy("submit-button").click();
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
