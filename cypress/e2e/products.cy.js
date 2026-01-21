/// <reference types="cypress" />

describe('Product Catalog', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/products*', {
      statusCode: 200,
      body: []
    }).as('getProducts')

    cy.intercept('POST', '**/rest/v1/products*', (req) => {
      req.reply({
        statusCode: 201,
        body: { 
          id: 'new-product-id', 
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...req.body 
        }
      })
    }).as('createProduct')

    cy.login('admin')
    cy.visit('/products')
    cy.wait('@getProducts')
  })

  describe('Happy Path - Adding a Product', () => {
    it('is expected to display the products page', () => {
      cy.get('[data-cy="products-page-title"]').should('be.visible')
      cy.get('[data-cy="create-product-button"]').should('be.visible')
    })

    it('is expected to open the product modal when clicking create button', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')
      cy.get('[data-cy="product-form"]').should('be.visible')
    })

    it('is expected to create a product with only required fields', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')

      cy.get('[data-cy="product-name-input"]').type('Consulting Services')
      cy.get('[data-cy="product-price-input"]').type('1500')
      cy.get('[data-cy="save-product-button"]').click()

      cy.wait('@createProduct').then((interception) => {
        expect(interception.request.body.name).to.equal('Consulting Services')
        expect(parseFloat(interception.request.body.unit_price)).to.equal(1500)
      })
      cy.get('[data-cy="product-modal"]').should('not.exist')
    })

    it('is expected to create a product with all fields populated', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')

      cy.get('[data-cy="product-name-input"]').type('Premium Support')
      cy.get('[data-cy="product-description-input"]').type('24/7 premium customer support service')
      cy.get('[data-cy="product-price-input"]').type('2500')
      cy.get('[data-cy="product-unit-select"]').select('month')
      cy.get('[data-cy="product-tax-rate-select"]').select('12')
      cy.get('[data-cy="product-sku-input"]').type('SUP-PREM-001')
      cy.get('[data-cy="save-product-button"]').click()

      cy.wait('@createProduct').then((interception) => {
        expect(interception.request.body.name).to.equal('Premium Support')
        expect(interception.request.body.description).to.equal('24/7 premium customer support service')
        expect(parseFloat(interception.request.body.unit_price)).to.equal(2500)
        expect(interception.request.body.unit).to.equal('month')
        expect(parseFloat(interception.request.body.tax_rate)).to.equal(12)
        expect(interception.request.body.sku).to.equal('SUP-PREM-001')
      })
      cy.get('[data-cy="product-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the cancel button', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')
      cy.get('[data-cy="cancel-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the X button', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')
      cy.get('[data-cy="close-modal-button"]').click()
      cy.get('[data-cy="product-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the backdrop', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')
      cy.get('[data-cy="modal-backdrop"]').click({ force: true })
      cy.get('[data-cy="product-modal"]').should('not.exist')
    })
  })

  describe('Product List - Display and Search', () => {
    beforeEach(() => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Consulting Services',
          description: 'Professional consulting',
          unit_price: 1500.00,
          unit: 'h',
          tax_rate: 25.00,
          sku: 'CONS-001',
          is_active: true
        },
        {
          id: 'product-2',
          name: 'Web Development',
          description: 'Full-stack web development',
          unit_price: 1200.00,
          unit: 'h',
          tax_rate: 25.00,
          sku: 'WEB-001',
          is_active: true
        }
      ]

      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: mockProducts
      }).as('getProductsList')

      cy.visit('/products')
      cy.wait('@getProductsList')
    })

    it('is expected to display list of products', () => {
      cy.get('[data-cy="products-list"]').should('be.visible')
      cy.get('[data-cy="products-table"]').should('be.visible')
      cy.get('[data-cy="product-row-product-1"]').should('be.visible')
      cy.get('[data-cy="product-row-product-2"]').should('be.visible')
    })

    it('is expected to display product details correctly', () => {
      cy.get('[data-cy="product-row-product-1"]').within(() => {
        cy.get('[data-cy="product-name"]').should('contain', 'Consulting Services')
        cy.get('[data-cy="product-description"]').should('contain', 'Professional consulting')
        cy.get('[data-cy="product-price"]').should('exist') // Price is formatted, just check existence
        cy.get('[data-cy="product-unit"]').should('contain', 'h')
        cy.get('[data-cy="product-tax-rate"]').should('contain', '25')
        cy.get('[data-cy="product-sku"]').should('contain', 'CONS-001')
      })
    })

    it('is expected to filter products by search term', () => {
      cy.get('[data-cy="search-products-input"]').type('Web')
      cy.get('[data-cy="product-row-product-1"]').should('not.exist')
      cy.get('[data-cy="product-row-product-2"]').should('be.visible')
    })
  })

  describe('Product Editing and Deletion', () => {
    beforeEach(() => {
      const mockProduct = {
        id: 'product-1',
        name: 'Old Name',
        description: 'Old description',
        unit_price: 1000.00,
        unit: 'st',
        tax_rate: 25.00,
        sku: 'OLD-001',
        is_active: true
      }

      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: [mockProduct]
      }).as('getProducts')

      cy.intercept('PATCH', '**/rest/v1/products*', (req) => {
        req.reply({
          statusCode: 200,
          body: { ...mockProduct, ...req.body }
        })
      }).as('updateProduct')

      cy.intercept('DELETE', '**/rest/v1/products*', {
        statusCode: 204
      }).as('deleteProduct')

      cy.visit('/products')
      cy.wait('@getProducts')
    })

    it('is expected to edit a product', () => {
      cy.get('[data-cy="edit-product-product-1"]').click()
      cy.get('[data-cy="product-modal"]').should('be.visible')
      
      cy.get('[data-cy="product-name-input"]').clear().type('Updated Name')
      cy.get('[data-cy="product-price-input"]').clear().type('1500')
      cy.get('[data-cy="save-product-button"]').click()

      cy.wait('@updateProduct')
      cy.get('[data-cy="product-modal"]').should('not.exist')
    })

    it('is expected to delete a product', () => {
      cy.get('[data-cy="delete-product-product-1"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('be.visible')
      cy.get('[data-cy="confirm-delete-button"]').click()

      cy.wait('@deleteProduct')
      cy.get('[data-cy="delete-confirm-modal"]').should('not.exist')
    })

    it('is expected to cancel deletion', () => {
      cy.get('[data-cy="delete-product-product-1"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('be.visible')
      cy.get('[data-cy="cancel-delete-button"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('not.exist')
      cy.get('[data-cy="product-row-product-1"]').should('be.visible')
    })
  })

  describe('Empty State', () => {
    it('is expected to display empty state when no products exist', () => {
      cy.get('[data-cy="products-empty-state"]').should('be.visible')
      cy.get('[data-cy="products-empty-state"]').should('contain', 'No products yet')
    })

    it('is expected to open modal from empty state button', () => {
      cy.get('[data-cy="products-empty-state"]').within(() => {
        cy.contains('Add Your First Product').click()
      })
      cy.get('[data-cy="product-modal"]').should('be.visible')
    })
  })

  describe('Validation', () => {
    it('is expected to require product name', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-price-input"]').type('100')
      cy.get('[data-cy="save-product-button"]').click()
      
      // Form should not submit without name
      cy.get('[data-cy="product-modal"]').should('be.visible')
    })

    it('is expected to require positive price', () => {
      cy.get('[data-cy="create-product-button"]').click()
      cy.get('[data-cy="product-name-input"]').type('Test Product')
      cy.get('[data-cy="product-price-input"]').type('-50')
      cy.get('[data-cy="save-product-button"]').click()
      
      // Form should not submit with negative price
      cy.get('[data-cy="product-modal"]').should('be.visible')
    })
  })

  describe('Product Selection in Invoice', () => {
    beforeEach(() => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Consulting',
          description: 'Hourly consulting',
          unit_price: 1500.00,
          unit: 'h',
          tax_rate: 25.00,
          is_active: true
        }
      ]

      const mockClients = [
        {
          id: 'client-1',
          name: 'Test Client',
          email: 'client@test.com',
          country: 'Sweden'
        }
      ]

      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: mockProducts
      }).as('getProducts')

      cy.intercept('GET', '**/rest/v1/clients*', {
        statusCode: 200,
        body: mockClients
      }).as('getClients')

      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: []
      }).as('getInvoices')

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: { id: 'new-invoice-id' }
      }).as('createInvoice')

      cy.visit('/invoices')
      cy.wait('@getInvoices')
    })

    it('is expected to populate line item from product selection', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.wait('@getClients')
      
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
      cy.get('[data-cy="product-select-0"]').should('be.visible')
      cy.get('[data-cy="product-select-0"]').select('product-1')
      
      // Verify fields are populated
      cy.get('[data-cy="description-input-0"]').should('have.value', 'Hourly consulting')
      cy.get('[data-cy="unit-price-input-0"]').should('have.value', '1500')
      cy.get('[data-cy="unit-input-0"]').should('have.value', 'h')
    })
  })
})
