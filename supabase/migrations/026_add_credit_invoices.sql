-- Migration: Add Credit Invoice Support (US-063)
-- Enables DEBET (standard) and CREDIT (corrective) invoice types
-- Links credit invoices to original invoices for proper accounting

-- Add invoice_type column (DEBET or CREDIT)
ALTER TABLE invoices
ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'DEBET'
CHECK (invoice_type IN ('DEBET', 'CREDIT'));

-- Add reference to original invoice for credit invoices
ALTER TABLE invoices
ADD COLUMN credited_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add index for faster lookup of credits for an invoice
CREATE INDEX idx_invoices_credited_invoice_id ON invoices(credited_invoice_id);

-- Add comment for documentation
COMMENT ON COLUMN invoices.invoice_type IS 'Invoice type: DEBET (standard invoice) or CREDIT (corrective invoice)';
COMMENT ON COLUMN invoices.credited_invoice_id IS 'Reference to original invoice when this is a credit invoice';
