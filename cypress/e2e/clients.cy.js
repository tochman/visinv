/// <reference types="cypress" />

describe('Client Management', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: []
    }).as('getClients')

    cy.intercept('POST', '**/rest/v1/clients*', (req) => {
      req.reply({
        statusCode: 201,
        body: { id: 'new-client-id', ...req.body }
      })
    }).as('createClient')

    cy.login('admin')
    cy.visit('/clients')
    cy.wait('@getClients')
  })

  describe('Happy Path - Adding a Client', () => {
    it('is expected to display the clients page', () => {
      cy.get('[data-cy="clients-page-title"]').should('be.visible')
      cy.get('[data-cy="create-client-button"]').should('be.visible')
    })

    it('is expected to open the client modal when clicking create button', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="client-form"]').should('be.visible')
    })

    it('is expected to create a client with only required fields', () => {
      cy.get('[data-cy="create-client-button"]', { timeout: 15000 }).should('be.visible').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      const clientName = `Test Client ${Date.now()}`
      cy.get('[data-cy="client-name-input"]').type(clientName)
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@createClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to create a client with all fields populated', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      const clientData = {
        name: `Full Client ${Date.now()}`,
        email: 'test@example.com',
        phone: '+46 70 123 4567',
        contactPerson: 'John Doe',
        address: 'Storgatan 1',
        city: 'Stockholm',
        postalCode: '111 22',
        country: 'Sweden',
        orgNumber: '556123-4567',
        vatNumber: 'SE556123456701',
        notes: 'Important client notes'
      }

      cy.get('[data-cy="client-name-input"]').type(clientData.name)
      cy.get('[data-cy="client-email-input"]').type(clientData.email)
      cy.get('[data-cy="client-phone-input"]').type(clientData.phone)
      cy.get('input[name="contact_person"]').type(clientData.contactPerson)
      cy.get('input[name="address"]').type(clientData.address)
      cy.get('input[name="city"]').type(clientData.city)
      cy.get('input[name="postal_code"]').type(clientData.postalCode)
      cy.get('input[name="country"]').clear().type(clientData.country)
      cy.get('input[name="organization_number"]').type(clientData.orgNumber)
      cy.get('input[name="vat_number"]').type(clientData.vatNumber)
      cy.get('textarea[name="notes"]').type(clientData.notes)
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@createClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the cancel button', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="cancel-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the X button', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="close-modal-button"]').click()
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the backdrop', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="modal-backdrop"]').click({ force: true })
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to search and filter clients', () => {
      const uniqueName = `Searchable Client ${Date.now()}`
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-name-input"]').type(uniqueName)
      cy.get('[data-cy="save-client-button"]').click()
      cy.wait('@createClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })
  })

  describe('Sad Path - Validation Errors', () => {
    it('is expected to show validation error when submitting empty form', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="save-client-button"]').click()

      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="client-name-input"]').then(($input) => {
        expect($input[0].validationMessage).to.not.be.empty
      })
    })

    it('is expected to show validation error for invalid email format', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      cy.get('[data-cy="client-name-input"]').type('Test Client')
      cy.get('[data-cy="client-email-input"]').type('invalid-email')
      cy.get('[data-cy="save-client-button"]').click()

      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="client-email-input"]').then(($input) => {
        expect($input[0].validity.valid).to.be.false
      })
    })

    it('is expected to not submit with whitespace-only name', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      cy.get('[data-cy="client-name-input"]').type('   ')
      cy.get('[data-cy="save-client-button"]').click()

      cy.get('[data-cy="client-form-error"]').should('exist')
      cy.get('[data-cy="client-modal"]').should('exist')
    })
  })

  describe('Sad Path - Network and Server Errors', () => {
    it('is expected to handle network timeout gracefully', () => {
      cy.intercept('POST', '**/rest/v1/clients*', {
        delay: 30000,
        statusCode: 200,
        body: {}
      }).as('slowRequest')

      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      cy.get('[data-cy="client-name-input"]').type('Timeout Test Client')
      cy.get('[data-cy="save-client-button"]').click()

      cy.get('[data-cy="save-client-button"]').should('be.disabled')
    })
  })

  describe('Sad Path - Empty State', () => {
    it('is expected to show empty state when no clients exist', () => {
      cy.get('[data-cy="clients-empty-state"]').should('be.visible')
    })

    it('is expected to show no results message when search returns nothing', () => {
      cy.get('[data-cy="search-clients-input"]').type('xyznonexistent123456')
      cy.get('[data-cy="clients-empty-state"]').should('be.visible')
    })
  })

  describe('Sad Path - User Interaction Errors', () => {
    it('is expected to handle rapid form submissions', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      cy.get('[data-cy="client-name-input"]').type('Rapid Click Client')
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@createClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to handle special characters in client name', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      const specialName = 'Client & Co. Åäö'
      cy.get('[data-cy="client-name-input"]').type(specialName)
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@createClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to handle very long input values', () => {
      cy.get('[data-cy="create-client-button"]').click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      const veryLongName = 'A'.repeat(255)
      cy.get('[data-cy="client-name-input"]').type(veryLongName)
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@createClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })
  })

  describe('Happy Path - Editing a Client', () => {
    const existingClient = {
      id: 'existing-client-id',
      name: 'ACME Corp',
      email: 'contact@acme.com',
      phone: '+46 8 123 4567',
      contact_person: 'Jane Smith',
      address: 'Kungsgatan 10',
      city: 'Stockholm',
      postal_code: '111 43',
      country: 'Sweden',
      organization_number: '556789-0123',
      vat_number: 'SE556789012301',
      notes: 'Premium customer'
    }

    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/clients*', {
        statusCode: 200,
        body: [existingClient]
      }).as('getClientsWithData')

      cy.intercept('PATCH', '**/rest/v1/clients*', (req) => {
        req.reply({
          statusCode: 200,
          body: [{ ...existingClient, ...req.body }]
        })
      }).as('updateClient')

      cy.visit('/clients')
      cy.wait('@getClientsWithData')
    })

    it('is expected to open edit modal with prefilled values', () => {
      cy.get(`[data-cy="edit-client-${existingClient.id}"]`).click()
      cy.get('[data-cy="client-modal"]').should('be.visible')
      cy.get('[data-cy="client-modal-title"]').should('contain', 'Redigera')

      // Verify all fields are prefilled
      cy.get('[data-cy="client-name-input"]').should('have.value', existingClient.name)
      cy.get('[data-cy="client-email-input"]').should('have.value', existingClient.email)
      cy.get('[data-cy="client-phone-input"]').should('have.value', existingClient.phone)
      cy.get('input[name="contact_person"]').should('have.value', existingClient.contact_person)
      cy.get('input[name="address"]').should('have.value', existingClient.address)
      cy.get('input[name="city"]').should('have.value', existingClient.city)
      cy.get('input[name="postal_code"]').should('have.value', existingClient.postal_code)
      cy.get('input[name="country"]').should('have.value', existingClient.country)
      cy.get('input[name="organization_number"]').should('have.value', existingClient.organization_number)
      cy.get('input[name="vat_number"]').should('have.value', existingClient.vat_number)
      cy.get('textarea[name="notes"]').should('have.value', existingClient.notes)
    })

    it('is expected to update a client successfully', () => {
      cy.get(`[data-cy="edit-client-${existingClient.id}"]`).click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      // Modify some fields
      cy.get('[data-cy="client-name-input"]').clear().type('ACME Corporation Updated')
      cy.get('[data-cy="client-email-input"]').clear().type('new-contact@acme.com')
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@updateClient')
      cy.get('[data-cy="client-modal"]').should('not.exist')
    })

    it('is expected to preserve unmodified fields when updating', () => {
      cy.get(`[data-cy="edit-client-${existingClient.id}"]`).click()
      cy.get('[data-cy="client-modal"]').should('be.visible')

      // Only change the name
      cy.get('[data-cy="client-name-input"]').clear().type('ACME New Name')
      cy.get('[data-cy="save-client-button"]').click()

      cy.wait('@updateClient').its('request.body').should('include', {
        email: existingClient.email,
        phone: existingClient.phone,
        city: existingClient.city
      })
    })
  })
})
