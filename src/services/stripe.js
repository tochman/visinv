import { loadStripe } from '@stripe/stripe-js';
import { stripeConfig } from '../config/constants';

let stripePromise;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripeConfig.publishableKey);
  }
  return stripePromise;
};

export const stripeService = {
  // Create checkout session
  async createCheckoutSession(priceId, userId) {
    // This will call your backend endpoint
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId, userId }),
    });
    
    const session = await response.json();
    return session;
  },

  // Redirect to checkout
  async redirectToCheckout(sessionId) {
    const stripe = await getStripe();
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      console.error('Stripe redirect error:', error);
    }
    
    return { error };
  },

  // Get customer portal URL
  async getCustomerPortalUrl(customerId) {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerId }),
    });
    
    const { url } = await response.json();
    return url;
  },
};
