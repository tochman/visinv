-- Migration: Create suppliers table for US-261
-- Suppliers/Vendors register for tracking business expenses

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  name TEXT NOT NULL,
  organization_number TEXT, -- Org nr (556XXXXXXX for Swedish companies)
  vat_number TEXT, -- VAT/Moms number (SE556XXXXXXX01)
  
  -- Contact Information
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'SE',
  
  -- Banking Details
  bank_account TEXT,
  bank_name TEXT,
  iban TEXT,
  swift_bic TEXT,
  
  -- Payment Terms
  default_payment_terms_days INTEGER DEFAULT 30,
  payment_method TEXT, -- 'bank_transfer', 'autogiro', 'card', 'cash'
  
  -- Accounting Defaults
  default_expense_account_id UUID REFERENCES accounts(id),
  default_payable_account_id UUID REFERENCES accounts(id), -- Usually 2440 (Leverantörsskulder)
  
  -- Settings
  currency TEXT DEFAULT 'SEK',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_supplier_org_number UNIQUE(organization_id, organization_number)
);

-- Indexes for performance
CREATE INDEX idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- RLS Policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Users can view suppliers in their organization
CREATE POLICY suppliers_select_policy ON suppliers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert suppliers in their organization
CREATE POLICY suppliers_insert_policy ON suppliers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update suppliers in their organization
CREATE POLICY suppliers_update_policy ON suppliers
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete suppliers in their organization
CREATE POLICY suppliers_delete_policy ON suppliers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Update trigger
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE suppliers IS 'Supplier/vendor register for tracking business expenses (US-261)';
COMMENT ON COLUMN suppliers.default_payment_terms_days IS 'Default payment terms in days (e.g., 30 for Net 30)';
COMMENT ON COLUMN suppliers.default_payable_account_id IS 'Default accounts payable account (typically 2440 Leverantörsskulder)';
