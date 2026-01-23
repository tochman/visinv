import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import invoicesReducer from '../features/invoices/invoicesSlice';
import clientsReducer from '../features/clients/clientsSlice';
import productsReducer from '../features/products/productsSlice';
import templatesReducer from '../features/templates/templatesSlice';
import subscriptionsReducer from '../features/subscriptions/subscriptionsSlice';
import teamsReducer from '../features/teams/teamsSlice';
import invoiceTemplatesReducer from '../features/invoiceTemplates/invoiceTemplatesSlice';
import recurringInvoicesReducer from '../features/recurringInvoices/recurringInvoicesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    invoices: invoicesReducer,
    clients: clientsReducer,
    products: productsReducer,
    templates: templatesReducer,
    subscriptions: subscriptionsReducer,
    teams: teamsReducer,
    invoiceTemplates: invoiceTemplatesReducer,
    recurringInvoices: recurringInvoicesReducer,
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
