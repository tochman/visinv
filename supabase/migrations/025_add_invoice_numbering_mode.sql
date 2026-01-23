-- Migration: Add invoice numbering mode to organizations
-- US-064: Manual vs Automatic Invoice Numbering
-- Allows organizations to choose between automatic or manual invoice numbering

-- Add invoice_numbering_mode column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS invoice_numbering_mode TEXT NOT NULL DEFAULT 'automatic'
CHECK (invoice_numbering_mode IN ('automatic', 'manual'));

-- Add comment explaining the field
COMMENT ON COLUMN organizations.invoice_numbering_mode IS 
'Determines how invoice numbers are generated: automatic (system-generated sequential) or manual (user-entered)';
