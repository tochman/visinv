-- Add exchange rate tracking to invoices for multi-currency support
-- This stores the exchange rate at time of invoice creation for historical accuracy

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12, 6) DEFAULT 1.0;

-- Add comment for clarity
COMMENT ON COLUMN invoices.exchange_rate IS 'Exchange rate to SEK at time of invoice creation. 1.0 for SEK invoices.';

-- Update existing invoices to have exchange_rate = 1.0 (assuming all are SEK)
UPDATE invoices
SET exchange_rate = 1.0
WHERE exchange_rate IS NULL;

-- Make exchange_rate NOT NULL after setting default values
ALTER TABLE invoices
ALTER COLUMN exchange_rate SET NOT NULL;

-- Create index for better query performance when filtering by currency
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON invoices(currency);
