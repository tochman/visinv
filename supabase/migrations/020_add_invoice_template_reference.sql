-- Migration 020: Add invoice_template_id to invoices table
-- This allows users to select which template to use for each invoice

-- Add the new column referencing invoice_templates
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_template_id ON invoices(invoice_template_id);

-- Comment for documentation
COMMENT ON COLUMN invoices.invoice_template_id IS 'The invoice template to use when generating PDF for this invoice. If NULL, uses the default system template.';
