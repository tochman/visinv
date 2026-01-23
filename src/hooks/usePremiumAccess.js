import { useSelector } from 'react-redux';
import { appConfig } from '../config/constants';

/**
 * Hook to check if current user has premium access.
 * Admins automatically have access to all premium features.
 * 
 * @returns {Object} Premium access status and related info
 */
export function usePremiumAccess() {
  const { isAdmin, isAuthenticated } = useSelector((state) => state.auth);
  const { isPremium, subscription, invoiceCount, loading } = useSelector((state) => state.subscriptions);

  // Admins have full premium access
  const hasPremiumAccess = isAdmin || isPremium;
  
  // Check if user can create more invoices
  const canCreateInvoice = hasPremiumAccess || invoiceCount < appConfig.freeInvoiceLimit;
  const remainingFreeInvoices = Math.max(0, appConfig.freeInvoiceLimit - invoiceCount);

  return {
    isAdmin,
    isPremium,
    hasPremiumAccess,
    canCreateInvoice,
    remainingFreeInvoices,
    invoiceCount,
    subscription,
    freeInvoiceLimit: appConfig.freeInvoiceLimit,
    isLoading: loading,
  };
}

export default usePremiumAccess;
