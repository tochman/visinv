// Supabase configuration
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

// Stripe configuration
export const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
};

// Resend configuration
export const resendConfig = {
  apiKey: import.meta.env.VITE_RESEND_API_KEY,
};

// App configuration
export const appConfig = {
  appName: 'Svethna',
  adminEmail: 'thomas+visinv@communitaslabs.io',
  freeInvoiceLimit: 10,
  defaultCurrency: 'SEK',
  defaultLanguage: 'sv',
  supportedLanguages: ['sv', 'en'],
};

// Invoice configuration
export const invoiceConfig = {
  defaultTaxRate: 25, // Swedish moms
  invoiceNumberPrefix: 'INV',
  statuses: {
    DRAFT: 'draft',
    SENT: 'sent',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
  },
};

// Team roles
export const teamRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};
