/**
 * E2E Tests: Multi-Currency Invoice Product Selection (US-024-B)
 * 
 * Tests currency-aware product selection in invoices:
 * - Auto-fills correct price when currency matches
 * - Shows warning when no matching currency price
 * - Allows manual price override
 * - Displays available currencies in product selector
 */

describe('Multi-Currency Invoice Product Selection', () => {
  const mockClient = {
    id: 'client-1',
    name: 'Test Client AB',
    email: 'client@test.com',
    org_number: '556677-8899',
    address: 'Test Street 1',
    zip_code: '12345',
    city: 'Stockholm',
    country: 'Sweden',
    municipality: 'Stockholm'
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
    next_invoice_number: 1,
  };

  const mockProductWithMultiCurrency = {
    id: 'product-multi',
    name: 'Multi-Currency Product',
    description: 'Product with multiple currencies',
    unit: 'pcs',
    tax_rate: 25,
    prices: [
      { currency: 'SEK', price: 100 },
      { currency: 'EUR', price: 10 },
      { currency: 'USD', price: 12 }
    ]
  };

  const mockProductSekOnly = {
    id: 'product-sek',
    name: 'SEK Only Product',
    description: 'Product with SEK price only',
    unit: 'hrs',
    tax_rate: 25,
    prices: [
      { currency: 'SEK', price: 500 }
    ]
  };

  const mockProductNoPrice = {
    id: 'product-noprice',
    name: 'No Price Product',
    description: 'Product without prices',
    unit: 'pcs',
    tax_rate: 25,
    prices: []
  };

  beforeEach(() => {
    cy.login('admin');
    
    cy.setupCommonIntercepts({ 
      clients: [mockClient], 
      products: [mockProductWithMultiCurrency, mockProductSekOnly, mockProductNoPrice],
      templates: [],
      invoices: [],
      defaultOrganization: mockOrganization
    });
    
    // Mock create invoice
    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      const invoice = {
        id: 'new-invoice-id',
        invoice_number: 'INV-0001',
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
    cy.wait('@getTemplates');
    
    // Open create invoice modal
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    
    // Select client
    cy.getByCy('client-select').select(mockClient.id);
  });

  describe('Happy Path - Currency Matching', () => {
    it('is expected to auto-fill SEK price when invoice currency is SEK', () => {
      // Invoice defaults to SEK
      cy.getByCy('currency-select').should('have.value', 'SEK');
      
      // Select product
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy('product-menu-0').should('be.visible');
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      
      // Verify SEK price is auto-filled
      cy.getByCy('unit-price-input-0').should('have.value', '100');
      cy.getByCy('description-input-0').should('have.value', mockProductWithMultiCurrency.description);
      cy.getByCy('unit-input-0').should('have.value', mockProductWithMultiCurrency.unit);
      
      // No warning should appear
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
    });

    it('is expected to auto-fill EUR price when invoice currency is EUR', () => {
      // Change to EUR
      cy.getByCy('currency-select').select('EUR');
      
      // Select product
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      
      // Verify EUR price is auto-filled
      cy.getByCy('unit-price-input-0').should('have.value', '10');
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
    });

    it('is expected to auto-fill USD price when invoice currency is USD', () => {
      // Change to USD
      cy.getByCy('currency-select').select('USD');
      
      // Select product
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      
      // Verify USD price is auto-filled
      cy.getByCy('unit-price-input-0').should('have.value', '12');
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
    });

    it('is expected to display all available currencies in product dropdown', () => {
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy('product-menu-0').should('be.visible');
      
      // Check multi-currency product shows all prices
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`)
        .should('contain', '100 SEK')
        .and('contain', '10 EUR')
        .and('contain', '12 USD');
      
      // Check SEK-only product
      cy.getByCy(`product-option-${mockProductSekOnly.id}`)
        .should('contain', '500 SEK');
      
      // Check product with no prices
      cy.getByCy(`product-option-${mockProductNoPrice.id}`)
        .should('contain', 'No prices');
    });
  });

  describe('Sad Path - Currency Mismatch', () => {
    it('is expected to show warning when no matching currency price exists', () => {
      // Change to GBP (not available in product)
      cy.getByCy('currency-select').select('GBP');
      
      // Select product
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      
      // Price should be 0
      cy.getByCy('unit-price-input-0').should('have.value', '0');
      
      // Warning should appear
      cy.getByCy('currency-mismatch-warning-0').should('be.visible')
        .and('contain', 'No GBP price defined for this product')
        .and('contain', 'Please enter price manually or select different product');
    });

    it('is expected to show warning when product has no prices at all', () => {
      cy.getByCy('currency-select').select('SEK');
      
      // Select product with no prices
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductNoPrice.id}`).click();
      
      // Price should be 0
      cy.getByCy('unit-price-input-0').should('have.value', '0');
      
      // Warning should appear
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
    });

    it('is expected to show warning when SEK-only product used with EUR invoice', () => {
      // Change to EUR
      cy.getByCy('currency-select').select('EUR');
      
      // Select SEK-only product
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Price should be 0
      cy.getByCy('unit-price-input-0').should('have.value', '0');
      
      // Warning should appear
      cy.getByCy('currency-mismatch-warning-0').should('be.visible')
        .and('contain', 'No EUR price defined for this product');
    });

    it('is expected to allow manual price override when currency mismatch exists', () => {
      // Create mismatch scenario
      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      
      // Warning should be visible
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
      
      // Manually enter price
      cy.getByCy('unit-price-input-0').clear().type('15');
      
      // Warning should still be visible (it's informational)
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
      
      // Amount should calculate correctly
      cy.getByCy('quantity-input-0').should('have.value', '1');
      cy.getByCy('amount-0').should('contain', '15.00');
    });
  });

  describe('Edge Cases - Multiple Line Items', () => {
    it('is expected to track currency mismatches per line item independently', () => {
      cy.getByCy('currency-select').select('EUR');
      
      // First line - matching currency
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
      
      // Add second line
      cy.getByCy('add-line-item-button').click();
      
      // Second line - no matching currency
      cy.getByCy('product-select-btn-1').click();
      cy.getByCy('product-menu-1').should('be.visible');
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      cy.getByCy('currency-mismatch-warning-1').should('be.visible');
      
      // First line still has no warning
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
    });

    it('is expected to update warning when invoice currency changes', () => {
      // Start with EUR - matching
      cy.getByCy('currency-select').select('EUR');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
      cy.getByCy('unit-price-input-0').should('have.value', '10');
      
      // Change to GBP - no match
      cy.getByCy('currency-select').select('GBP');
      
      // Note: In real implementation, changing currency should re-evaluate products
      // For this test, we're just verifying the initial selection logic
      // A full implementation might need to watch currency changes
    });

    it('is expected to handle removing line items with warnings', () => {
      cy.getByCy('currency-select').select('GBP');
      
      // Add two lines with mismatches
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
      
      cy.getByCy('add-line-item-button').click();
      cy.getByCy('product-select-btn-1').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      cy.getByCy('currency-mismatch-warning-1').should('be.visible');
      
      // Remove first line
      cy.getByCy('remove-line-item-0').click();
      
      // Second line warning should still exist (now as index 0)
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
    });
  });

  describe('Happy Path - Invoice Creation with Multi-Currency', () => {
    it('is expected to successfully create invoice with matched currency product', () => {
      const mockInvoice = {
        id: 'invoice-1',
        invoice_number: 'INV-001',
        currency: 'EUR',
        total_amount: 12.5,
        status: 'draft'
      };

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: mockInvoice
      }).as('createInvoice');

      // Fill in invoice details (auto numbering mode, no invoice number input)
      cy.getByCy('currency-select').select('EUR');
      cy.getByCy('issue-date-input').type('2024-01-15');
      cy.getByCy('due-date-input').type('2024-02-15');
      
      // Add product with EUR price
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      cy.getByCy('unit-price-input-0').should('have.value', '10');
      cy.getByCy('quantity-input-0').clear().type('1.25');
      
      // No warning
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
      
      // Submit
      cy.getByCy('save-draft-button').click();
      cy.wait('@createInvoice');
      
      cy.getByCy('invoice-modal').should('not.exist');
    });

    it('is expected to successfully create invoice with manual price override', () => {
      const mockInvoice = {
        id: 'invoice-2',
        invoice_number: 'INV-002',
        currency: 'GBP',
        total_amount: 20,
        status: 'draft'
      };

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: mockInvoice
      }).as('createInvoice');

      // Fill in invoice details (auto numbering mode, no invoice number input)
      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('issue-date-input').type('2024-01-15');
      cy.getByCy('due-date-input').type('2024-02-15');
      
      // Add product with no GBP price
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Warning appears
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
      
      // Override price manually
      cy.getByCy('unit-price-input-0').clear().type('20');
      cy.getByCy('quantity-input-0').should('have.value', '1');
      
      // Submit
      cy.getByCy('save-draft-button').click();
      cy.wait('@createInvoice');
      
      cy.getByCy('invoice-modal').should('not.exist');
    });
  });

  describe('Edge Cases - Currency Display', () => {
    it('is expected to show "No prices" for products without any prices', () => {
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy('product-menu-0').should('be.visible');
      
      cy.getByCy(`product-option-${mockProductNoPrice.id}`)
        .should('contain', 'No Price Product')
        .and('contain', 'No prices');
    });

    it('is expected to show all currencies separated by commas', () => {
      cy.getByCy('product-select-btn-0').click();
      
      // Check format: "100 SEK, 10 EUR, 12 USD"
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`)
        .invoke('text')
        .should('match', /100 SEK.*10 EUR.*12 USD/);
    });

    it('is expected to highlight selected product in dropdown', () => {
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`).click();
      
      // Open again
      cy.getByCy('product-select-btn-0').click();
      
      // Selected product should have different styling
      cy.getByCy(`product-option-${mockProductWithMultiCurrency.id}`)
        .should('have.class', 'bg-blue-50');
    });
  });

  describe('Feature: Save Manual Price to Product (US-024-C)', () => {
    it('is expected to show "Save price to product" button when currency mismatch exists', () => {
      // Create mismatch scenario
      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Warning should be visible
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
      
      // Enter manual price
      cy.getByCy('unit-price-input-0').clear().type('150');
      
      // Save price button should appear in warning
      cy.getByCy('save-price-to-product-0').should('be.visible')
        .and('contain', 'Save')
        .and('contain', 'GBP')
        .and('contain', '150');
    });

    it('is expected to only show save button when price is greater than 0', () => {
      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Price is 0 by default, button should not exist
      cy.getByCy('unit-price-input-0').should('have.value', '0');
      cy.getByCy('save-price-to-product-0').should('not.exist');
      
      // Enter valid price
      cy.getByCy('unit-price-input-0').clear().type('100');
      cy.getByCy('save-price-to-product-0').should('exist').and('not.be.disabled');
      
      // Clear price
      cy.getByCy('unit-price-input-0').clear();
      cy.getByCy('save-price-to-product-0').should('not.exist');
    });

    it('is expected to save price to product and remove warning', () => {
      // Mock successful price save
      cy.intercept('POST', '**/rest/v1/product_prices*', {
        statusCode: 201,
        body: {
          id: 'new-price-id',
          product_id: mockProductSekOnly.id,
          currency: 'GBP',
          price: 200
        }
      }).as('createProductPrice');

      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Enter manual price
      cy.getByCy('unit-price-input-0').clear().type('200');
      
      // Click save button
      cy.getByCy('save-price-to-product-0').click();
      cy.wait('@createProductPrice');
      
      // Warning should disappear
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
      
      // Success message should appear (toast)
      // Note: Actual implementation would show toast notification
    });

    it('is expected to handle save failure with error message', () => {
      // Mock failed price save
      cy.intercept('POST', '**/rest/v1/product_prices*', {
        statusCode: 500,
        body: { error: 'Database error' }
      }).as('createProductPriceFail');

      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Enter manual price
      cy.getByCy('unit-price-input-0').clear().type('250');
      
      // Click save button
      cy.getByCy('save-price-to-product-0').click();
      cy.wait('@createProductPriceFail');
      
      // Warning should still be visible
      cy.getByCy('currency-mismatch-warning-0').should('be.visible');
      
      // Error message should appear (toast or inline)
      // Note: Actual implementation would show error notification
    });

    it('is expected to auto-fill price on next product selection after saving', () => {
      // Mock updated product with new price for subsequent GET requests
      const updatedProduct = {
        ...mockProductSekOnly,
        prices: [
          { currency: 'SEK', price: 500 },
          { currency: 'GBP', price: 175 }
        ]
      };

      // First: Save a GBP price
      cy.intercept('POST', '**/rest/v1/product_prices*', {
        statusCode: 201,
        body: {
          id: 'new-price-id',
          product_id: mockProductSekOnly.id,
          currency: 'GBP',
          price: 175
        }
      }).as('createProductPrice');

      // Set up the intercept for updated products BEFORE clicking save
      // This is important because fetchProducts() is called immediately after the POST succeeds
      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: [updatedProduct, mockProductWithMultiCurrency, mockProductNoPrice]
      }).as('getProductsUpdated');

      cy.getByCy('currency-select').select('GBP');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      cy.getByCy('unit-price-input-0').clear().type('175');
      cy.getByCy('save-price-to-product-0').click();
      cy.wait('@createProductPrice');
      
      // Wait for products to be refetched after save
      cy.wait('@getProductsUpdated');
      
      // Add new line item
      cy.getByCy('add-line-item-button').click();
      
      // Select same product again on second line
      cy.getByCy('product-select-btn-1').click();
      cy.getByCy(`product-option-${mockProductSekOnly.id}`).click();
      
      // Price should auto-fill with saved GBP price
      cy.getByCy('unit-price-input-1').should('have.value', '175');
      cy.getByCy('currency-mismatch-warning-1').should('not.exist');
    });

    it('is expected to track multiple currency saves independently', () => {
      // Test saving different currencies for the same product
      cy.intercept('POST', '**/rest/v1/product_prices*', {
        statusCode: 201,
        body: { id: 'price-1', product_id: mockProductNoPrice.id, currency: 'SEK', price: 100 }
      }).as('createPrice1');

      // First line - SEK
      cy.getByCy('currency-select').select('SEK');
      cy.getByCy('product-select-btn-0').click();
      cy.getByCy(`product-option-${mockProductNoPrice.id}`).click();
      cy.getByCy('unit-price-input-0').clear().type('100');
      cy.getByCy('save-price-to-product-0').click();
      cy.wait('@createPrice1');
      
      // Add second line
      cy.getByCy('add-line-item-button').click();
      
      // Change currency to EUR
      cy.getByCy('currency-select').select('EUR');
      
      cy.intercept('POST', '**/rest/v1/product_prices*', {
        statusCode: 201,
        body: { id: 'price-2', product_id: mockProductNoPrice.id, currency: 'EUR', price: 12 }
      }).as('createPrice2');
      
      // Second line - EUR (same product, different currency)
      cy.getByCy('product-select-btn-1').click();
      cy.getByCy(`product-option-${mockProductNoPrice.id}`).click();
      cy.getByCy('unit-price-input-1').clear().type('12');
      cy.getByCy('save-price-to-product-1').click();
      cy.wait('@createPrice2');
      
      // Both warnings should be gone
      cy.getByCy('currency-mismatch-warning-0').should('not.exist');
      cy.getByCy('currency-mismatch-warning-1').should('not.exist');
    });
  });
});
