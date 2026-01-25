import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'visinv_cookie_consent';

// Load initial state from localStorage
const loadConsentFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load cookie consent from storage:', error);
  }
  return null;
};

// Save consent to localStorage
const saveConsentToStorage = (consent) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch (error) {
    console.error('Failed to save cookie consent to storage:', error);
  }
};

const initialConsent = loadConsentFromStorage();

const initialState = {
  showBanner: !initialConsent, // Show banner if no consent stored
  consent: initialConsent || {
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    preferences: false,
    timestamp: null,
  },
  showSettings: false,
};

const cookieConsentSlice = createSlice({
  name: 'cookieConsent',
  initialState,
  reducers: {
    acceptAllCookies: (state) => {
      state.consent = {
        essential: true,
        analytics: true,
        marketing: true,
        preferences: true,
        timestamp: new Date().toISOString(),
      };
      state.showBanner = false;
      saveConsentToStorage(state.consent);
    },
    rejectNonEssentialCookies: (state) => {
      state.consent = {
        essential: true,
        analytics: false,
        marketing: false,
        preferences: false,
        timestamp: new Date().toISOString(),
      };
      state.showBanner = false;
      saveConsentToStorage(state.consent);
    },
    updateCookiePreferences: (state, action) => {
      state.consent = {
        essential: true, // Always true
        analytics: action.payload.analytics ?? state.consent.analytics,
        marketing: action.payload.marketing ?? state.consent.marketing,
        preferences: action.payload.preferences ?? state.consent.preferences,
        timestamp: new Date().toISOString(),
      };
      state.showBanner = false;
      state.showSettings = false;
      saveConsentToStorage(state.consent);
    },
    openCookieSettings: (state) => {
      state.showSettings = true;
    },
    closeCookieSettings: (state) => {
      state.showSettings = false;
    },
    hideBanner: (state) => {
      state.showBanner = false;
    },
  },
});

export const {
  acceptAllCookies,
  rejectNonEssentialCookies,
  updateCookiePreferences,
  openCookieSettings,
  closeCookieSettings,
  hideBanner,
} = cookieConsentSlice.actions;

// Selectors
export const selectCookieConsent = (state) => state.cookieConsent.consent;
export const selectShowBanner = (state) => state.cookieConsent.showBanner;
export const selectShowSettings = (state) => state.cookieConsent.showSettings;

export default cookieConsentSlice.reducer;
