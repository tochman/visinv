-- Migration: Create accounts table for Chart of Accounts (BAS Kontoplanen)
-- US-201: Swedish BAS standard chart of accounts

-- Create enum for account classes (BAS standard)
CREATE TYPE account_class AS ENUM (
  'assets',           -- Tillgångar (1xxx)
  'liabilities',      -- Skulder (2xxx)
  'equity',           -- Eget kapital (2xxx)
  'revenue',          -- Intäkter (3xxx)
  'expenses',         -- Kostnader (4xxx-7xxx)
  'financial',        -- Finansiella poster (8xxx)
  'year_end'          -- Bokslutskonton (8xxx)
);

-- Create enum for account types
CREATE TYPE account_type AS ENUM (
  'header',           -- Group header (summering)
  'detail',           -- Posting account (bokföringskonto)
  'total'             -- Total/summary account
);

-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Account identification
  account_number VARCHAR(10) NOT NULL,  -- BAS account number (e.g., '1910', '3010')
  name TEXT NOT NULL,                    -- Swedish name
  name_en TEXT,                          -- English name (optional)
  description TEXT,                      -- Additional description
  
  -- Classification
  account_class account_class NOT NULL,
  account_type account_type NOT NULL DEFAULT 'detail',
  
  -- Hierarchy
  parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Flags
  is_system BOOLEAN NOT NULL DEFAULT false,  -- System account (from BAS seed)
  is_active BOOLEAN NOT NULL DEFAULT true,   -- Can be used for bookkeeping
  is_locked BOOLEAN NOT NULL DEFAULT false,  -- Cannot be modified
  
  -- VAT handling
  default_vat_rate DECIMAL(5,2),  -- Default VAT rate for this account
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT accounts_org_number_unique UNIQUE (organization_id, account_number)
);

-- Create indexes
CREATE INDEX idx_accounts_organization ON accounts(organization_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_class ON accounts(account_class);
CREATE INDEX idx_accounts_active ON accounts(is_active) WHERE is_active = true;
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view accounts for organizations they belong to
CREATE POLICY "Users can view accounts for their organizations"
  ON accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users with owner/admin role can insert accounts
CREATE POLICY "Owners and admins can insert accounts"
  ON accounts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Users with owner/admin role can update accounts (except locked ones)
CREATE POLICY "Owners and admins can update unlocked accounts"
  ON accounts FOR UPDATE
  USING (
    NOT is_locked
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Users with owner role can delete non-system accounts
CREATE POLICY "Owners can delete non-system accounts"
  ON accounts FOR DELETE
  USING (
    NOT is_system
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE accounts IS 'Chart of Accounts following Swedish BAS standard (Bokföringsplan enligt BAS)';
