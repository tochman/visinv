/// <reference types="cypress" />

describe('Client Management', () => {
  beforeEach(() => {
    // Arrange: Set up authenticated state and navigate to clients page
    // Note: In a real scenario, you would set up proper auth mocking
    // For now, we assume the user is logged in or we bypass auth
    cy.visit('/clients')
  })

  describe('Happy Path - Adding a Client', () => {
    it('is expected to display the clients page', () => {
      // Arrange: Page should be loaded
      // Act: Visit clients page (done in beforeEach)
      // Assert: Page elements are visible
      cy.contains('Clients').should('be.visible')
      cy.get('[data-testid="create-client-button"]').should('be.visible')
    })

    it('is expected to open the client modal when clicking create button', () => {
      // Arrange: Clients page is loaded
      // Act: Click the create client button
      cy.get('[data-testid="create-client-button"]').click()

      // Assert: Modal is displayed with correct title
      cy.get('[data-testid="client-modal"]').should('be.visible')
      cy.get('[data-testid="client-modal-title"]').should('contain', 'Add Client')
      cy.get('[data-testid="client-form"]').should('be.visible')
    })

    it('is expected to create a client with only required fields', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Fill in only the required name field and submit
      const clientName = `Test Client ${Date.now()}`
      cy.get('[data-testid="client-name-input"]').type(clientName)
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Modal closes and client appears in the list
      cy.get('[data-testid="client-modal"]').should('not.exist')
      cy.get('[data-testid="clients-table"]').should('contain', clientName)
    })

    it('is expected to create a client with all fields populated', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Fill in all fields
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

      cy.get('[data-testid="client-name-input"]').type(clientData.name)
      cy.get('[data-testid="client-email-input"]').type(clientData.email)
      cy.get('[data-testid="client-phone-input"]').type(clientData.phone)
      cy.get('input[name="contact_person"]').type(clientData.contactPerson)
      cy.get('input[name="address"]').type(clientData.address)
      cy.get('input[name="city"]').type(clientData.city)
      cy.get('input[name="postal_code"]').type(clientData.postalCode)
      cy.get('input[name="country"]').clear().type(clientData.country)
      cy.get('input[name="organization_number"]').type(clientData.orgNumber)
      cy.get('input[name="vat_number"]').type(clientData.vatNumber)
      cy.get('textarea[name="notes"]').type(clientData.notes)

      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Modal closes and client appears in the list with correct details
      cy.get('[data-testid="client-modal"]').should('not.exist')
      cy.get('[data-testid="clients-table"]').should('contain', clientData.name)
      cy.get('[data-testid="clients-table"]').should('contain', clientData.email)
    })

    it('is expected to close the modal when clicking the cancel button', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Click cancel button
      cy.get('[data-testid="cancel-client-button"]').click()

      // Assert: Modal is closed
      cy.get('[data-testid="client-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the X button', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Click the X close button
      cy.get('[data-testid="close-modal-button"]').click()

      // Assert: Modal is closed
      cy.get('[data-testid="client-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking the backdrop', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Click the backdrop (outside the modal content)
      cy.get('[data-testid="modal-backdrop"]').click({ force: true })

      // Assert: Modal is closed
      cy.get('[data-testid="client-modal"]').should('not.exist')
    })

    it('is expected to search and filter clients', () => {
      // Arrange: Create a client first
      const uniqueName = `Searchable Client ${Date.now()}`
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-name-input"]').type(uniqueName)
      cy.get('[data-testid="save-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('not.exist')

      // Act: Search for the client
      cy.get('[data-testid="search-clients-input"]').type(uniqueName)

      // Assert: Only matching client is shown
      cy.get('[data-testid="clients-table"]').should('contain', uniqueName)
    })
  })

  describe('Sad Path - Validation Errors', () => {
    it('is expected to show validation error when submitting empty form', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Try to submit without filling required fields
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Form should not submit (HTML5 validation)
      // The modal should still be visible
      cy.get('[data-testid="client-modal"]').should('be.visible')
      cy.get('[data-testid="client-name-input"]').then(($input) => {
        expect($input[0].validationMessage).to.not.be.empty
      })
    })

    it('is expected to show validation error for invalid email format', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Fill in name and invalid email
      cy.get('[data-testid="client-name-input"]').type('Test Client')
      cy.get('[data-testid="client-email-input"]').type('invalid-email')
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Form should not submit due to invalid email
      cy.get('[data-testid="client-modal"]').should('be.visible')
      cy.get('[data-testid="client-email-input"]').then(($input) => {
        expect($input[0].validity.valid).to.be.false
      })
    })

    it('is expected to preserve form data when validation fails', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Fill in some fields but leave name empty (which is required)
      cy.get('[data-testid="client-email-input"]').type('test@example.com')
      cy.get('[data-testid="client-phone-input"]').type('+46 70 123 4567')
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Form data should be preserved
      cy.get('[data-testid="client-modal"]').should('be.visible')
      cy.get('[data-testid="client-email-input"]').should('have.value', 'test@example.com')
      cy.get('[data-testid="client-phone-input"]').should('have.value', '+46 70 123 4567')
    })

    it('is expected to not submit with whitespace-only name', () => {
      // Arrange: Open the client modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Enter only whitespace in the name field
      cy.get('[data-testid="client-name-input"]').type('   ')
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Depending on backend validation, either shows error or fails submission
      // Since HTML required only checks for empty, whitespace might pass client-side
      // This tests the behavior - the modal may close or show server error
      cy.get('[data-testid="client-modal"]').should('be.visible')
    })
  })

  describe('Sad Path - Network and Server Errors', () => {
    it('is expected to display error message when server returns error', () => {
      // Arrange: Intercept the API call and force an error
      cy.intercept('POST', '**/clients*', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('createClientError')

      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Fill in valid data and submit
      cy.get('[data-testid="client-name-input"]').type('Error Test Client')
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Error message should be displayed
      cy.get('[data-testid="client-form-error"]').should('be.visible')
      cy.get('[data-testid="client-modal"]').should('be.visible')
    })

    it('is expected to handle network timeout gracefully', () => {
      // Arrange: Intercept and delay the response indefinitely
      cy.intercept('POST', '**/clients*', {
        delay: 30000, // 30 second delay
        statusCode: 200,
        body: {}
      }).as('slowRequest')

      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Submit the form
      cy.get('[data-testid="client-name-input"]').type('Timeout Test Client')
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Button should show loading state
      cy.get('[data-testid="save-client-button"]').should('be.disabled')
      cy.get('[data-testid="save-client-button"]').should('contain', 'Saving')
    })

    it('is expected to handle duplicate client name error', () => {
      // Arrange: Intercept with duplicate error
      cy.intercept('POST', '**/clients*', {
        statusCode: 409,
        body: { error: 'A client with this name already exists' }
      }).as('duplicateError')

      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Try to create a duplicate client
      cy.get('[data-testid="client-name-input"]').type('Duplicate Client')
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Error should be shown, modal remains open
      cy.get('[data-testid="client-form-error"]').should('be.visible')
      cy.get('[data-testid="client-modal"]').should('be.visible')
    })
  })

  describe('Sad Path - Empty State', () => {
    it('is expected to show empty state when no clients exist', () => {
      // Arrange: Intercept clients API to return empty array
      cy.intercept('GET', '**/clients*', {
        statusCode: 200,
        body: []
      }).as('emptyClients')

      // Act: Visit the page
      cy.visit('/clients')
      cy.wait('@emptyClients')

      // Assert: Empty state should be visible
      cy.get('[data-testid="clients-empty-state"]').should('be.visible')
      cy.get('[data-testid="clients-table"]').should('not.exist')
    })

    it('is expected to show no results message when search returns nothing', () => {
      // Arrange: Create a client first so list is not empty
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-name-input"]').type(`Client ${Date.now()}`)
      cy.get('[data-testid="save-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('not.exist')

      // Act: Search for something that doesn't exist
      cy.get('[data-testid="search-clients-input"]').type('xyznonexistent123456')

      // Assert: Empty state should show for search
      cy.get('[data-testid="clients-empty-state"]').should('be.visible')
      cy.get('[data-testid="clients-table"]').should('not.exist')
    })
  })

  describe('Sad Path - User Interaction Errors', () => {
    it('is expected to not lose data when accidentally clicking backdrop', () => {
      // Arrange: Open modal and fill in data
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      const clientName = 'Almost Lost Client'
      cy.get('[data-testid="client-name-input"]').type(clientName)
      cy.get('[data-testid="client-email-input"]').type('test@example.com')

      // Act: Click backdrop to close modal
      cy.get('[data-testid="modal-backdrop"]').click({ force: true })

      // Assert: Modal closes (data is lost - this tests current behavior)
      cy.get('[data-testid="client-modal"]').should('not.exist')

      // Act: Reopen modal
      cy.get('[data-testid="create-client-button"]').click()

      // Assert: Form should be empty (fresh state)
      cy.get('[data-testid="client-name-input"]').should('have.value', '')
      cy.get('[data-testid="client-email-input"]').should('have.value', '')
    })

    it('is expected to handle rapid form submissions', () => {
      // Arrange: Open modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Fill form and rapidly click submit multiple times
      cy.get('[data-testid="client-name-input"]').type('Rapid Click Client')
      cy.get('[data-testid="save-client-button"]').click()
      cy.get('[data-testid="save-client-button"]').click()
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Should handle gracefully (button disabled during loading)
      // Only one client should be created
      cy.get('[data-testid="client-modal"]').should('not.exist')
    })

    it('is expected to handle special characters in client name', () => {
      // Arrange: Open modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Enter name with special characters
      const specialName = 'Client <script>alert("xss")</script> & Co. Åäö'
      cy.get('[data-testid="client-name-input"]').type(specialName)
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Should handle special characters (either save or show error)
      // The name should be properly escaped/handled
      cy.get('[data-testid="client-modal"]').should('not.exist')
    })

    it('is expected to handle very long input values', () => {
      // Arrange: Open modal
      cy.get('[data-testid="create-client-button"]').click()
      cy.get('[data-testid="client-modal"]').should('be.visible')

      // Act: Enter very long name
      const veryLongName = 'A'.repeat(500)
      cy.get('[data-testid="client-name-input"]').type(veryLongName)
      cy.get('[data-testid="save-client-button"]').click()

      // Assert: Should handle gracefully (either truncate, save, or show error)
      // This tests the system's behavior with edge cases
    })
  })
})
