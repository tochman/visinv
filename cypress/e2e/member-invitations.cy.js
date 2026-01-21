/// <reference types="cypress" />

describe('Organization Member Invitations', () => {
  const mockOrganization = {
    id: 'test-org-id',
    name: 'Acme AB',
    organization_number: '556677-8899',
    vat_number: 'SE556677889901',
    address: 'Storgatan 1',
    city: 'Stockholm',
    postal_code: '11122',
    municipality: 'Stockholm',
    email: 'info@acme.se',
    phone: '+46 8 123 456',
    bank_giro: '123-4567',
    f_skatt_approved: true,
    invoice_number_prefix: 'INV',
    next_invoice_number: 1,
    default_payment_terms: 30,
    default_currency: 'SEK',
    default_tax_rate: 25,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  const mockMembers = [
    {
      id: 'member-1',
      organization_id: mockOrganization.id,
      user_id: 'user-owner',
      role: 'owner',
      joined_at: '2024-01-01T00:00:00.000Z',
      profiles: {
        id: 'user-owner',
        email: 'owner@acme.se',
        full_name: 'Anna Ägare',
        avatar_url: null
      }
    },
    {
      id: 'member-2',
      organization_id: mockOrganization.id,
      user_id: 'user-associate',
      role: 'associate',
      joined_at: '2024-01-15T00:00:00.000Z',
      profiles: {
        id: 'user-associate',
        email: 'associate@acme.se',
        full_name: 'Bengt Medarbetare',
        avatar_url: null
      }
    }
  ];

  // Helper to set up member-related intercepts (must be called AFTER login)
  const setupMemberIntercepts = (members = mockMembers, invitations = []) => {
    // Members endpoint - matches select with profiles
    cy.intercept('GET', '**/rest/v1/organization_members?*profiles*', {
      statusCode: 200,
      body: members
    }).as('getMembers')

    // Invitations endpoint
    cy.intercept('GET', '**/rest/v1/organization_invitations?*', {
      statusCode: 200,
      body: invitations
    }).as('getInvitations')
  }

  describe('Members Tab Display', () => {
    beforeEach(() => {
      // Login as owner
      cy.login('admin', { 
        customOrganization: { ...mockOrganization, role: 'owner' }
      })
      
      // Set up member intercepts AFTER login (to override the login's intercept)
      setupMemberIntercepts()
      
      cy.visit('/settings')
      cy.wait(500)
    })

    it('is expected to display tab navigation', () => {
      cy.get('[data-cy="tab-settings"]').should('be.visible')
      cy.get('[data-cy="tab-members"]').should('be.visible')
    })

    it('is expected to switch to members tab', () => {
      cy.get('[data-cy="tab-members"]').click()
      cy.wait('@getMembers')
      cy.get('[data-cy="member-row"]').should('exist')
    })

    it('is expected to display members list with names and roles', () => {
      cy.get('[data-cy="tab-members"]').click()
      cy.wait('@getMembers')
      
      cy.contains('Anna Ägare').should('be.visible')
      cy.contains('Bengt Medarbetare').should('be.visible')
    })

    it('is expected to show invite button for owners', () => {
      cy.get('[data-cy="tab-members"]').click()
      cy.wait('@getMembers')
      
      cy.get('[data-cy="invite-member-button"]').should('be.visible')
    })
  })

  describe('Invite Modal', () => {
    beforeEach(() => {
      cy.login('admin', { 
        customOrganization: { ...mockOrganization, role: 'owner' }
      })
      
      setupMemberIntercepts()
      
      cy.visit('/settings')
      cy.get('[data-cy="tab-members"]').click()
      cy.wait('@getMembers')
    })

    it('is expected to open invite modal when clicking invite button', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      
      cy.get('[data-cy="invite-email-input"]').should('be.visible')
      cy.get('[data-cy="invite-role-select"]').should('be.visible')
      cy.get('[data-cy="send-invitation-button"]').should('be.visible')
    })

    it('is expected to have associate as default role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      
      cy.get('[data-cy="invite-role-select"]').should('have.value', 'associate')
    })

    it('is expected to allow selecting owner role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      
      cy.get('[data-cy="invite-role-select"]').select('owner')
      cy.get('[data-cy="invite-role-select"]').should('have.value', 'owner')
    })

    it('is expected to close modal when clicking cancel', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').should('be.visible')
      
      // Click outside or cancel (the overlay)
      cy.get('.fixed.inset-0.transition-opacity').click({ force: true })
      
      cy.get('[data-cy="invite-email-input"]').should('not.exist')
    })
  })

  describe('Send Invitation', () => {
    beforeEach(() => {
      cy.login('admin', { 
        customOrganization: { ...mockOrganization, role: 'owner' }
      })
      
      setupMemberIntercepts()

      cy.intercept('POST', '**/rest/v1/organization_invitations*', (req) => {
        req.reply({
          statusCode: 201,
          body: {
            id: 'new-invitation-id',
            organization_id: mockOrganization.id,
            email: req.body.email,
            role: req.body.role,
            token: 'test-token-123',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          }
        })
      }).as('createInvitation')
      
      cy.visit('/settings')
      cy.get('[data-cy="tab-members"]').click()
      cy.wait('@getMembers')
    })

    it('is expected to send invitation with associate role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').type('newuser@example.com')
      cy.get('[data-cy="send-invitation-button"]').click()

      cy.wait('@createInvitation').then((interception) => {
        expect(interception.request.body).to.have.property('email', 'newuser@example.com')
        expect(interception.request.body).to.have.property('role', 'associate')
      })
    })

    it('is expected to send invitation with owner role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').type('admin@example.com')
      cy.get('[data-cy="invite-role-select"]').select('owner')
      cy.get('[data-cy="send-invitation-button"]').click()

      cy.wait('@createInvitation').then((interception) => {
        expect(interception.request.body).to.have.property('email', 'admin@example.com')
        expect(interception.request.body).to.have.property('role', 'owner')
      })
    })

    it('is expected to show success message after sending', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').type('newuser@example.com')
      cy.get('[data-cy="send-invitation-button"]').click()

      cy.wait('@createInvitation')
      cy.get('[data-cy="success-message"]').should('be.visible')
    })

    it('is expected to close modal after sending', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').type('newuser@example.com')
      cy.get('[data-cy="send-invitation-button"]').click()

      cy.wait('@createInvitation')
      cy.get('[data-cy="invite-email-input"]').should('not.exist')
    })
  })

  describe('Pending Invitations', () => {
    const mockPendingInvitation = {
      id: 'invitation-1',
      organization_id: mockOrganization.id,
      email: 'pending@example.com',
      role: 'associate',
      token: 'test-token',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    beforeEach(() => {
      cy.login('admin', { 
        customOrganization: { ...mockOrganization, role: 'owner' }
      })
      
      setupMemberIntercepts(mockMembers, [mockPendingInvitation])
      
      cy.visit('/settings')
      cy.get('[data-cy="tab-members"]').click()
      cy.wait(['@getMembers', '@getInvitations'])
    })

    it('is expected to display pending invitations section', () => {
      cy.get('[data-cy="invitation-row"]').should('be.visible')
      cy.contains('pending@example.com').should('be.visible')
    })

    it('is expected to show cancel button for pending invitations', () => {
      cy.get('[data-cy="cancel-invitation-button"]').should('be.visible')
    })

    it('is expected to cancel invitation when clicking cancel', () => {
      cy.intercept('DELETE', '**/rest/v1/organization_invitations?*', {
        statusCode: 204,
        body: null
      }).as('deleteInvitation')

      cy.get('[data-cy="cancel-invitation-button"]').click()
      
      cy.wait('@deleteInvitation')
    })
  })

  describe('Associate Role Permissions', () => {
    beforeEach(() => {
      // Login as associate (not owner)
      cy.login('admin', { 
        customOrganization: { ...mockOrganization, role: 'associate' }
      })
      
      setupMemberIntercepts()
      
      cy.visit('/settings')
      cy.get('[data-cy="tab-members"]').click()
      cy.wait('@getMembers')
    })

    it('is expected to NOT show invite button for associates', () => {
      cy.get('[data-cy="invite-member-button"]').should('not.exist')
    })

    it('is expected to NOT show role dropdown for associates', () => {
      cy.get('[data-cy="role-select"]').should('not.exist')
    })

    it('is expected to NOT show remove button for associates', () => {
      cy.get('[data-cy="remove-member-button"]').should('not.exist')
    })
  })
})
