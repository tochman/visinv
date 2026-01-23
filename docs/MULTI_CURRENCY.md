# Multi-Currency Support Implementation

## Overview
Multi-currency support enables creating invoices in different currencies with automatic exchange rate tracking for historical accuracy.

## Supported Currencies
- **SEK** (Swedish Krona) - Base currency
- **EUR** (Euro)
- **USD** (US Dollar)
- **GBP** (British Pound)
- **NOK** (Norwegian Krone)
- **DKK** (Danish Krone)

## Architecture

### Configuration (`src/config/currencies.js`)
Centralized currency configuration with:
- Currency metadata (code, name, symbol, formatting rules)
- Static exchange rates (relative to SEK as base)
- Utility functions for formatting and conversion

### Database Schema
The `invoices` table includes:
- `currency` (TEXT, default 'SEK'): Selected currency code
- `exchange_rate` (DECIMAL(12,6), default 1.0): Exchange rate at invoice creation time

**Migration:** `supabase/migrations/029_add_exchange_rate_to_invoices.sql`

### Exchange Rate Strategy
- **Static Rates**: Exchange rates are configured in `currencies.js`
- **Historical Tracking**: Each invoice stores its exchange rate at creation time
- **Base Currency**: SEK (1.0) - all rates are relative to Swedish Krona
- **Future Enhancement**: Can integrate live rate APIs by updating `getExchangeRate()` function

## Currency Data Flow

### Invoice Creation
1. User selects currency from dropdown in InvoiceModal
2. Invoice resource automatically:
   - Sets `currency` field from user selection
   - Calculates `exchange_rate` using `getExchangeRate(currency, 'SEK')`
   - Stores both values in database
3. All monetary amounts stored in selected currency

### Display
1. Invoices load with their stored currency
2. `formatCurrency(amount, currency)` applies:
   - Correct symbol (€, $, £, kr)
   - Symbol position (before/after amount)
   - Decimal places (typically 2)
   - Thousand/decimal separators

### PDF Generation
1. `invoicePdfService.buildInvoiceContext()` formats all monetary values
2. Currency symbol and formatting applied to:
   - Line item unit prices
   - Line item amounts
   - Subtotal
   - VAT/tax amounts
   - Total amount
3. Template renders with formatted values

## Implementation Details

### Currency Configuration Structure
```javascript
{
  code: 'EUR',
  name: 'Euro',
  nameSv: 'Euro',
  symbol: '€',
  symbolPosition: 'before',  // 'before' or 'after'
  decimalPlaces: 2,
  thousandSeparator: ' ',
  decimalSeparator: '.',
  exchangeRate: 11.5  // 1 EUR = 11.5 SEK
}
```

### Format Currency Function
```javascript
formatCurrency(amount, currencyCode, locale = 'sv-SE')
```
- Handles symbol position
- Applies proper separators
- Formats to correct decimal places
- Returns formatted string (e.g., "€1,234.56" or "1 234,56 kr")

### Convert Currency Function
```javascript
convertCurrency(amount, fromCurrency, toCurrency)
```
- Converts via SEK base (from → SEK → to)
- Uses configured exchange rates
- Returns numeric value
- Useful for reporting/totals in base currency

## Components Updated

### InvoiceModal (`src/components/invoices/InvoiceModal.jsx`)
- Currency dropdown with all supported currencies
- Shows currency code, symbol, and translated name
- Default: SEK

### InvoiceDetail (`src/pages/InvoiceDetail.jsx`)
- Total amount formatted with currency
- Payment amounts formatted with currency
- Remaining balance formatted with currency

### Invoices List (`src/pages/Invoices.jsx`)
- Invoice amounts in list formatted with currency
- Replaced local formatting with centralized utility

### Dashboard (`src/pages/Dashboard.jsx`)
- YTD total shows primary currency (most recent invoice)
- Large amounts formatted with K suffix (e.g., "€12.5K")
- Uses centralized currency formatting

### PDF Service (`src/services/invoicePdfService.js`)
- All monetary values formatted with currency in context
- Line items, subtotal, tax, total all properly formatted
- Templates receive pre-formatted values

## Internationalization

### Translation Keys
Added to `src/i18n/locales/en.json` and `sv.json`:
```json
{
  "invoice": {
    "currency": "Currency" / "Valuta"
  },
  "currencies": {
    "SEK": "Swedish Krona" / "Svenska kronor",
    "EUR": "Euro" / "Euro",
    "USD": "US Dollar" / "Amerikansk dollar",
    "GBP": "British Pound" / "Brittiskt pund",
    "NOK": "Norwegian Krone" / "Norska kronor",
    "DKK": "Danish Krone" / "Danska kronor"
  }
}
```

## Testing

### E2E Tests (`cypress/e2e/multi-currency.cy.js`)
Comprehensive test suite covering:
1. Currency dropdown displays all options
2. Invoice creation with EUR
3. Invoice creation with USD
4. Currency formatting in invoice list
5. Currency formatting in detail view
6. Currency preservation when editing
7. Exchange rate calculation for all currencies
8. Symbol positioning for different currencies
9. PDF generation with different currencies

### Test Coverage
- Currency selection functionality
- Exchange rate calculation and persistence
- Display formatting across all views
- Edit/update operations preserve currency
- PDF generation compatibility

## Usage Examples

### Create Invoice with EUR
```javascript
// User selects EUR from dropdown
// Resource automatically sets:
{
  currency: 'EUR',
  exchange_rate: 11.5,  // EUR to SEK
  total_amount: 1000.00  // stored as EUR
}
```

### Display Amount
```javascript
import { formatCurrency } from '../config/currencies';

// In component:
formatCurrency(invoice.total_amount, invoice.currency)
// Returns: "€1,000.00" for EUR
// Returns: "$1,000.00" for USD
// Returns: "1 000,00 kr" for SEK
```

### Convert for Reporting
```javascript
import { convertCurrency } from '../config/currencies';

// Convert EUR invoice to SEK for reporting
const sekAmount = convertCurrency(1000, 'EUR', 'SEK');
// Returns: 11500 (1000 * 11.5)
```

## Future Enhancements

### Live Exchange Rates
Replace static rates with API integration:
```javascript
async function getExchangeRate(fromCurrency, toCurrency) {
  // Fetch from external API (e.g., exchangerate-api.com)
  const response = await fetch(`https://api.example.com/rates?from=${fromCurrency}&to=${toCurrency}`);
  const data = await response.json();
  return data.rate;
}
```

### Multi-Currency Dashboard
Add currency breakdown to dashboard:
```javascript
// Group invoices by currency
const currencyTotals = invoices.reduce((acc, invoice) => {
  const currency = invoice.currency;
  acc[currency] = (acc[currency] || 0) + invoice.total_amount;
  return acc;
}, {});
```

### Currency Conversion Views
Allow viewing all amounts in a selected currency:
```javascript
// Component state for view currency
const [viewCurrency, setViewCurrency] = useState('SEK');

// Convert displayed amounts
const displayAmount = convertCurrency(
  invoice.total_amount,
  invoice.currency,
  viewCurrency
);
```

### Additional Currencies
Add more currencies to `currencies.js`:
```javascript
JPY: {
  code: 'JPY',
  name: 'Japanese Yen',
  symbol: '¥',
  symbolPosition: 'before',
  decimalPlaces: 0,  // Yen has no decimal places
  thousandSeparator: ',',
  decimalSeparator: '.',
  exchangeRate: 0.07
}
```

## Migration Guide

### Running the Migration
```bash
# Apply migration to add exchange_rate column
supabase db push

# Or manually:
psql -U postgres -d visinv -f supabase/migrations/029_add_exchange_rate_to_invoices.sql
```

### Existing Invoices
- Existing invoices will have `exchange_rate = 1.0` (assumes SEK)
- Currency column already exists with default 'SEK'
- No data loss or conversion needed

## Troubleshooting

### Issue: Currency symbol not displaying
**Solution:** Ensure `formatCurrency()` is imported and used instead of manual formatting

### Issue: Exchange rate not saved
**Solution:** Verify `Invoice.create()` includes currency and calls `getExchangeRate()`

### Issue: PDF shows wrong currency
**Solution:** Check `invoicePdfService.buildInvoiceContext()` passes currency to all `formatCurrency()` calls

### Issue: Wrong currency in dropdown
**Solution:** Verify `formData.currency` initialization and `invoice?.currency` fallback in InvoiceModal

## Best Practices

1. **Always use formatCurrency()** - Never manually format currency displays
2. **Store original currency** - Don't convert amounts, store in original currency
3. **Track exchange rate** - Always store rate at invoice creation time
4. **Use base currency for totals** - Convert to SEK for aggregated reporting
5. **Test with multiple currencies** - Verify formatting works for all supported currencies
6. **Consider locale** - Currency formatting respects Swedish locale by default

## API Reference

### `formatCurrency(amount, currencyCode, locale = 'sv-SE')`
Formats a numeric amount with the specified currency.
- **amount** (number): The numeric amount
- **currencyCode** (string): ISO currency code (SEK, EUR, USD, etc.)
- **locale** (string): Optional locale for formatting (default: 'sv-SE')
- **Returns:** Formatted string with currency symbol

### `convertCurrency(amount, fromCurrency, toCurrency)`
Converts an amount from one currency to another.
- **amount** (number): Amount to convert
- **fromCurrency** (string): Source currency code
- **toCurrency** (string): Target currency code
- **Returns:** Converted numeric amount

### `getExchangeRate(fromCurrency, toCurrency)`
Gets the exchange rate between two currencies.
- **fromCurrency** (string): Source currency code
- **toCurrency** (string): Target currency code
- **Returns:** Exchange rate (number)

### `getCurrency(code)`
Gets full currency configuration object.
- **code** (string): Currency code
- **Returns:** Currency object with all metadata

### `getCurrencyCodes()`
Gets array of all supported currency codes.
- **Returns:** Array of strings (e.g., ['SEK', 'EUR', 'USD', ...])

## Related Files
- **Config:** `src/config/currencies.js`
- **Migration:** `supabase/migrations/029_add_exchange_rate_to_invoices.sql`
- **Resource:** `src/services/resources/Invoice.js`
- **Components:** `src/components/invoices/InvoiceModal.jsx`, `src/pages/InvoiceDetail.jsx`, `src/pages/Invoices.jsx`
- **Services:** `src/services/invoicePdfService.js`
- **i18n:** `src/i18n/locales/en.json`, `src/i18n/locales/sv.json`
- **Tests:** `cypress/e2e/multi-currency.cy.js`
