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
      cy.getByCy('products-page-title').should('be.visible')
      cy.getByCy('create-product-button').should('be.visible')
    })

    it('is expected to open the product modal when clicking create button', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-modal').should('be.visible')
      cy.getByCy('product-form').should('be.visible')
    })

    it('is expected to create a product with only required fields', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-modal').should('be.visible')

      cy.getByCy('product-name-input').type('Consulting Services')
      cy.getByCy('product-price-input').type('1500')
      cy.getByCy('save-product-button').click()

      cy.wait('@createProduct').then((interception) => {
        expect(interception.request.body.name).to.equal('Consulting Services')
        expect(parseFloat(interception.request.body.unit_price)).to.equal(1500)
      })
      cy.getByCy('product-modal').should('not.exist')
    })

    it('is expected to create a product with all fields populated', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-modal').should('be.visible')

      cy.getByCy('product-name-input').type('Premium Support')
      cy.getByCy('product-description-input').type('24/7 premium customer support service')
      cy.getByCy('product-price-input').type('2500')
      cy.getByCy('product-unit-select').select('month')
      cy.getByCy('product-tax-rate-select').select('12')
      cy.getByCy('product-sku-input').type('SUP-PREM-001')
      cy.getByCy('save-product-button').click()

      cy.wait('@createProduct').then((interception) => {
        expect(interception.request.body.name).to.equal('Premium Support')
        expect(interception.request.body.description).to.equal('24/7 premium customer support service')
        expect(parseFloat(interception.request.body.unit_price)).to.equal(2500)
        expect(interception.request.body.unit).to.equal('month')
        expect(parseFloat(interception.request.body.tax_rate)).to.equal(12)
        expect(interception.request.body.sku).to.equal('SUP-PREM-001')
      })
      cy.getByCy('product-modal').should('not.exist')
    })

    it('is expected to close the modal when clicking the cancel button', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-modal').should('be.visible')
      cy.getByCy('cancel-product-button').click()
      cy.getByCy('product-modal').should('not.exist')
    })

    it('is expected to close the modal when clicking the X button', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-modal').should('be.visible')
      cy.getByCy('close-modal-button').click()
      cy.getByCy('product-modal').should('not.exist')
    })

    it('is expected to close the modal when clicking the backdrop', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-modal').should('be.visible')
      cy.getByCy('modal-backdrop').click({ force: true })
      cy.getByCy('product-modal').should('not.exist')
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
      cy.getByCy('products-list').should('be.visible')
      cy.getByCy('products-table').should('be.visible')
      cy.getByCy('product-row-product-1').should('be.visible')
      cy.getByCy('product-row-product-2').should('be.visible')
    })

    it('is expected to display product details correctly', () => {
      cy.getByCy('product-row-product-1').within(() => {
        cy.getByCy('product-name').should('contain', 'Consulting Services')
        cy.getByCy('product-description').should('contain', 'Professional consulting')
        cy.getByCy('product-price').should('exist') // Price is formatted, just check existence
        cy.getByCy('product-unit').should('contain', 'h')
        cy.getByCy('product-tax-rate').should('contain', '25')
        cy.getByCy('product-sku').should('contain', 'CONS-001')
      })
    })

    it('is expected to filter products by search term', () => {
      cy.getByCy('search-products-input').type('Web')
      cy.getByCy('product-row-product-1').should('not.exist')
      cy.getByCy('product-row-product-2').should('be.visible')
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
      cy.getByCy('edit-product-product-1').click()
      cy.getByCy('product-modal').should('be.visible')
      
      cy.getByCy('product-name-input').clear().type('Updated Name')
      cy.getByCy('product-price-input').clear().type('1500')
      cy.getByCy('save-product-button').click()

      cy.wait('@updateProduct')
      cy.getByCy('product-modal').should('not.exist')
    })

    it('is expected to delete a product', () => {
      cy.getByCy('delete-product-product-1').click()
      cy.getByCy('delete-confirm-modal').should('be.visible')
      cy.getByCy('confirm-delete-button').click()

      cy.wait('@deleteProduct')
      cy.getByCy('delete-confirm-modal').should('not.exist')
    })

    it('is expected to cancel deletion', () => {
      cy.getByCy('delete-product-product-1').click()
      cy.getByCy('delete-confirm-modal').should('be.visible')
      cy.getByCy('cancel-delete-button').click()
      cy.getByCy('delete-confirm-modal').should('not.exist')
      cy.getByCy('product-row-product-1').should('be.visible')
    })
  })

  describe('Empty State', () => {
    it('is expected to display empty state when no products exist', () => {
      cy.getByCy('products-empty-state').should('be.visible')
      cy.getByCy('products-empty-state').should('contain', 'No products yet')
    })

    it('is expected to open modal from empty state button', () => {
      cy.getByCy('products-empty-state').within(() => {
        cy.contains('Add Your First Product').click()
      })
      cy.getByCy('product-modal').should('be.visible')
    })
  })

  describe('Validation', () => {
    it('is expected to require product name', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-price-input').type('100')
      cy.getByCy('save-product-button').click()
      
      // Form should not submit without name
      cy.getByCy('product-modal').should('be.visible')
    })

    it('is expected to require positive price', () => {
      cy.getByCy('create-product-button').click()
      cy.getByCy('product-name-input').type('Test Product')
      cy.getByCy('product-price-input').type('-50')
      cy.getByCy('save-product-button').click()
      
      // Form should not submit with negative price
      cy.getByCy('product-modal').should('be.visible')
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
      cy.getByCy('create-invoice-button').click()
      cy.wait('@getProducts')
      cy.wait('@getClients')
      
      cy.getByCy('invoice-modal').should('be.visible')
      cy.getByCy('product-select-0').scrollIntoView().should('be.visible')
      cy.getByCy('product-select-0').select('product-1')
      
      // Verify fields are populated
      cy.getByCy('description-input-0').should('have.value', 'Hourly consulting')
      cy.getByCy('unit-price-input-0').should('have.value', '1500')
      cy.getByCy('unit-input-0').should('have.value', 'h')
    })
  })
})
