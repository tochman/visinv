/// <reference types="cypress" />

describe("Multi-Currency Product Pricing (US-024-A)", () => {
  const mockClient = {
    id: "client-123",
    name: "Test Client AB",
    email: "client@test.com",
  };

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
      country: "Sweden",
      email: "billing@testorg.se",
      phone: "+46701234567",
      invoice_numbering_mode: "automatic",
      invoice_prefix: "INV-",
      next_invoice_number: 1,
      default_currency: "SEK",
    };

    cy.setupCommonIntercepts({
      clients: [mockClient],
      products: [], // Empty products by default, overridden in describe blocks
      invoices: [],
      templates: [],
      defaultOrganization: mockOrganization,
    });

    cy.login("admin");
  });

  describe("Product Creation with Multi-Currency Prices", () => {
    beforeEach(() => {
      cy.getByCy("sidebar-nav-products").click();
    });

    it("is expected to show default currency and add currency button", () => {
      cy.getByCy("create-product-button").click();
      cy.getByCy("product-modal").should("be.visible");

      // Verify only default currency (SEK) is shown initially
      cy.getByCy("product-price-sek").should("be.visible");
      cy.getByCy("product-price-eur").should("not.exist");
      cy.getByCy("product-price-usd").should("not.exist");

      // Verify "Add Currency" button is visible
      cy.getByCy("add-currency-button").should("be.visible").click();

      // Verify currency menu appears with available currencies
      cy.getByCy("currency-menu").should("be.visible");
      cy.getByCy("add-currency-eur").should("be.visible");
      cy.getByCy("add-currency-usd").should("be.visible");
      cy.getByCy("add-currency-gbp").should("be.visible");
      cy.getByCy("add-currency-nok").should("be.visible");
      cy.getByCy("add-currency-dkk").should("be.visible");

      // Add EUR currency
      cy.getByCy("add-currency-eur").click();

      // Verify EUR field now appears
      cy.getByCy("product-price-eur").should("be.visible");

      // Verify currency menu closes and EUR is no longer available
      cy.getByCy("currency-menu").should("not.exist");
      
      // Open menu again to verify EUR is not in the list
      cy.getByCy("add-currency-button").click();
      cy.getByCy("currency-menu").should("be.visible");
      cy.getByCy("add-currency-eur").should("not.exist");
      cy.getByCy("add-currency-usd").should("be.visible");
    });

    it("is expected to create product with single currency price", () => {
      const newProduct = {
        id: "product-1",
        name: "Consulting Services",
        description: "Professional IT consulting",
        unit: "h",
        tax_rate: 25,
        sku: "CONS-001",
        is_active: true,
      };

      const newProductWithPrices = {
        ...newProduct,
        prices: [
          { currency: "SEK", price: 1500 }
        ]
      };

      // Intercept POST to products table (returns single object when using .single())
      cy.intercept("POST", "**/rest/v1/products**", {
        statusCode: 201,
        body: newProduct,
      }).as("createProduct");

      // Intercept POST to product_prices table
      cy.intercept("POST", "**/rest/v1/product_prices**", {
        statusCode: 201,
        body: [{ currency: "SEK", price: 1500, product_id: "product-1" }],
      }).as("createProductPrices");

      // Intercept the show request (GET with id filter and prices join)
      // .single() expects a single object, not an array
      cy.intercept("GET", "**/rest/v1/products**id=eq.product-1**", {
        statusCode: 200,
        body: newProductWithPrices,
      }).as("showProduct");

      cy.getByCy("create-product-button").click();
      cy.getByCy("product-modal").should("be.visible");

      cy.getByCy("product-name-input").type("Consulting Services");
      cy.getByCy("product-description-input").type("Professional IT consulting");
      cy.getByCy("product-price-sek").type("1500");
      cy.getByCy("product-unit-select").select("h");
      cy.getByCy("product-tax-rate-select").select("25");
      cy.getByCy("product-sku-input").type("CONS-001");

      cy.getByCy("save-product-button").click();

      cy.wait("@createProduct");
      cy.wait("@createProductPrices");
      cy.wait("@showProduct");
      cy.getByCy("product-modal").should("not.exist");
      
      // Verify product appears in the list (from Redux state, no refetch needed)
      cy.getByCy("product-row-product-1").should("be.visible");
      cy.getByCy("product-row-product-1").within(() => {
        cy.getByCy("product-name").should("contain", "Consulting Services");
      });
    });

    it("is expected to create product with multiple currency prices", () => {
      const newProduct = {
        id: "product-2",
        name: "Web Development",
        description: "Full-stack development",
        unit: "h",
        tax_rate: 25,
        sku: "WEB-001",
        is_active: true,
      };

      const newProductWithPrices = {
        ...newProduct,
        prices: [
          { currency: "SEK", price: 1200 },
          { currency: "EUR", price: 100 },
          { currency: "USD", price: 120 }
        ]
      };

      cy.intercept("POST", "**/rest/v1/products**", {
        statusCode: 201,
        body: newProduct,
      }).as("createProduct");

      cy.intercept("POST", "**/rest/v1/product_prices**", {
        statusCode: 201,
        body: newProductWithPrices.prices.map(p => ({ ...p, product_id: "product-2" })),
      }).as("createProductPrices");

      cy.intercept("GET", "**/rest/v1/products**id=eq.product-2**", {
        statusCode: 200,
        body: newProductWithPrices,
      }).as("showProduct");

      cy.getByCy("create-product-button").click();
      cy.getByCy("product-modal").should("be.visible");

      cy.getByCy("product-name-input").type("Web Development");
      cy.getByCy("product-description-input").type("Full-stack development");
      
      // Enter prices for multiple currencies (need to add EUR and USD first)
      cy.getByCy("product-price-sek").type("1200");
      
      // Add EUR currency
      cy.getByCy("add-currency-button").click();
      cy.getByCy("add-currency-eur").click();
      cy.getByCy("product-price-eur").type("100");
      
      // Add USD currency
      cy.getByCy("add-currency-button").click();
      cy.getByCy("add-currency-usd").click();
      cy.getByCy("product-price-usd").type("120");

      cy.getByCy("product-unit-select").select("h");
      cy.getByCy("product-tax-rate-select").select("25");
      cy.getByCy("product-sku-input").type("WEB-001");

      cy.getByCy("save-product-button").click();

      cy.wait("@createProduct");
      cy.wait("@createProductPrices");
      cy.wait("@showProduct");
      cy.getByCy("product-modal").should("not.exist");
      
      // Verify product appears in the list with multiple prices
      cy.getByCy("product-row-product-2").should("be.visible");
    });

    it("is expected to show error when no prices are entered", () => {
      cy.getByCy("create-product-button").click();
      cy.getByCy("product-modal").should("be.visible");

      cy.getByCy("product-name-input").type("No Price Product");
      cy.getByCy("product-unit-select").select("st");

      cy.getByCy("save-product-button").click();

      // Modal should remain open with error
      cy.getByCy("product-modal").should("be.visible");
      cy.getByCy("product-form-error")
        .should("be.visible")
        .and("contain", "at least one price");
    });

    it("is expected to ignore empty currency fields", () => {
      const newProduct = {
        id: "product-3",
        name: "Design Services",
        description: "Graphic design",
        unit: "h",
        tax_rate: 25,
        sku: "DES-001",
        is_active: true,
      };

      const newProductWithPrices = {
        ...newProduct,
        prices: [
          { currency: "SEK", price: 1000 }
        ]
      };

      cy.intercept("POST", "**/rest/v1/products*", {
        statusCode: 201,
        body: newProduct,
      }).as("createProduct");

      cy.intercept("POST", "**/rest/v1/product_prices*", {
        statusCode: 201,
        body: [{ currency: "SEK", price: 1000, product_id: "product-3" }],
      }).as("createProductPrices");

      // Intercept the show request after create
      cy.intercept("GET", "**/rest/v1/products**id=eq.product-3**", {
        statusCode: 200,
        body: newProductWithPrices,
      }).as("showProduct");

      cy.getByCy("create-product-button").click();
      cy.getByCy("product-modal").should("be.visible");

      cy.getByCy("product-name-input").type("Design Services");
      cy.getByCy("product-description-input").type("Graphic design");
      
      // Only enter SEK price, leave others empty
      cy.getByCy("product-price-sek").type("1000");

      cy.getByCy("product-unit-select").select("h");
      cy.getByCy("product-sku-input").type("DES-001");

      cy.getByCy("save-product-button").click();

      cy.wait("@createProduct");
      cy.wait("@createProductPrices").then((interception) => {
        // Verify only SEK price was sent (prices go to product_prices endpoint)
        const pricesBody = interception.request.body;
        expect(pricesBody).to.have.length(1);
        expect(pricesBody[0].currency).to.equal("SEK");
      });

      cy.getByCy("product-modal").should("not.exist");
    });
  });

  describe("Product Editing with Multi-Currency Prices", () => {
    const existingProduct = {
      id: "product-existing",
      name: "Existing Product",
      description: "Test product",
      unit: "st",
      tax_rate: 25,
      sku: "EXIST-001",
      is_active: true,
      prices: [
        { currency: "SEK", price: 500 },
        { currency: "EUR", price: 50 }
      ]
    };

    beforeEach(() => {
      // Override the default products intercept with our test data
      cy.intercept("GET", "**/rest/v1/products*", {
        statusCode: 200,
        body: [existingProduct],
      }).as("getProductsWithPrices");

      // Set up PATCH intercept before any navigation
      cy.intercept("PATCH", "**/rest/v1/products*", (req) => {
        req.reply({
          statusCode: 200,
          body: { ...existingProduct, ...req.body }
        });
      }).as("updateProduct");

      // Set up DELETE and POST intercepts for prices
      cy.intercept("DELETE", "**/rest/v1/product_prices*", {
        statusCode: 204,
      }).as("deleteOldPrices");

      cy.intercept("POST", "**/rest/v1/product_prices*", (req) => {
        req.reply({
          statusCode: 201,
          body: req.body
        });
      }).as("createProductPrices");

      cy.getByCy("sidebar-nav-products").click();
      cy.wait("@getProductsWithPrices");
      
      // Ensure the product appears in the table before trying to edit
      cy.getByCy("product-row-product-existing").should("be.visible");
      cy.contains("Existing Product").should("be.visible");
    });

    it("is expected to show existing prices when editing product", () => {
      cy.getByCy("edit-product-product-existing").click();
      cy.getByCy("product-modal").should("be.visible");

      // Verify existing prices are populated (only currencies with prices)
      cy.getByCy("product-price-sek").should("have.value", "500");
      cy.getByCy("product-price-eur").should("have.value", "50");
      
      // USD should not exist until added
      cy.getByCy("product-price-usd").should("not.exist");
    });

    it("is expected to update product prices", () => {
      cy.getByCy("edit-product-product-existing").click();
      cy.getByCy("product-modal").should("be.visible");

      // Update SEK price (already visible)
      cy.getByCy("product-price-sek").clear().type("600");

      // Update EUR price (already visible from existingProduct)
      cy.getByCy("product-price-eur").clear().type("60");

      cy.getByCy("save-product-button").click();

      cy.wait("@updateProduct");
      cy.getByCy("product-modal").should("not.exist");
    });

    it("is expected to remove prices by using remove button", () => {
      cy.getByCy("edit-product-product-existing").click();
      cy.getByCy("product-modal").should("be.visible");

      // EUR is already visible from existingProduct
      cy.getByCy("product-price-eur").should("have.value", "50");

      // Remove EUR price using the remove button
      cy.getByCy("remove-price-eur").click();
      cy.getByCy("product-price-eur").should("not.exist");

      cy.getByCy("save-product-button").click();

      cy.wait("@updateProduct");
      // Prices are saved separately via product_prices endpoint
      cy.wait("@createProductPrices").then((interception) => {
        // Verify only SEK price remains
        const pricesBody = interception.request.body;
        expect(pricesBody).to.have.length(1);
        expect(pricesBody[0].currency).to.equal("SEK");
      });

      cy.getByCy("product-modal").should("not.exist");
    });

    it("is expected to require at least one price when editing", () => {
      cy.getByCy("edit-product-product-existing").click();
      cy.getByCy("product-modal").should("be.visible");
      
      // Verify we're in edit mode
      cy.getByCy("product-name-input").should("have.value", "Existing Product");

      // Clear SEK price field
      cy.getByCy("product-price-sek").clear();
      
      // Remove EUR price using the remove button (product has both SEK and EUR)
      cy.getByCy("remove-price-eur").click();
      cy.getByCy("product-price-eur").should("not.exist");

      cy.getByCy("save-product-button").click();

      // Modal should remain open with error - validation should prevent submission
      cy.getByCy("product-modal").should("be.visible");
      cy.getByCy("product-form-error")
        .should("contain", "at least one price");
      
      // Verify PATCH was NOT called (form validation prevented it)
      cy.get("@updateProduct.all").should("have.length", 0);
    });
  });

  describe("Product List Display", () => {
    const productsWithPrices = [
      {
        id: "product-1",
        name: "Single Currency Product",
        unit: "st",
        tax_rate: 25,
        is_active: true,
        prices: [
          { currency: "SEK", price: 100 }
        ]
      },
      {
        id: "product-2",
        name: "Multi Currency Product",
        unit: "h",
        tax_rate: 25,
        is_active: true,
        prices: [
          { currency: "SEK", price: 1200 },
          { currency: "EUR", price: 100 },
          { currency: "USD", price: 120 }
        ]
      }
    ];

    beforeEach(() => {
      cy.intercept("GET", "**/rest/v1/products?*", {
        statusCode: 200,
        body: productsWithPrices,
      }).as("getProductsWithPrices");

      cy.getByCy("sidebar-nav-products").click();
      cy.wait("@getProductsWithPrices");
    });

    it("is expected to display products with prices", () => {
      cy.getByCy("product-row-product-1").should("be.visible");
      cy.getByCy("product-row-product-2").should("be.visible");
    });
  });
});
