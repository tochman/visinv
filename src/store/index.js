import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import accountsReducer from '../features/accounts/accountsSlice';
import financialReportsReducer from '../features/financialReports/financialReportsSlice';
import fiscalYearsReducer from '../features/fiscalYears/fiscalYearsSlice';
import invoicesReducer from '../features/invoices/invoicesSlice';
import journalEntriesReducer from '../features/journalEntries/journalEntriesSlice';
import journalEntryTemplatesReducer from '../features/journalEntryTemplates/journalEntryTemplatesSlice';
import clientsReducer from '../features/clients/clientsSlice';
import productsReducer from '../features/products/productsSlice';
import templatesReducer from '../features/templates/templatesSlice';
import subscriptionsReducer from '../features/subscriptions/subscriptionsSlice';
import teamsReducer from '../features/teams/teamsSlice';
import invoiceTemplatesReducer from '../features/invoiceTemplates/invoiceTemplatesSlice';
import recurringInvoicesReducer from '../features/recurringInvoices/recurringInvoicesSlice';
import organizationsReducer from '../features/organizations/organizationsSlice';
import cookieConsentReducer from '../features/cookieConsent/cookieConsentSlice';
import npsReducer from '../features/nps/npsSlice';
import suppliersReducer from '../features/suppliers/suppliersSlice';
import supplierInvoicesReducer from '../features/supplierInvoices/supplierInvoicesSlice';
import supplierInvoiceOcrReducer from '../features/supplierInvoices/supplierInvoiceOcrSlice';
import supplierInboxReducer from '../features/supplierInbox/supplierInboxSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    financialReports: financialReportsReducer,
    fiscalYears: fiscalYearsReducer,
    invoices: invoicesReducer,
    journalEntries: journalEntriesReducer,
    journalEntryTemplates: journalEntryTemplatesReducer,
    clients: clientsReducer,
    products: productsReducer,
    templates: templatesReducer,
    subscriptions: subscriptionsReducer,
    teams: teamsReducer,
    invoiceTemplates: invoiceTemplatesReducer,
    recurringInvoices: recurringInvoicesReducer,
    organizations: organizationsReducer,
    cookieConsent: cookieConsentReducer,
    nps: npsReducer,
    suppliers: suppliersReducer,
    supplierInvoices: supplierInvoicesReducer,
    supplierInvoiceOcr: supplierInvoiceOcrReducer,
    supplierInbox: supplierInboxReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

if (window.Cypress) {
  window.store = store;
}
