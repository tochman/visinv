/**
 * Currency Configuration for Multi-Currency Support
 * 
 * Supported currencies with symbols, decimal places, and exchange rates to SEK
 */

export const CURRENCIES = {
  SEK: {
    code: 'SEK',
    name: 'Swedish Krona',
    nameSv: 'Svenska kronor',
    symbol: 'kr',
    symbolPosition: 'after', // 'before' or 'after' the amount
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    exchangeRate: 1.0, // Base currency
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    nameSv: 'Euro',
    symbol: '€',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    exchangeRate: 11.5, // Approximate SEK per EUR
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    nameSv: 'Amerikansk dollar',
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    exchangeRate: 10.8, // Approximate SEK per USD
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    nameSv: 'Brittiskt pund',
    symbol: '£',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    exchangeRate: 13.5, // Approximate SEK per GBP
  },
  NOK: {
    code: 'NOK',
    name: 'Norwegian Krone',
    nameSv: 'Norska kronor',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    exchangeRate: 1.0, // Approximate SEK per NOK (similar value)
  },
  DKK: {
    code: 'DKK',
    name: 'Danish Krone',
    nameSv: 'Danska kronor',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    exchangeRate: 1.54, // Approximate SEK per DKK
  },
};

/**
 * Get array of currency codes for dropdowns
 */
export const getCurrencyCodes = () => {
  return Object.keys(CURRENCIES);
};

/**
 * Get currency configuration by code
 */
export const getCurrency = (code) => {
  return CURRENCIES[code] || CURRENCIES.SEK;
};

/**
 * Format amount with currency symbol and locale-specific formatting
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - Currency code (SEK, EUR, USD, etc.)
 * @param {string} locale - Optional locale for number formatting
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'SEK', locale = 'sv-SE') => {
  const currency = getCurrency(currencyCode);
  
  // Format number with locale-specific separators
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  }).format(amount);
  
  // Add currency symbol based on position
  if (currency.symbolPosition === 'before') {
    return `${currency.symbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currency.symbol}`;
  }
};

/**
 * Format amount for display with proper separators
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted amount without symbol
 */
export const formatAmount = (amount, currencyCode = 'SEK') => {
  const currency = getCurrency(currencyCode);
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  }).format(amount);
};

/**
 * Get currency symbol
 * @param {string} currencyCode - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode) => {
  return getCurrency(currencyCode).symbol;
};

/**
 * Convert amount from one currency to another using stored exchange rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Converted amount
 */
export const convertCurrency = (amount, fromCurrency, toCurrency = 'SEK') => {
  if (fromCurrency === toCurrency) return amount;
  
  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);
  
  // Convert to SEK first (base currency), then to target currency
  const amountInSEK = amount * from.exchangeRate;
  const convertedAmount = amountInSEK / to.exchangeRate;
  
  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimals
};

/**
 * Get exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} Exchange rate
 */
export const getExchangeRate = (fromCurrency, toCurrency = 'SEK') => {
  if (fromCurrency === toCurrency) return 1.0;
  
  const from = getCurrency(fromCurrency);
  const to = getCurrency(toCurrency);
  
  // Calculate rate via SEK (base currency)
  return (from.exchangeRate / to.exchangeRate);
};

export default CURRENCIES;
