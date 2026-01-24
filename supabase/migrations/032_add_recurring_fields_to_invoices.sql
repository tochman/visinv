-- Simplified recurring invoices: add recurring fields directly to invoices table
-- A recurring invoice IS an invoice with recurring settings

-- Add recurring fields to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurring_start_date DATE,
ADD COLUMN IF NOT EXISTS recurring_end_date DATE,
ADD COLUMN IF NOT EXISTS recurring_next_date DATE,
ADD COLUMN IF NOT EXISTS recurring_max_count INTEGER,
ADD COLUMN IF NOT EXISTS recurring_current_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurring_status TEXT DEFAULT 'active' CHECK (recurring_status IN ('active', 'paused', 'completed', 'cancelled'));

-- Index for finding recurring invoices
CREATE INDEX IF NOT EXISTS idx_invoices_is_recurring ON invoices(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_next_date ON invoices(recurring_next_date) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_parent ON invoices(recurring_parent_id);

-- Comments
COMMENT ON COLUMN invoices.is_recurring IS 'Whether this invoice should generate recurring copies';
COMMENT ON COLUMN invoices.recurring_frequency IS 'How often to generate new invoices (weekly, monthly, etc)';
COMMENT ON COLUMN invoices.recurring_start_date IS 'Date when recurring started (typically the issue_date)';
COMMENT ON COLUMN invoices.recurring_end_date IS 'Optional date to stop generating invoices';
COMMENT ON COLUMN invoices.recurring_next_date IS 'Next date to generate an invoice';
COMMENT ON COLUMN invoices.recurring_max_count IS 'Maximum number of invoices to generate (null = unlimited)';
COMMENT ON COLUMN invoices.recurring_current_count IS 'Number of invoices generated so far';
COMMENT ON COLUMN invoices.recurring_parent_id IS 'If this invoice was auto-generated, references the original recurring invoice';
COMMENT ON COLUMN invoices.recurring_status IS 'Status of the recurring schedule (active, paused, completed, cancelled)';

-- Remove the old recurring_invoice_id column if it exists (from migration 030)
ALTER TABLE invoices DROP COLUMN IF EXISTS recurring_invoice_id;
