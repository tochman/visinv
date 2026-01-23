-- Create recurring invoices table for automated subscription billing
-- US-025: Recurring Invoices

-- ============================================
-- RECURRING INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  invoice_template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL,
  
  -- Schedule identification
  name TEXT NOT NULL,
  
  -- Frequency configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Date configuration
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means indefinite
  next_invoice_date DATE NOT NULL,
  last_invoice_date DATE,
  
  -- Invoice limits
  invoice_count INTEGER DEFAULT 0 NOT NULL,
  max_invoices INTEGER, -- NULL means unlimited
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Invoice defaults
  currency VARCHAR(3) DEFAULT 'SEK' NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 25.00 NOT NULL,
  notes TEXT,
  terms TEXT,
  reference TEXT,
  
  -- Line items template (stored as JSONB)
  rows_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Add comment for clarity
COMMENT ON TABLE recurring_invoices IS 'Recurring invoice schedules for automated billing. Premium feature (US-025).';
COMMENT ON COLUMN recurring_invoices.rows_template IS 'JSON array of line items: [{description, quantity, unit_price, unit, tax_rate}]';
COMMENT ON COLUMN recurring_invoices.next_invoice_date IS 'Calculated next date for invoice generation';

-- ============================================
-- ADD RECURRING REFERENCE TO INVOICES
-- ============================================
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN invoices.recurring_invoice_id IS 'Reference to recurring schedule if invoice was auto-generated';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_organization_id ON recurring_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client_id ON recurring_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_invoice_date ON recurring_invoices(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_invoice_id ON invoices(recurring_invoice_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view recurring invoices in their organization
CREATE POLICY "Users can view recurring invoices in their organization"
ON recurring_invoices FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create recurring invoices in their organization
CREATE POLICY "Users can create recurring invoices in their organization"
ON recurring_invoices FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update recurring invoices in their organization
CREATE POLICY "Users can update recurring invoices in their organization"
ON recurring_invoices FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete recurring invoices in their organization
CREATE POLICY "Users can delete recurring invoices in their organization"
ON recurring_invoices FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_recurring_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recurring_invoices_updated_at
  BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_invoices_updated_at();
