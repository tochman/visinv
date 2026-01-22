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
      
      cy.get('[data-cy="invite-email-input"]').should('exist')
      cy.get('[data-cy="invite-role-select"]').should('exist')
      cy.get('[data-cy="send-invitation-button"]').should('exist')
    })

    it('is expected to have associate as default role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      
      cy.get('[data-cy="invite-role-select"]').should('have.value', 'associate')
    })

    it('is expected to allow selecting owner role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      
      cy.get('[data-cy="invite-role-select"]').select('owner', { force: true })
      cy.get('[data-cy="invite-role-select"]').should('have.value', 'owner')
    })

    it('is expected to close modal when clicking cancel', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').should('exist')
      
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
      cy.get('[data-cy="invite-email-input"]').type('newuser@example.com', { force: true })
      cy.get('[data-cy="send-invitation-button"]').click({ force: true })

      cy.wait('@createInvitation').then((interception) => {
        expect(interception.request.body[0]).to.have.property('email', 'newuser@example.com')
        expect(interception.request.body[0]).to.have.property('role', 'associate')
      })
    })

    it('is expected to send invitation with owner role', () => {
      cy.get('[data-cy="invite-member-button"]').click()
      cy.get('[data-cy="invite-email-input"]').type('admin@example.com')
      cy.get('[data-cy="invite-role-select"]').select('owner')
      cy.get('[data-cy="send-invitation-button"]').click()

      cy.wait('@createInvitation').then((interception) => {
        expect(interception.request.body[0]).to.have.property('email', 'admin@example.com')
        expect(interception.request.body[0]).to.have.property('role', 'owner')
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

  describe('Accept Invitation Page', () => {
    const validToken = 'valid-invitation-token-123'
    const expiredToken = 'expired-token-456'
    const invitedEmail = 'invited@example.com'

    const mockInvitation = {
      id: 'invitation-id-1',
      organization_id: mockOrganization.id,
      email: invitedEmail,
      role: 'associate',
      token: validToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      organizations: {
        id: mockOrganization.id,
        name: mockOrganization.name
      }
    }

    const mockOwnerInvitation = {
      ...mockInvitation,
      role: 'owner'
    }

    describe('Valid Invitation - Unauthenticated User', () => {
      beforeEach(() => {
        // Clear any existing session
        cy.clearLocalStorage()
        cy.clearCookies()

        // Intercept auth endpoints to simulate no user
        cy.intercept('GET', '**/auth/v1/user', {
          statusCode: 401,
          body: { error: 'not authenticated' }
        }).as('getUser')

        cy.intercept('POST', '**/auth/v1/token*', {
          statusCode: 401,
          body: { error: 'not authenticated' }
        }).as('refreshToken')

        // Intercept the invitation lookup
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
          statusCode: 200,
          body: mockInvitation
        }).as('getInvitation')

        // Set language to English
        cy.visit(`/invite/${validToken}`, {
          onBeforeLoad(win) {
            win.localStorage.setItem('language', 'en')
          }
        })
      })

      it('is expected to display invitation details', () => {
        cy.wait('@getInvitation')
        cy.contains(mockOrganization.name).should('be.visible')
        cy.contains(invitedEmail).should('be.visible')
      })

      it('is expected to show sign in and sign up links for unauthenticated users', () => {
        cy.wait('@getInvitation')
        cy.get('a[href*="/auth/signin"]').should('be.visible')
        cy.get('a[href*="/auth/signup"]').should('be.visible')
      })

      it('is expected to redirect sign in link with return URL', () => {
        cy.wait('@getInvitation')
        cy.get('a[href*="/auth/signin"]')
          .should('have.attr', 'href')
          .and('include', `/auth/signin?redirect=/invite/${validToken}`)
      })

      it('is expected to redirect sign up link with return URL', () => {
        cy.wait('@getInvitation')
        cy.get('a[href*="/auth/signup"]')
          .should('have.attr', 'href')
          .and('include', `/auth/signup?redirect=/invite/${validToken}`)
      })

      it('is expected to display the invited role badge', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="invitation-role"]').should('be.visible')
      })
    })

    describe('Valid Invitation - Owner Role', () => {
      beforeEach(() => {
        cy.clearLocalStorage()
        cy.clearCookies()

        cy.intercept('GET', '**/auth/v1/user', {
          statusCode: 401,
          body: { error: 'not authenticated' }
        }).as('getUser')

        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
          statusCode: 200,
          body: mockOwnerInvitation
        }).as('getInvitation')

        cy.visit(`/invite/${validToken}`, {
          onBeforeLoad(win) {
            win.localStorage.setItem('language', 'en')
          }
        })
      })

      it('is expected to display owner role badge with purple styling', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="invitation-role"]')
          .should('be.visible')
          .and('have.class', 'bg-purple-100')
      })
    })

    describe('Valid Invitation - Authenticated User with Matching Email', () => {
      beforeEach(() => {
        // First set up invitation intercept
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
          statusCode: 200,
          body: mockInvitation
        }).as('getInvitation')

        // Login as user with matching email
        cy.login('user', { 
          customOrganization: mockOrganization 
        })

        // Override the user's email to match the invitation
        cy.window().then((win) => {
          const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`
          const sessionData = JSON.parse(win.localStorage.getItem(storageKey))
          sessionData.user.email = invitedEmail
          win.localStorage.setItem(storageKey, JSON.stringify(sessionData))
        })

        // Visit invite page
        cy.visit(`/invite/${validToken}`)
      })

      it('is expected to show accept button for authenticated user', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="accept-invitation-button"]').should('be.visible')
      })

      it('is expected to NOT show email mismatch warning', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="email-mismatch-warning"]').should('not.exist')
      })
    })

    describe('Valid Invitation - Authenticated User with Different Email', () => {
      beforeEach(() => {
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
          statusCode: 200,
          body: mockInvitation
        }).as('getInvitation')

        // Login as user with different email
        cy.login('admin', { 
          customOrganization: mockOrganization 
        })

        cy.visit(`/invite/${validToken}`)
      })

      it('is expected to show email mismatch warning', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="email-mismatch-warning"]').should('be.visible')
        cy.contains(invitedEmail).should('be.visible')
      })

      it('is expected to disable accept button when emails do not match', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="accept-invitation-button"]').should('be.disabled')
      })
    })

    describe('Accept Invitation Flow', () => {
      beforeEach(() => {
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
          statusCode: 200,
          body: mockInvitation
        }).as('getInvitation')

        // Mock the accept flow - adding member
        cy.intercept('POST', '**/rest/v1/organization_members*', (req) => {
          req.reply({
            statusCode: 201,
            body: [{
              id: 'new-member-id',
              organization_id: mockOrganization.id,
              user_id: 'test-user-id',
              role: mockInvitation.role,
              joined_at: new Date().toISOString()
            }]
          })
        }).as('addMember')

        // Mock deleting the invitation after acceptance
        cy.intercept('DELETE', '**/rest/v1/organization_invitations?*', {
          statusCode: 204,
          body: null
        }).as('deleteInvitation')

        // Login as user with matching email
        cy.login('user', { 
          customOrganization: null,
          skipOrgMock: true
        })

        // Set user email to match invitation
        cy.window().then((win) => {
          const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`
          const sessionData = JSON.parse(win.localStorage.getItem(storageKey))
          sessionData.user.email = invitedEmail
          win.localStorage.setItem(storageKey, JSON.stringify(sessionData))
        })

        // Re-mock auth user endpoint with matching email
        cy.intercept('GET', '**/auth/v1/user', {
          statusCode: 200,
          body: {
            id: 'test-regular-user-id',
            email: invitedEmail,
            user_metadata: { full_name: 'Invited User' }
          }
        }).as('getAuthUser')

        cy.visit(`/invite/${validToken}`)
      })

      it('is expected to show success state after accepting invitation', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="accept-invitation-button"]').click()

        cy.wait('@addMember')
        cy.get('[data-cy="invitation-accepted"]').should('be.visible')
        cy.contains('Welcome').should('be.visible')
      })

      it('is expected to delete invitation after successful acceptance', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="accept-invitation-button"]').click()

        cy.wait('@addMember')
        cy.wait('@deleteInvitation')
      })

      it('is expected to show loading state while accepting', () => {
        cy.wait('@getInvitation')
        
        // Delay the response to see loading state
        cy.intercept('POST', '**/rest/v1/organization_members*', (req) => {
          req.on('response', (res) => {
            res.setDelay(500)
          })
          req.reply({
            statusCode: 201,
            body: [{
              id: 'new-member-id',
              organization_id: mockOrganization.id,
              user_id: 'test-user-id',
              role: mockInvitation.role,
              joined_at: new Date().toISOString()
            }]
          })
        }).as('addMemberDelayed')

        cy.get('[data-cy="accept-invitation-button"]').click()
        cy.get('[data-cy="accept-invitation-button"]').should('be.disabled')
      })
    })

    describe('Accept Invitation Error Handling', () => {
      beforeEach(() => {
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, {
          statusCode: 200,
          body: mockInvitation
        }).as('getInvitation')

        // Mock error response when trying to add member
        cy.intercept('POST', '**/rest/v1/organization_members*', {
          statusCode: 400,
          body: { message: 'User is already a member of this organization.' }
        }).as('addMemberError')

        // Login as user with matching email
        cy.login('user', { skipOrgMock: true })

        cy.window().then((win) => {
          const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`
          const sessionData = JSON.parse(win.localStorage.getItem(storageKey))
          sessionData.user.email = invitedEmail
          win.localStorage.setItem(storageKey, JSON.stringify(sessionData))
        })

        cy.intercept('GET', '**/auth/v1/user', {
          statusCode: 200,
          body: {
            id: 'test-regular-user-id',
            email: invitedEmail,
            user_metadata: { full_name: 'Invited User' }
          }
        }).as('getAuthUser')

        cy.visit(`/invite/${validToken}`)
      })

      it('is expected to display error message when acceptance fails', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="accept-invitation-button"]').click()

        cy.wait('@addMemberError')
        cy.get('[data-cy="error-message"]').should('be.visible')
      })

      it('is expected to re-enable accept button after error', () => {
        cy.wait('@getInvitation')
        cy.get('[data-cy="accept-invitation-button"]').click()

        cy.wait('@addMemberError')
        cy.get('[data-cy="accept-invitation-button"]').should('not.be.disabled')
      })
    })

    describe('Invalid/Expired Invitation', () => {
      beforeEach(() => {
        // Clear auth state to prevent login redirects
        cy.clearLocalStorage()
        cy.clearCookies()

        cy.intercept('GET', '**/auth/v1/user', {
          statusCode: 401,
          body: { error: 'not authenticated' }
        }).as('getUser')
      })

      it('is expected to show error for invalid token', () => {
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.invalid-token*`, {
          statusCode: 200,
          body: null
        }).as('getInvalidInvitation')

        cy.visit('/invite/invalid-token', {
          onBeforeLoad(win) {
            win.localStorage.setItem('language', 'en')
          }
        })
        cy.wait('@getInvalidInvitation')

        cy.get('[data-cy="invitation-error"]').should('be.visible')
      })

      it('is expected to show error for expired invitation', () => {
        const expiredInvitation = {
          ...mockInvitation,
          token: expiredToken,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // expired yesterday
        }

        // Supabase will return empty for expired (gt filter fails)
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${expiredToken}*`, {
          statusCode: 200,
          body: null
        }).as('getExpiredInvitation')

        cy.visit(`/invite/${expiredToken}`, {
          onBeforeLoad(win) {
            win.localStorage.setItem('language', 'en')
          }
        })
        cy.wait('@getExpiredInvitation')

        cy.get('[data-cy="invitation-error"]').should('be.visible')
      })

      it('is expected to show back link on error page', () => {
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.invalid-token*`, {
          statusCode: 200,
          body: null
        }).as('getInvalidInvitation')

        cy.visit('/invite/invalid-token', {
          onBeforeLoad(win) {
            win.localStorage.setItem('language', 'en')
          }
        })
        cy.wait('@getInvalidInvitation')

        cy.get('[data-cy="invitation-error"]').find('a[href="/"]').should('be.visible')
      })
    })

    describe('Loading State', () => {
      it('is expected to show loading indicator while fetching invitation', () => {
        cy.intercept('GET', `**/rest/v1/organization_invitations?*token=eq.${validToken}*`, (req) => {
          req.on('response', (res) => {
            res.setDelay(1000)
          })
          req.reply({
            statusCode: 200,
            body: mockInvitation
          })
        }).as('getInvitationDelayed')

        cy.visit(`/invite/${validToken}`)
        cy.get('[data-cy="loading-indicator"]').should('be.visible')
      })
    })
  })
})
