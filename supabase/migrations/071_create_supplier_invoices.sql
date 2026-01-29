-- Migration: Create supplier invoices tables for US-260
-- Supplier Invoice Registration (Leverantörsfakturor)
-- Records incoming bills/invoices from suppliers

-- Create supplier invoice status enum
CREATE TYPE supplier_invoice_status AS ENUM ('draft', 'approved', 'paid', 'cancelled');

-- Create supplier invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  
  -- Invoice Details
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Amounts
  subtotal_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SEK',
  
  -- Status and Workflow
  status supplier_invoice_status NOT NULL DEFAULT 'draft',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  
  -- Payment Details
  payment_reference TEXT, -- OCR, reference number, etc.
  payment_method TEXT, -- bank_transfer, autogiro, card, cash
  
  -- Document Attachment
  attachment_url TEXT, -- PDF stored in Supabase Storage
  attachment_filename TEXT,
  
  -- Journal Entry Link
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Notes
  description TEXT,
  internal_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique invoice number per supplier per organization
  CONSTRAINT unique_supplier_invoice_number UNIQUE(organization_id, supplier_id, invoice_number)
);

-- Create supplier invoice lines table
CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  
  -- Line Details
  description TEXT,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  
  -- Amounts
  amount DECIMAL(15,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 0, -- e.g., 25.00 for 25%
  vat_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Optional
  cost_center TEXT,
  project_code TEXT,
  
  -- Ordering
  line_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_supplier_invoices_organization_id ON supplier_invoices(organization_id);
CREATE INDEX idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_fiscal_year_id ON supplier_invoices(fiscal_year_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX idx_supplier_invoices_date ON supplier_invoices(invoice_date);
CREATE INDEX idx_supplier_invoices_due_date ON supplier_invoices(due_date);
CREATE INDEX idx_supplier_invoices_journal_entry ON supplier_invoices(journal_entry_id);

CREATE INDEX idx_supplier_invoice_lines_invoice ON supplier_invoice_lines(supplier_invoice_id);
CREATE INDEX idx_supplier_invoice_lines_account ON supplier_invoice_lines(account_id);

-- RLS Policies
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_lines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for supplier_invoices
-- ============================================

-- Users can view supplier invoices in their organization
CREATE POLICY supplier_invoices_select_policy ON supplier_invoices
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert supplier invoices in their organization
CREATE POLICY supplier_invoices_insert_policy ON supplier_invoices
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update supplier invoices in their organization
CREATE POLICY supplier_invoices_update_policy ON supplier_invoices
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete draft supplier invoices in their organization
CREATE POLICY supplier_invoices_delete_policy ON supplier_invoices
  FOR DELETE
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- RLS Policies for supplier_invoice_lines
-- ============================================

-- Users can view lines for supplier invoices in their organization
CREATE POLICY supplier_invoice_lines_select_policy ON supplier_invoice_lines
  FOR SELECT
  USING (
    supplier_invoice_id IN (
      SELECT id FROM supplier_invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert lines for supplier invoices in their organization
CREATE POLICY supplier_invoice_lines_insert_policy ON supplier_invoice_lines
  FOR INSERT
  WITH CHECK (
    supplier_invoice_id IN (
      SELECT id FROM supplier_invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update lines for supplier invoices in their organization
CREATE POLICY supplier_invoice_lines_update_policy ON supplier_invoice_lines
  FOR UPDATE
  USING (
    supplier_invoice_id IN (
      SELECT id FROM supplier_invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete lines for supplier invoices in their organization
CREATE POLICY supplier_invoice_lines_delete_policy ON supplier_invoice_lines
  FOR DELETE
  USING (
    supplier_invoice_id IN (
      SELECT id FROM supplier_invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Update trigger for supplier_invoices
CREATE OR REPLACE FUNCTION update_supplier_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_supplier_invoice_timestamp
  BEFORE UPDATE ON supplier_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_invoice_timestamp();

-- Comment on tables
COMMENT ON TABLE supplier_invoices IS 'US-260: Supplier Invoice Registration - Records incoming bills/invoices from suppliers';
COMMENT ON TABLE supplier_invoice_lines IS 'Line items for supplier invoices with account coding for bookkeeping';
