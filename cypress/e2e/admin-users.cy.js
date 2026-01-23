/// <reference types="cypress" />

describe('Admin Users Management', () => {
  const users = [
    { id: 'u-1', email: 'alice@example.com', full_name: 'Alice Andersson', plan_type: 'free', created_at: '2025-12-01T10:00:00Z', updated_at: '2026-01-15T10:00:00Z' },
    { id: 'u-2', email: 'bob@example.com', full_name: 'Bob Berg', plan_type: 'premium', created_at: '2025-11-10T10:00:00Z', updated_at: '2026-01-12T10:00:00Z' },
    { id: 'u-3', email: 'charlie@example.com', full_name: 'Charlie Chen', plan_type: 'free', created_at: '2025-10-05T10:00:00Z', updated_at: '2026-01-10T10:00:00Z' },
  ]

  beforeEach(() => {
    cy.login('admin')
  })

  // Helper to set up intercepts AFTER login
  const setupAdminIntercepts = () => {
    // Prevent wizard and noise
    cy.intercept('GET', '**/rest/v1/organizations*', { statusCode: 200, body: [{ id: 'org-1', name: 'Test Org' }] }).as('getOrganizations')
    cy.intercept('GET', '**/rest/v1/organization_members*', { statusCode: 200, body: [{ organization_id: 'org-1', user_id: 'test-admin-user-id', role: 'owner' }] }).as('getOrgMembers')
    cy.intercept('GET', '**/rest/v1/invoices*', { statusCode: 200, body: [] }).as('getInvoices')

    // Users list - match the actual query from User.index()
    cy.intercept('GET', '**/rest/v1/profiles?select=id%2Cemail%2Cfull_name%2Cis_admin%2Ccreated_at%2Cupdated_at*', (req) => {
      req.reply({ statusCode: 200, body: users })
    }).as('getUsers')

    // Subscriptions for plan_type
    cy.intercept('GET', '**/rest/v1/subscriptions?select=user_id%2Cplan_type', (req) => {
      req.reply({ 
        statusCode: 200, 
        body: [
          { user_id: 'u-1', plan_type: 'free' },
          { user_id: 'u-2', plan_type: 'premium' },
          { user_id: 'u-3', plan_type: 'free' }
        ]
      })
    }).as('getSubscriptions')
  }

  context('US-037: User Management - List & Search', () => {
    it('is expected to show users and filter by search', () => {
      setupAdminIntercepts()
      cy.visit('/admin/users')
      cy.wait('@getUsers')
      cy.get('[data-cy="admin-users-page"]').should('be.visible')

      // Table rows
      users.forEach(u => {
        cy.get(`[data-cy="user-row-${u.id}"]`).should('exist')
        cy.get(`[data-cy="user-email-${u.id}"]`).should('contain', u.email)
        cy.get(`[data-cy="user-name-${u.id}"]`).should('contain', u.full_name)
        cy.get(`[data-cy="user-plan-${u.id}"]`).should('contain', u.plan_type)
      })

      // Search by name
      cy.get('[data-cy="search-users"]').type('Bob')
      cy.get('[data-cy="user-row-u-2"]').should('exist')
      cy.get('[data-cy="user-row-u-1"]').should('not.exist')
      cy.get('[data-cy="user-row-u-3"]').should('not.exist')

      // Clear and search by email
      cy.get('[data-cy="search-users"]').clear().type('charlie@')
      cy.get('[data-cy="user-row-u-3"]').should('exist')
      cy.get('[data-cy="user-row-u-1"]').should('not.exist')
      cy.get('[data-cy="user-row-u-2"]').should('not.exist')
    })
  })

  context('US-037-A: User Profile Administration', () => {
    it('is expected to edit user profile details', () => {
      setupAdminIntercepts()
      cy.visit('/admin/users')
      cy.wait('@getUsers')
      cy.get('[data-cy="admin-users-page"]').should('be.visible')

      // Open edit modal for Alice
      cy.get('[data-cy="edit-user-u-1"]').click()
      cy.get('[data-cy="edit-user-modal"]').should('be.visible')

      // Update fields
      cy.get('[data-cy="edit-full-name"]').clear().type('Alice A.')
      cy.get('[data-cy="edit-email"]').clear().type('alice+new@example.com')
      cy.get('[data-cy="edit-plan"]').select('premium')

      // Mock profile update request
      cy.intercept('PATCH', '**/rest/v1/profiles*', (req) => {
        req.reply({ statusCode: 204 }) // Supabase returns 204 for successful PATCH without select
      }).as('updateProfile')

      // Mock subscription update request
      cy.intercept('PATCH', '**/rest/v1/subscriptions*', (req) => {
        req.reply({ statusCode: 204 })
      }).as('updateSubscription')

      // Mock profile fetch after update (with .eq() and .single())
      cy.intercept('GET', '**/rest/v1/profiles?select=id%2Cemail%2Cfull_name%2Cis_admin%2Ccreated_at%2Cupdated_at&id=eq.u-1*', (req) => {
        req.reply({ 
          statusCode: 200, 
          body: { 
            id: 'u-1', 
            email: 'alice+new@example.com', 
            full_name: 'Alice A.',
            is_admin: false, 
            created_at: '2025-12-01T10:00:00Z', 
            updated_at: new Date().toISOString() 
          }
        })
      }).as('getUpdatedUser')

      // Mock subscription fetch after update
      cy.intercept('GET', '**/rest/v1/subscriptions?select=plan_type&user_id=eq.u-1*', (req) => {
        req.reply({ 
          statusCode: 200, 
          body: { user_id: 'u-1', plan_type: 'premium' }
        })
      }).as('getUpdatedSubscription')

      cy.get('[data-cy="save-edit"]').click()
      cy.wait('@updateProfile')
      cy.wait('@updateSubscription')
      cy.wait('@getUpdatedUser')
      cy.wait('@getUpdatedSubscription')

      // Verify row updated
      cy.get('[data-cy="user-row-u-1"]').within(() => {
        cy.get('[data-cy^="user-email-"]').should('contain', 'alice+new@example.com')
        cy.get('[data-cy^="user-name-"]').should('contain', 'Alice A.')
        cy.get('[data-cy^="user-plan-"]').should('contain', 'premium')
      })
    })
  })
})
