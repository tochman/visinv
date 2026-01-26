describe('Cookie Consent (US-119)', () => {
  beforeEach(() => {
    // Clear cookie consent from localStorage before each test
    cy.clearLocalStorage('visinv_cookie_consent');
    cy.visit('/');
  });

  describe('Happy Path - Cookie Banner Display and Consent', () => {
    it('is expected to display cookie banner on first visit', () => {
      cy.getByCy('cookie-banner').should('be.visible');
      cy.getByCy('cookie-banner-overlay').should('be.visible');
      cy.getByCy('cookie-accept-btn').should('be.visible');
      cy.getByCy('cookie-reject-btn').should('be.visible');
      cy.getByCy('cookie-customize-btn').should('be.visible');
      cy.getByCy('cookie-learn-more').should('be.visible');
    });

    it('is expected to accept all cookies and hide banner', () => {
      cy.getByCy('cookie-banner').should('be.visible');
      cy.getByCy('cookie-accept-btn').click();
      
      // Banner should disappear
      cy.getByCy('cookie-banner').should('not.exist');
      cy.getByCy('cookie-banner-overlay').should('not.exist');
      
      // Verify localStorage consent
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.essential).to.be.true;
        expect(consent.analytics).to.be.true;
        expect(consent.marketing).to.be.true;
        expect(consent.preferences).to.be.true;
        expect(consent.timestamp).to.exist;
      });
    });

    it('is expected to reject non-essential cookies', () => {
      cy.getByCy('cookie-banner').should('be.visible');
      cy.getByCy('cookie-reject-btn').click();
      
      // Banner should disappear
      cy.getByCy('cookie-banner').should('not.exist');
      
      // Verify localStorage consent
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.essential).to.be.true;
        expect(consent.analytics).to.be.false;
        expect(consent.marketing).to.be.false;
        expect(consent.preferences).to.be.false;
      });
    });

    it('is expected to open cookie settings modal from banner', () => {
      cy.getByCy('cookie-banner').should('be.visible');
      cy.getByCy('cookie-customize-btn').click();
      
      // Settings modal should appear
      cy.getByCy('cookie-settings-modal').should('be.visible');
      
      // Overlay should exist in DOM
      cy.getByCy('cookie-settings-overlay').should('exist');
      
      // All categories should exist in the modal (use exist instead of visible to avoid scroll issues)
      cy.getByCy('cookie-category-analytics').should('exist');
      cy.getByCy('cookie-category-marketing').should('exist');
      cy.getByCy('cookie-category-preferences').should('exist');
    });

    it('is expected to not show banner on subsequent visits after consent', () => {
      // Accept cookies
      cy.getByCy('cookie-accept-btn').click();
      cy.getByCy('cookie-banner').should('not.exist');
      
      // Reload page
      cy.reload();
      
      // Banner should not appear
      cy.getByCy('cookie-banner').should('not.exist');
    });
  });

  describe('Cookie Settings Modal', () => {
    beforeEach(() => {
      // Open cookie settings from banner
      cy.getByCy('cookie-customize-btn').click();
      cy.getByCy('cookie-settings-modal').should('be.visible');
    });

    it('is expected to toggle analytics cookie preference', () => {
      // Analytics should be off by default
      cy.getByCy('cookie-toggle-analytics').should('have.class', 'bg-gray-200');
      
      // Toggle on
      cy.getByCy('cookie-toggle-analytics').click();
      cy.getByCy('cookie-toggle-analytics').should('have.class', 'bg-blue-600');
      
      // Toggle off
      cy.getByCy('cookie-toggle-analytics').click();
      cy.getByCy('cookie-toggle-analytics').should('have.class', 'bg-gray-200');
    });

    it('is expected to save custom preferences', () => {
      // Enable analytics and preferences, disable marketing
      cy.getByCy('cookie-toggle-analytics').click();
      cy.getByCy('cookie-toggle-preferences').click();
      
      // Save preferences
      cy.getByCy('cookie-settings-save').click();
      
      // Modal should close
      cy.getByCy('cookie-settings-modal').should('not.exist');
      
      // Verify localStorage
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.essential).to.be.true;
        expect(consent.analytics).to.be.true;
        expect(consent.marketing).to.be.false;
        expect(consent.preferences).to.be.true;
      });
    });

    it('is expected to accept all from settings modal', () => {
      cy.getByCy('cookie-settings-accept-all').click();
      
      // Modal should close
      cy.getByCy('cookie-settings-modal').should('not.exist');
      
      // Verify all cookies enabled
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.essential).to.be.true;
        expect(consent.analytics).to.be.true;
        expect(consent.marketing).to.be.true;
        expect(consent.preferences).to.be.true;
      });
    });

    it('is expected to reject all from settings modal', () => {
      cy.getByCy('cookie-settings-reject-all').click();
      
      // Modal should close
      cy.getByCy('cookie-settings-modal').should('not.exist');
      
      // Verify only essential cookies enabled
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.essential).to.be.true;
        expect(consent.analytics).to.be.false;
        expect(consent.marketing).to.be.false;
        expect(consent.preferences).to.be.false;
      });
    });

    it('is expected to close modal without saving', () => {
      // Toggle some options
      cy.getByCy('cookie-toggle-analytics').click();
      
      // Close modal
      cy.getByCy('cookie-settings-close').click();
      
      // Modal should close
      cy.getByCy('cookie-settings-modal').should('not.exist');
      
      // Banner should still be visible
      cy.getByCy('cookie-banner').should('be.visible');
    });

    it('is expected to close modal by clicking overlay', () => {
      cy.getByCy('cookie-settings-overlay').click({ force: true });
      cy.getByCy('cookie-settings-modal').should('not.exist');
    });
  });

  describe('Cookie Policy Page', () => {
    it('is expected to navigate to cookie policy page from banner', () => {
      cy.getByCy('cookie-learn-more').click();
      cy.url().should('include', '/cookie-policy');
      cy.getByCy('cookie-policy-page').should('be.visible');
    });

    it('is expected to open cookie settings from policy page', () => {
      // First accept cookies to dismiss the banner
      cy.getByCy('cookie-accept-btn').click();
      cy.getByCy('cookie-banner').should('not.exist');
      
      // Now visit cookie policy page
      cy.visit('/cookie-policy');
      cy.getByCy('cookie-policy-page').should('be.visible');
      cy.getByCy('open-cookie-settings-btn').click();
      cy.getByCy('cookie-settings-modal').should('be.visible');
    });

    it('is expected to display cookie policy content', () => {
      // First accept cookies to dismiss the banner
      cy.getByCy('cookie-accept-btn').click();
      cy.getByCy('cookie-banner').should('not.exist');
      
      // Now visit cookie policy page
      cy.visit('/cookie-policy');
      cy.getByCy('cookie-policy-page').should('be.visible');
      
      // Check for key sections using data-cy attributes (language-agnostic)
      cy.getByCy('cookie-policy-header').should('be.visible');
      cy.getByCy('policy-section-what-are-cookies').should('be.visible');
      cy.getByCy('policy-section-how-we-use').should('be.visible');
      cy.getByCy('policy-section-types').should('be.visible');
      cy.getByCy('policy-section-manage').should('be.visible');
      
      // Check for all cookie categories
      cy.getByCy('policy-category-essential').should('be.visible');
      cy.getByCy('policy-category-analytics').should('be.visible');
      cy.getByCy('policy-category-marketing').should('be.visible');
      cy.getByCy('policy-category-preferences').should('be.visible');
    });

    it('is expected to have a back navigation button', () => {
      // First accept cookies and navigate to policy from banner
      cy.getByCy('cookie-learn-more').click();
      cy.url().should('include', '/cookie-policy');
      
      // Check for back button
      cy.getByCy('cookie-policy-back').should('be.visible');
    });
  });

  describe('Settings Page - Privacy Tab', () => {
    beforeEach(() => {
      // Login and setup (cy.login already loads the app and sets cookie consent)
      cy.login('admin');
      
      // Set analytics to true (simulating user accepting all cookies)
      // cy.login() sets it to false by default, but this test needs to start with analytics=true
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        consent.analytics = true;
        consent.marketing = true;
        consent.preferences = true;
        win.localStorage.setItem('visinv_cookie_consent', JSON.stringify(consent));
      });
      
      // Navigate to settings using sidebar
      cy.getByCy('sidebar-nav-settings').click();
    });

    it('is expected to display Privacy tab in settings', () => {
      cy.getByCy('tab-privacy').should('be.visible');
    });

    it('is expected to open cookie settings from Privacy tab', () => {
      cy.getByCy('tab-privacy').click();
      cy.getByCy('open-cookie-settings').should('be.visible').click();
      cy.getByCy('cookie-settings-modal').should('be.visible');
    });

    it('is expected to change cookie preferences from settings', () => {
      // All cookies should be enabled from initial accept
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.analytics).to.be.true;
      });
      
      // Open privacy tab and cookie settings
      cy.getByCy('tab-privacy').click();
      cy.getByCy('open-cookie-settings').click();
      
      // Disable analytics
      cy.getByCy('cookie-toggle-analytics').click();
      cy.getByCy('cookie-settings-save').click();
      
      // Verify analytics disabled
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.analytics).to.be.false;
        expect(consent.essential).to.be.true;
      });
    });
  });

  describe('Sad Path - Edge Cases', () => {
    it('is expected to handle corrupted localStorage gracefully', () => {
      // Set invalid localStorage data
      cy.window().then((win) => {
        win.localStorage.setItem('visinv_cookie_consent', 'invalid-json');
      });
      
      cy.reload();
      
      // Should show banner despite corrupted data
      cy.getByCy('cookie-banner').should('be.visible');
    });

    it('is expected to persist preferences after page reload', () => {
      // Set custom preferences
      cy.getByCy('cookie-customize-btn').click();
      cy.getByCy('cookie-toggle-analytics').click();
      cy.getByCy('cookie-settings-save').click();
      
      // Verify preferences were saved
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.analytics).to.be.true;
      });
      
      // Reload to verify preferences persist
      cy.reload();
      
      // Banner should not appear (consent already given)
      cy.getByCy('cookie-banner').should('not.exist');
      
      // Verify localStorage still has our preferences
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.analytics).to.be.true;
        expect(consent.essential).to.be.true;
      });
    });

    it('is expected to maintain essential cookies always enabled', () => {
      // Essential cookies cannot be disabled - they are always true
      // This is enforced in the Redux slice
      cy.getByCy('cookie-reject-btn').click();
      
      cy.window().then((win) => {
        const consent = JSON.parse(win.localStorage.getItem('visinv_cookie_consent'));
        expect(consent.essential).to.be.true;
      });
    });
  });

  describe('Internationalization', () => {
    it('is expected to display cookie banner in Swedish', () => {
      // Change language to Swedish
      cy.window().then((win) => {
        win.localStorage.setItem('i18nextLng', 'sv');
      });
      
      cy.reload();
      
      // Check for Swedish text
      cy.getByCy('cookie-banner').should('contain', 'Vi värdesätter din integritet');
      cy.getByCy('cookie-accept-btn').should('contain', 'Acceptera alla');
      cy.getByCy('cookie-reject-btn').should('contain', 'Avvisa icke-nödvändiga');
    });
  });
});
