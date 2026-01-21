-- Migration 015: Add payment reference (OCR) to invoices
-- Implements US-068: Swedish Bankgirot OCR payment reference numbers
-- 
-- OCR (Optical Character Recognition) numbers are structured payment references
-- used in Swedish banking for automated payment matching.
--
-- Reference: Bankgirot OCR standard (Modulo 10 checksum)

-- Add payment_reference column to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Create index for payment reference lookups
CREATE INDEX IF NOT EXISTS idx_invoices_payment_reference 
ON invoices(payment_reference);

-- Add comment explaining the field
COMMENT ON COLUMN invoices.payment_reference IS 
'Swedish OCR (payment reference) number following Bankgirot standard with Modulo 10 checksum. Used for automated payment matching.';
