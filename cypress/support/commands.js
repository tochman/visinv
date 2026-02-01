/// <reference types="cypress" />

const users = {
  admin: {
    id: 'test-admin-user-id',
    email: 'admin@test.com',
    user_metadata: { full_name: 'Admin User' },
    profile: { id: 'test-admin-user-id', email: 'admin@test.com', is_admin: true, plan_type: 'premium', full_name: 'Admin User', proficiency_level: 'expert' }
  },
  user: {
    id: 'test-regular-user-id',
    email: 'user@test.com',
    user_metadata: { full_name: 'Regular User' },
    profile: { id: 'test-regular-user-id', email: 'user@test.com', is_admin: false, plan_type: 'free', full_name: 'Regular User', proficiency_level: 'basic' }
  },
  premiumUser: {
    id: 'test-premium-user-id',
    email: 'premium@test.com',
    user_metadata: { full_name: 'Premium User' },
    profile: { id: 'test-premium-user-id', email: 'premium@test.com', is_admin: false, plan_type: 'premium', full_name: 'Premium User', proficiency_level: 'proficient' }
  },
  premiumUserWithOrganization: {
    id: 'test-premium-org-user-id',
    email: 'premium-org@test.com',
    user_metadata: { full_name: 'Premium Org User' },
    profile: { id: 'test-premium-org-user-id', email: 'premium-org@test.com', is_admin: false, plan_type: 'premium', full_name: 'Premium Org User', proficiency_level: 'proficient' },
    organization: {
      id: 'test-premium-org-id',
      name: 'Test Premium Organization AB',
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
      email_slug: 'test_premium_organization_ab'
    }
  },
  visitor: null
}

Cypress.Commands.add('login', (userType = 'user', options = {}) => {
  const userData = users[userType]
  if (userData === undefined) {
    throw new Error(`Unknown user type: ${userType}. Use: admin, user, premiumUser, or visitor`)
  }

  if (!userData) {
    cy.visit('/')
    return
  }

  const mockSession = {
    access_token: 'test-access-token-' + userData.id,
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userData.id,
      email: userData.email,
      user_metadata: userData.user_metadata,
      aud: 'authenticated',
      role: 'authenticated'
    }
  }

  // Intercept all auth endpoints
  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: mockSession.user
  }).as('getUser')

  cy.intercept('GET', '**/auth/v1/token?*', {
    statusCode: 200,
    body: mockSession
  }).as('getToken')

  cy.intercept('POST', '**/auth/v1/token*', {
    statusCode: 200,
    body: mockSession
  }).as('refreshToken')

  // Intercept the session endpoint that Supabase client uses
  cy.intercept('GET', '**/auth/v1/session*', {
    statusCode: 200,
    body: {
      data: {
        session: mockSession
      },
      error: null
    }
  }).as('getSession')

  cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
    // When .single() is used, Supabase adds specific headers
    // Return single object directly, not array
    req.reply({
      statusCode: 200,
      body: userData.profile
    })
  }).as('getProfile')

  // Mock subscriptions for premium access
  const isPremium = userData.profile.plan_type === 'premium' || userData.profile.is_admin;
  cy.intercept('GET', '**/rest/v1/subscriptions*', {
    statusCode: 200,
    body: isPremium ? {
      id: 'test-subscription-id',
      user_id: userData.id,
      status: 'active',
      plan_type: 'premium',
      stripe_subscription_id: 'sub_test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null
  }).as('getSubscription')

  // Mock organization data - can be overridden by passing customOrganization in options
  if (!options.skipOrgMock) {
    const defaultOrganization = {
      id: 'test-org-id',
      name: 'Test Organization',
      organization_number: '',
      vat_number: '',
      municipality: '',
      address: '',
      city: '',
      postal_code: '',
      email: '',
      email_slug: 'test_organization',
      created_by: userData.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Use organization from user data if available (e.g., premiumUserWithOrganization)
    const organizationToUse = options.customOrganization || userData.organization || defaultOrganization
    const roleToUse = options.customOrganization?.role || 'owner'

    const orgMemberData = {
      id: 'test-org-member-id',
      user_id: userData.id,
      organization_id: organizationToUse.id,
      role: roleToUse,
      is_default: true,
      joined_at: new Date().toISOString(),
      organizations: organizationToUse
    }

    // Intercept for Organization.getDefault() which uses .single() - needs single object response
    cy.intercept('GET', '**/rest/v1/organization_members?*is_default=eq.true*', {
      statusCode: 200,
      body: orgMemberData
    }).as('getDefaultOrg')

    // Intercept for general organization_members queries (returns array)
    cy.intercept('GET', '**/rest/v1/organization_members*', (req) => {
      // Skip if this is the is_default query (already handled above)
      if (req.url.includes('is_default=eq.true')) {
        return
      }
      req.reply({
        statusCode: 200,
        body: [orgMemberData]
      })
    }).as('getOrganizations')
    
    // Store organization to dispatch it after page load
    cy.wrap(organizationToUse).as('organizationToDispatch')
  }

  cy.visit('/', {
    onBeforeLoad(win) {
      const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`
      win.localStorage.setItem(storageKey, JSON.stringify(mockSession))
      win.localStorage.setItem('language', 'en')
      // Set cookie consent to prevent banner from blocking UI
      win.localStorage.setItem('visinv_cookie_consent', JSON.stringify({
        essential: true,
        analytics: false,
        marketing: false,
        preferences: false,
        timestamp: Date.now()
      }))
      // Set nav sections to expanded by default for tests
      win.localStorage.setItem('nav-section-invoicing', 'true')
      win.localStorage.setItem('nav-section-accounting', 'true')
      win.localStorage.setItem('nav-section-administration', 'true')
      
      //  Hook into Redux store when it's created
      const originalConfigureStore = win.Object.getOwnPropertyDescriptor(win, 'store');
      Object.defineProperty(win, 'store', {
        configurable: true,
        get() {
          return this._store;
        },
        set(store) {
          this._store = store;
          // Immediately dispatch auth state when store is set
          if (store && !this._authDispatched) {
            this._authDispatched = true;
            store.dispatch({
              type: 'auth/checkSession/fulfilled',
              payload: {
                session: mockSession,
                profile: userData.profile
              }
            });
          }
        }
      });
    }
  })

  // Wait for Redux store to be available with a retry mechanism
  cy.window({ timeout: 15000 }).should('have.property', 'store')
  
  //  Dispatch the authenticated user state immediately after store is ready
  cy.window().its('store').then((store) => {
    // Log current auth state before dispatch
    const authBefore = store.getState().auth
    cy.log('Auth before:', `initialized=${authBefore.initialized}, loading=${authBefore.loading}, isAuthenticated=${authBefore.isAuthenticated}`)
    
    // Use checkSession fulfilled action to properly set all auth state
    store.dispatch({
      type: 'auth/checkSession/fulfilled',
      payload: {
        session: mockSession,
        profile: userData.profile
      }
    })
    
    // Log auth state after dispatch
    const authAfter = store.getState().auth
    cy.log('Auth after:', `initialized=${authAfter.initialized}, loading=${authAfter.loading}, isAuthenticated=${authAfter.isAuthenticated}`)
    
    // Verify critical flags are set
    if (!authAfter.initialized) {
      throw new Error('CRITICAL: initialized is still false after dispatch!')
    }
    if (authAfter.loading) {
      throw new Error('CRITICAL: loading is still true after dispatch!')
    }
    if (!authAfter.isAuthenticated) {
      throw new Error('CRITICAL: isAuthenticated is still false after dispatch!')
    }
  })

  // Wait for the app to load
  // When expectWizard is true, wait for organization wizard instead of main layout
  if (options.expectWizard) {
    cy.get('[data-cy="organization-wizard"]', { timeout: 10000 }).should('exist')
  } else {
    cy.get('[data-cy="main-layout"], [data-cy="dashboard"], nav', { timeout: 10000 }).should('exist')
  }

  // Dispatch organization to Redux store after app loads
  if (!options.skipOrgMock) {
    cy.get('@organizationToDispatch').then((org) => {
      cy.window().its('store').invoke('dispatch', {
        type: 'organizations/setCurrentOrganization',
        payload: org
      })
    })
  }

  // Set premium status in Redux store for premium users
  if (isPremium) {
    cy.window().its('store').invoke('dispatch', {
      type: 'subscriptions/setSubscription',
      payload: { status: 'active', plan_type: 'premium' }
    })
  }

  // Set proficiency level in Redux store
  const proficiencyLevel = userData.profile?.proficiency_level || 'basic';
  cy.window().its('store').invoke('dispatch', {
    type: 'auth/setProficiency',
    payload: proficiencyLevel
  })
})

/**
 * Set up authentication state without visiting any page.
 * Useful for tests that need to visit a specific URL with authentication already configured.
 * 
 * @param {string} userType - Type of user ('admin', 'user', 'premiumUser', 'visitor')
 * @param {Object} options - Configuration options
 * @param {Object} options.customOrganization - Custom organization data
 * @param {boolean} options.skipOrgMock - Skip organization mock setup
 * @param {string} options.customEmail - Override user email
 */
Cypress.Commands.add('setupAuth', (userType = 'user', options = {}) => {
  const userData = users[userType]
  if (!userData) {
    return
  }

  const mockSession = {
    access_token: 'test-access-token-' + userData.id,
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userData.id,
      email: options.customEmail || userData.email,
      user_metadata: userData.user_metadata,
      aud: 'authenticated',
      role: 'authenticated'
    }
  }

  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: mockSession.user
  }).as('getUser')

  cy.intercept('GET', '**/auth/v1/token?*', {
    statusCode: 200,
    body: mockSession
  }).as('getToken')

  cy.intercept('POST', '**/auth/v1/token*', {
    statusCode: 200,
    body: mockSession
  }).as('refreshToken')

  cy.intercept('GET', '**/rest/v1/profiles*', {
    statusCode: 200,
    body: userData.profile
  }).as('getProfile')

  const isPremium = userData.profile.plan_type === 'premium' || userData.profile.is_admin
  cy.intercept('GET', '**/rest/v1/subscriptions*', {
    statusCode: 200,
    body: isPremium ? {
      id: 'test-subscription-id',
      user_id: userData.id,
      status: 'active',
      plan_type: 'premium',
      stripe_subscription_id: 'sub_test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null
  }).as('getSubscription')

  if (!options.skipOrgMock) {
    const defaultOrganization = {
      id: 'test-org-id',
      name: 'Test Organization',
      organization_number: '',
      vat_number: '',
      municipality: '',
      address: '',
      city: '',
      postal_code: '',
      email: '',
      created_by: userData.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const organizationToUse = options.customOrganization || userData.organization || defaultOrganization
    const roleToUse = options.customOrganization?.role || 'owner'

    cy.intercept('GET', '**/rest/v1/organization_members*', {
      statusCode: 200,
      body: [{
        id: 'test-org-member-id',
        user_id: userData.id,
        organization_id: organizationToUse.id,
        role: roleToUse,
        is_default: true,
        joined_at: new Date().toISOString(),
        organizations: organizationToUse
      }]
    }).as('getOrganizations')
  }

  // Set up localStorage with auth and cookie consent
  const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`
  const authData = JSON.stringify(mockSession)
  const cookieConsent = JSON.stringify({
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false,
    timestamp: Date.now()
  })

  // Return commands to be used with cy.visit's onBeforeLoad
  cy.wrap({
    storageKey,
    authData,
    cookieConsent,
    language: 'en'
  }).as('authSetup')
})

Cypress.Commands.add('logout', () => {
  cy.clearLocalStorage()
  cy.clearCookies()
})

Cypress.Commands.add('getStore', () => {
  return cy.window().its('store')
})

Cypress.Commands.add('dispatch', (action) => {
  return cy.window().its('store').invoke('dispatch', action)
})

Cypress.Commands.add('getState', () => {
  return cy.window().its('store').invoke('getState')
})

Cypress.Commands.add('getByCy', (selector) => {
  return cy.get(`[data-cy="${selector}"]`)
})

Cypress.Commands.add('fillClientForm', (clientData) => {
  if (clientData.name) cy.getByCy('client-name-input').clear().type(clientData.name)
  if (clientData.email) cy.getByCy('client-email-input').clear().type(clientData.email)
  if (clientData.phone) cy.getByCy('client-phone-input').clear().type(clientData.phone)
  if (clientData.address) cy.get('input[name="address"]').clear().type(clientData.address)
  if (clientData.city) cy.get('input[name="city"]').clear().type(clientData.city)
  if (clientData.postalCode) cy.get('input[name="postal_code"]').clear().type(clientData.postalCode)
  if (clientData.country) cy.get('input[name="country"]').clear().type(clientData.country)
  if (clientData.orgNumber) cy.get('input[name="organization_number"]').clear().type(clientData.orgNumber)
  if (clientData.vatNumber) cy.get('input[name="vat_number"]').clear().type(clientData.vatNumber)
  if (clientData.contactPerson) cy.get('input[name="contact_person"]').clear().type(clientData.contactPerson)
  if (clientData.notes) cy.get('textarea[name="notes"]').clear().type(clientData.notes)
})

/**
 * Setup common API intercepts used across multiple test files.
 * This helps DRY out test code by centralizing common mock configurations.
 * 
 * @param {Object} options - Configuration options
 * @param {Array|null} options.invoices - Mock data for invoices endpoint (null to skip intercept)
 * @param {Array|null} options.clients - Mock data for clients endpoint (null to skip intercept)
 * @param {Array|null} options.products - Mock data for products endpoint (null to skip intercept)
 * @param {Array|null} options.templates - Mock data for invoice templates endpoint (null to skip intercept)
 * @param {Array|null} options.organizations - Mock data for organizations endpoint (null to skip intercept)
 * @param {Array|null} options.organizationMembers - Mock data for organization members endpoint (null to skip intercept)
 * @param {Object|null} options.defaultOrganization - Mock data for default organization query (null to skip intercept)
 * 
 * @example
 * // Use defaults (empty arrays)
 * cy.setupCommonIntercepts()
 * 
 * @example
 * // Override specific endpoints
 * cy.setupCommonIntercepts({
 *   clients: [{ id: '1', name: 'Test Client' }],
 *   invoices: null // Skip invoices intercept
 * })
 */
Cypress.Commands.add('setupCommonIntercepts', (options = {}) => {
  const defaults = {
    invoices: [],
    clients: [],
    suppliers: [],
    products: [],
    accounts: [],
    templates: [],
    organizations: null,
    organizationMembers: null,
    defaultOrganization: null,
    supplierInboxItems: [],
    supplierInvoices: []
  }
  
  const config = { ...defaults, ...options }
  
  // Setup GET intercepts for common resources
  if (config.invoices !== null) {
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: config.invoices
    }).as('getInvoices')
  }
  
  if (config.clients !== null) {
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: config.clients
    }).as('getClients')
  }

  if (config.suppliers !== null) {
    cy.intercept('GET', '**/rest/v1/suppliers*', {
      statusCode: 200,
      body: config.suppliers
    }).as('getSuppliers')
  }
  
  if (config.products !== null) {
    cy.intercept('GET', '**/rest/v1/products*', {
      statusCode: 200,
      body: config.products
    }).as('getProducts')
  }

  if (config.accounts !== null) {
    cy.intercept('GET', '**/rest/v1/accounts*', {
      statusCode: 200,
      body: config.accounts
    }).as('getAccounts')
  }
  
  if (config.templates !== null) {
    cy.intercept('GET', '**/rest/v1/invoice_templates*', {
      statusCode: 200,
      body: config.templates
    }).as('getTemplates')
  }
  
  if (config.organizations !== null) {
    cy.intercept('GET', '**/rest/v1/organizations*', {
      statusCode: 200,
      body: config.organizations
    }).as('getOrganizations')
  }
  
  if (config.organizationMembers !== null) {
    cy.intercept('GET', '**/rest/v1/organization_members*', {
      statusCode: 200,
      body: config.organizationMembers
    }).as('getOrganizationMembers')
  }
  
  if (config.defaultOrganization !== null) {
    // Note: This endpoint uses .single() in Supabase which returns nested data structure
    // The response body is wrapped in { organizations: ... } to match the expected format
    cy.intercept('GET', '**/rest/v1/organization_members*is_default=eq.true*', {
      statusCode: 200,
      body: { organizations: config.defaultOrganization }
    }).as('getDefaultOrganization')
  }

  if (config.supplierInboxItems !== null) {
    // Handle count requests (Prefer: count=exact, head=true) for inbox badge
    cy.intercept('GET', '**/rest/v1/supplier_inbox_items*', (req) => {
      const preferHeader = req.headers['prefer'] || '';
      const isCountRequest = preferHeader.includes('count=exact') && preferHeader.includes('head=true');
      const isNewStatusFilter = req.url.includes('status=eq.new');
      
      if (isCountRequest && isNewStatusFilter) {
        // Return count in Content-Range header for new items count
        const newItemsCount = config.supplierInboxItems?.filter?.(i => i.status === 'new')?.length || 0;
        req.reply({
          statusCode: 200,
          headers: {
            'content-range': `0-0/${newItemsCount}`
          },
          body: null
        });
      } else if (isCountRequest) {
        // Return total count
        const totalCount = config.supplierInboxItems?.length || 0;
        req.reply({
          statusCode: 200,
          headers: {
            'content-range': `0-0/${totalCount}`
          },
          body: null
        });
      } else {
        // Return items list
        req.reply({
          statusCode: 200,
          body: config.supplierInboxItems
        });
      }
    }).as('getSupplierInboxItems');
  }

  if (config.supplierInvoices !== null) {
    cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
      statusCode: 200,
      body: config.supplierInvoices
    }).as('getSupplierInvoices')
  }
  
  // Mock RPC calls for supplier inbox
  cy.intercept('POST', '**/rest/v1/rpc/get_inbox_count*', {
    statusCode: 200,
    body: config.supplierInboxItems?.filter?.(i => i.status === 'new')?.length || 0
  }).as('getInboxCount')
  
  // Mock Supabase Edge Function for sending invoice emails
  // This ensures email sending always succeeds in tests unless explicitly overridden
  cy.intercept('POST', '**/functions/v1/send-invoice-email', {
    statusCode: 200,
    body: {
      success: true,
      messageId: 'test-message-id'
    }
  }).as('sendInvoiceEmail')
})