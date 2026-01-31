/**
 * Proficiency Features Configuration
 * US-125: Feature Proficiency Mapping Audit
 *
 * This file maps features to proficiency-based behaviors.
 * Each feature can have different modes per proficiency level.
 *
 * Modes:
 * - 'hidden': Feature not shown at all
 * - 'disabled': Feature shown but not interactive
 * - 'collapsed': Feature available but collapsed by default
 * - 'simplified': Simplified version of the feature
 * - 'standard': Normal feature display (default)
 * - 'expanded': Feature expanded/prominent by default
 * - 'advanced': Full feature with all options
 *
 * Proficiency Levels (internal keys):
 * - novice: "Getting Started" - maximum guidance
 * - basic: "Building Confidence" - growing comfortable
 * - proficient: "Taking Control" - full toolkit
 * - expert: "Full Power" - all features unlocked
 */

// =============================================================================
// FEATURE VISIBILITY CONFIGURATION
// =============================================================================

export const proficiencyFeatures = {
  // ---------------------------------------------------------------------------
  // NAVIGATION - Sidebar menu items
  // ---------------------------------------------------------------------------
  'nav.dashboard': {
    novice: 'visible',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.invoices': {
    novice: 'visible',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.clients': {
    novice: 'visible',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.products': {
    novice: 'visible',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.suppliers': {
    novice: 'hidden', // Novices focus on income first
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.supplierInvoices': {
    novice: 'hidden',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.templates': {
    novice: 'hidden', // Use defaults
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.accounts': {
    novice: 'hidden', // Accounting section hidden for novices
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.journalEntries': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.generalLedger': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.balanceSheet': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.incomeStatement': {
    novice: 'hidden',
    basic: 'visible', // Basic users might want to see profit/loss
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.vatReport': {
    novice: 'hidden',
    basic: 'visible', // VAT is required knowledge for most businesses
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.sieImport': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.teams': {
    novice: 'hidden', // Solo users first
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'nav.admin': {
    novice: 'visible', // Admin is role-based, not proficiency-based
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },

  // ---------------------------------------------------------------------------
  // INVOICE FORM - Fields and sections
  // ---------------------------------------------------------------------------
  'invoice.basicFields': {
    // Client, dates, line items
    novice: 'standard',
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },
  'invoice.invoiceNumber': {
    novice: 'hidden', // Auto-generated for novices
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.currency': {
    novice: 'hidden', // Use org default
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.template': {
    novice: 'hidden', // Use default template
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.deliveryDate': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.reverseVat': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.accountCoding': {
    novice: 'hidden', // AI handles it
    basic: 'simplified', // Show suggestion, easy accept
    proficient: 'standard', // Full manual option
    expert: 'advanced', // Quick keyboard entry
  },
  'invoice.notes': {
    novice: 'collapsed',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.reference': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.ourReference': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.yourReference': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.bulkActions': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'expanded',
  },
  'invoice.recurring': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'invoice.copy': {
    novice: 'hidden',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },

  // ---------------------------------------------------------------------------
  // SUPPLIER INVOICE FORM
  // ---------------------------------------------------------------------------
  'supplierInvoice.accountCoding': {
    novice: 'hidden', // AI auto-codes
    basic: 'simplified',
    proficient: 'standard',
    expert: 'advanced',
  },
  'supplierInvoice.journalPreview': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'collapsed',
    expert: 'expanded',
  },
  'supplierInvoice.multipleLines': {
    novice: 'simplified', // Single line default
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },

  // ---------------------------------------------------------------------------
  // CLIENT FORM
  // ---------------------------------------------------------------------------
  'client.basicFields': {
    // Name, email, phone
    novice: 'standard',
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },
  'client.orgNumber': {
    novice: 'collapsed',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'client.vatNumber': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'client.paymentTerms': {
    novice: 'hidden', // Use org default
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'client.defaultCurrency': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'client.notes': {
    novice: 'collapsed',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },

  // ---------------------------------------------------------------------------
  // PRODUCT FORM
  // ---------------------------------------------------------------------------
  'product.basicFields': {
    // Name, price
    novice: 'standard',
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },
  'product.sku': {
    novice: 'hidden',
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'product.unit': {
    novice: 'collapsed',
    basic: 'visible',
    proficient: 'visible',
    expert: 'visible',
  },
  'product.accountNumber': {
    novice: 'hidden', // Use default revenue account
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'product.multiCurrency': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------
  'dashboard.quickStats': {
    novice: 'standard',
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },
  'dashboard.revenueChart': {
    novice: 'simplified',
    basic: 'standard',
    proficient: 'standard',
    expert: 'advanced',
  },
  'dashboard.cashFlowWidget': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'dashboard.accountingAlerts': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'dashboard.overdueInvoices': {
    novice: 'standard',
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },

  // ---------------------------------------------------------------------------
  // JOURNAL ENTRIES (Accounting)
  // ---------------------------------------------------------------------------
  'journal.manualEntry': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'journal.templates': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'journal.bulkOperations': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'hidden',
    expert: 'visible',
  },

  // ---------------------------------------------------------------------------
  // REPORTS
  // ---------------------------------------------------------------------------
  'reports.balanceSheet': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'reports.incomeStatement': {
    novice: 'hidden',
    basic: 'simplified',
    proficient: 'standard',
    expert: 'advanced',
  },
  'reports.vatReport': {
    novice: 'hidden',
    basic: 'simplified',
    proficient: 'standard',
    expert: 'standard',
  },
  'reports.generalLedger': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'reports.exportOptions': {
    novice: 'simplified', // PDF only
    basic: 'standard', // PDF + Excel
    proficient: 'standard',
    expert: 'advanced', // PDF + Excel + CSV + SIE
  },

  // ---------------------------------------------------------------------------
  // ORGANIZATION SETTINGS
  // ---------------------------------------------------------------------------
  'org.basicInfo': {
    novice: 'standard',
    basic: 'standard',
    proficient: 'standard',
    expert: 'standard',
  },
  'org.invoiceNumbering': {
    novice: 'hidden', // Use automatic
    basic: 'collapsed',
    proficient: 'visible',
    expert: 'visible',
  },
  'org.manualNumbering': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'org.accountingSettings': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'org.fiscalYear': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'visible',
    expert: 'visible',
  },
  'org.integrations': {
    novice: 'hidden',
    basic: 'hidden',
    proficient: 'collapsed',
    expert: 'visible',
  },
};

// =============================================================================
// AI BEHAVIOR CONFIGURATION
// =============================================================================

export const aiThresholds = {
  /**
   * Auto-accept threshold for AI suggestions
   * Values are confidence scores (0-1)
   * 1.1 = never auto-accept (always require confirmation)
   */
  autoAccept: {
    novice: 0.85, // Auto-accept high-confidence suggestions
    basic: 0.95, // Only auto-accept very high confidence
    proficient: 1.1, // Never auto-accept, show as suggestion
    expert: 1.1, // Never auto-accept
  },

  /**
   * Whether to show AI suggestions inline
   */
  showSuggestions: {
    novice: true, // But auto-applied if above threshold
    basic: true,
    proficient: true,
    expert: true,
  },

  /**
   * Whether to explain AI decisions
   */
  showExplanations: {
    novice: true, // Help them learn
    basic: true,
    proficient: false, // They know why
    expert: false,
  },
};

// =============================================================================
// CONFIRMATION DIALOGS
// =============================================================================

export const confirmations = {
  /**
   * Whether to show confirmation dialog (true = show, false = skip)
   */
  'delete.invoice': {
    novice: true,
    basic: true,
    proficient: true,
    expert: false, // Experts can skip
  },
  'delete.client': {
    novice: true,
    basic: true,
    proficient: true,
    expert: true, // Always confirm client deletion
  },
  'delete.product': {
    novice: true,
    basic: true,
    proficient: true,
    expert: false,
  },
  'send.invoice': {
    novice: true,
    basic: true,
    proficient: false,
    expert: false,
  },
  'approve.supplierInvoice': {
    novice: true,
    basic: true,
    proficient: true,
    expert: false,
  },
  'bulk.archive': {
    novice: true,
    basic: true,
    proficient: false,
    expert: false,
  },
  'bulk.delete': {
    novice: true,
    basic: true,
    proficient: true,
    expert: true, // Always confirm bulk delete
  },
};

// =============================================================================
// UI COMPLEXITY SETTINGS
// =============================================================================

export const uiComplexity = {
  /**
   * Number of items to show before "Show more" in lists
   */
  listPreviewCount: {
    novice: 5,
    basic: 10,
    proficient: 25,
    expert: 50,
  },

  /**
   * Whether to show keyboard shortcuts hints
   */
  showKeyboardShortcuts: {
    novice: false,
    basic: false,
    proficient: true,
    expert: true,
  },

  /**
   * Table density
   */
  tableDensity: {
    novice: 'comfortable', // More spacing
    basic: 'comfortable',
    proficient: 'standard',
    expert: 'compact', // Maximum data density
  },

  /**
   * Whether to show technical IDs (invoice numbers, account codes)
   */
  showTechnicalIds: {
    novice: false,
    basic: true,
    proficient: true,
    expert: true,
  },

  /**
   * Tooltip verbosity
   */
  tooltipDetail: {
    novice: 'detailed', // Full explanations
    basic: 'standard',
    proficient: 'minimal',
    expert: 'minimal',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the display mode for a feature based on proficiency level
 * @param {string} featureId - The feature identifier (e.g., 'nav.journalEntries')
 * @param {string} level - The proficiency level ('novice', 'basic', 'proficient', 'expert')
 * @returns {string} The display mode ('hidden', 'collapsed', 'visible', etc.)
 */
export function getFeatureMode(featureId, level = 'basic') {
  const feature = proficiencyFeatures[featureId];
  if (!feature) {
    console.warn(`Unknown feature: ${featureId}, defaulting to 'standard'`);
    return 'standard';
  }
  return feature[level] || 'standard';
}

/**
 * Check if a feature should be shown for a given proficiency level
 * @param {string} featureId - The feature identifier
 * @param {string} level - The proficiency level
 * @returns {boolean} Whether the feature should be visible
 */
export function shouldShowFeature(featureId, level = 'basic') {
  const mode = getFeatureMode(featureId, level);
  return mode !== 'hidden';
}

/**
 * Check if a feature should be collapsed by default
 * @param {string} featureId - The feature identifier
 * @param {string} level - The proficiency level
 * @returns {boolean} Whether the feature should be collapsed
 */
export function isFeatureCollapsed(featureId, level = 'basic') {
  const mode = getFeatureMode(featureId, level);
  return mode === 'collapsed';
}

/**
 * Get AI auto-accept threshold for a proficiency level
 * @param {string} level - The proficiency level
 * @returns {number} The confidence threshold (0-1, or 1.1 for never)
 */
export function getAiAutoAcceptThreshold(level = 'basic') {
  return aiThresholds.autoAccept[level] ?? 0.95;
}

/**
 * Check if confirmation dialog should be shown
 * @param {string} actionId - The action identifier (e.g., 'delete.invoice')
 * @param {string} level - The proficiency level
 * @returns {boolean} Whether to show confirmation
 */
export function shouldShowConfirmation(actionId, level = 'basic') {
  const confirmation = confirmations[actionId];
  if (!confirmation) return true; // Default to showing confirmation
  return confirmation[level] ?? true;
}

/**
 * Get UI complexity setting
 * @param {string} settingId - The setting identifier (e.g., 'listPreviewCount')
 * @param {string} level - The proficiency level
 * @returns {*} The setting value
 */
export function getUiComplexitySetting(settingId, level = 'basic') {
  const setting = uiComplexity[settingId];
  if (!setting) return null;
  return setting[level];
}

// =============================================================================
// FEATURE CATEGORIES (for documentation/tooling)
// =============================================================================

export const featureCategories = {
  navigation: [
    'nav.dashboard',
    'nav.invoices',
    'nav.clients',
    'nav.products',
    'nav.suppliers',
    'nav.supplierInvoices',
    'nav.templates',
    'nav.accounts',
    'nav.journalEntries',
    'nav.generalLedger',
    'nav.balanceSheet',
    'nav.incomeStatement',
    'nav.vatReport',
    'nav.sieImport',
    'nav.teams',
    'nav.admin',
  ],
  invoiceForm: [
    'invoice.basicFields',
    'invoice.invoiceNumber',
    'invoice.currency',
    'invoice.template',
    'invoice.deliveryDate',
    'invoice.reverseVat',
    'invoice.accountCoding',
    'invoice.notes',
    'invoice.reference',
    'invoice.ourReference',
    'invoice.yourReference',
    'invoice.bulkActions',
    'invoice.recurring',
    'invoice.copy',
  ],
  supplierInvoiceForm: [
    'supplierInvoice.accountCoding',
    'supplierInvoice.journalPreview',
    'supplierInvoice.multipleLines',
  ],
  clientForm: [
    'client.basicFields',
    'client.orgNumber',
    'client.vatNumber',
    'client.paymentTerms',
    'client.defaultCurrency',
    'client.notes',
  ],
  productForm: [
    'product.basicFields',
    'product.sku',
    'product.unit',
    'product.accountNumber',
    'product.multiCurrency',
  ],
  dashboard: [
    'dashboard.quickStats',
    'dashboard.revenueChart',
    'dashboard.cashFlowWidget',
    'dashboard.accountingAlerts',
    'dashboard.overdueInvoices',
  ],
  journal: ['journal.manualEntry', 'journal.templates', 'journal.bulkOperations'],
  reports: [
    'reports.balanceSheet',
    'reports.incomeStatement',
    'reports.vatReport',
    'reports.generalLedger',
    'reports.exportOptions',
  ],
  organization: [
    'org.basicInfo',
    'org.invoiceNumbering',
    'org.manualNumbering',
    'org.accountingSettings',
    'org.fiscalYear',
    'org.integrations',
  ],
};
