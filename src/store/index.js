import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import invoicesReducer from '../features/invoices/invoicesSlice';
import clientsReducer from '../features/clients/clientsSlice';
import templatesReducer from '../features/templates/templatesSlice';
import subscriptionsReducer from '../features/subscriptions/subscriptionsSlice';
import teamsReducer from '../features/teams/teamsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    invoices: invoicesReducer,
    clients: clientsReducer,
    templates: templatesReducer,
    subscriptions: subscriptionsReducer,
    teams: teamsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user'],
      },
    }),
});
