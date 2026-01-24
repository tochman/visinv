-- Fix invoice_number unique constraint to be per-organization instead of global
-- This allows different organizations to have the same invoice numbers

-- Drop the global unique constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Add a composite unique constraint on (organization_id, invoice_number)
-- This ensures invoice numbers are unique within each organization
ALTER TABLE invoices 
ADD CONSTRAINT invoices_organization_invoice_number_unique 
UNIQUE (organization_id, invoice_number);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_invoices_org_invoice_number 
ON invoices(organization_id, invoice_number);

COMMENT ON CONSTRAINT invoices_organization_invoice_number_unique ON invoices 
IS 'Invoice numbers must be unique within each organization';
