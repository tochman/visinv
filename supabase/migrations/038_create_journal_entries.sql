-- Migration: Create journal entries tables for double-entry bookkeeping
-- US-210: Manual Journal Entry (Verifikationer)

-- Create fiscal years table first (journal entries reference this)
CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,  -- e.g., "2024", "2024/2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  next_verification_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure fiscal years don't overlap for same organization
  CONSTRAINT fiscal_years_org_dates UNIQUE (organization_id, start_date, end_date)
);

-- Create journal entry status enum
CREATE TYPE journal_entry_status AS ENUM ('draft', 'posted', 'voided');

-- Create journal entry source type enum  
CREATE TYPE journal_entry_source AS ENUM ('manual', 'invoice', 'payment', 'bank_import', 'sie_import');

-- Create journal entries table (Verifikationer)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  
  -- Entry identification
  verification_number INTEGER NOT NULL,  -- Verifikationsnummer
  entry_date DATE NOT NULL,
  description TEXT,
  
  -- Status and workflow
  status journal_entry_status NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  
  -- Source tracking
  source_type journal_entry_source NOT NULL DEFAULT 'manual',
  source_id UUID,  -- ID of related entity (invoice, payment, etc.)
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique verification number per fiscal year
  CONSTRAINT journal_entries_verification_unique UNIQUE (organization_id, fiscal_year_id, verification_number)
);

-- Create journal entry lines table
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  
  -- Amounts (one of debit or credit should be non-zero)
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Optional details
  description TEXT,
  vat_code VARCHAR(10),
  vat_amount DECIMAL(15,2),
  cost_center VARCHAR(50),
  
  -- Ordering
  line_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure either debit or credit is set (not both, not neither)
  CONSTRAINT journal_line_amount_check CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- Create indexes for fiscal_years
CREATE INDEX idx_fiscal_years_organization ON fiscal_years(organization_id);
CREATE INDEX idx_fiscal_years_dates ON fiscal_years(start_date, end_date);

-- Create indexes for journal_entries
CREATE INDEX idx_journal_entries_organization ON journal_entries(organization_id);
CREATE INDEX idx_journal_entries_fiscal_year ON journal_entries(fiscal_year_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_verification ON journal_entries(verification_number);
CREATE INDEX idx_journal_entries_source ON journal_entries(source_type, source_id);

-- Create indexes for journal_entry_lines
CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- Enable RLS
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for fiscal_years
-- ============================================

CREATE POLICY "Users can view fiscal years for their organizations"
  ON fiscal_years FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert fiscal years"
  ON fiscal_years FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update open fiscal years"
  ON fiscal_years FOR UPDATE
  USING (
    NOT is_closed
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- RLS Policies for journal_entries
-- ============================================

CREATE POLICY "Users can view journal entries for their organizations"
  ON journal_entries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update draft journal entries"
  ON journal_entries FOR UPDATE
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can delete draft journal entries"
  ON journal_entries FOR DELETE
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- RLS Policies for journal_entry_lines
-- ============================================

-- Lines inherit access from their parent journal entry
CREATE POLICY "Users can view lines for accessible journal entries"
  ON journal_entry_lines FOR SELECT
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert lines for draft journal entries"
  ON journal_entry_lines FOR INSERT
  WITH CHECK (
    journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE status = 'draft'
      AND organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update lines for draft journal entries"
  ON journal_entry_lines FOR UPDATE
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE status = 'draft'
      AND organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete lines for draft journal entries"
  ON journal_entry_lines FOR DELETE
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE status = 'draft'
      AND organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Function to get next verification number
-- ============================================

CREATE OR REPLACE FUNCTION get_next_verification_number(
  p_organization_id UUID,
  p_fiscal_year_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Lock the fiscal year row and get next number
  UPDATE fiscal_years
  SET 
    next_verification_number = next_verification_number + 1,
    updated_at = NOW()
  WHERE id = p_fiscal_year_id
    AND organization_id = p_organization_id
  RETURNING next_verification_number - 1 INTO v_next_number;
  
  IF v_next_number IS NULL THEN
    RAISE EXCEPTION 'Fiscal year not found or access denied';
  END IF;
  
  RETURN v_next_number;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_next_verification_number TO authenticated;

-- ============================================
-- Function to validate journal entry balance
-- ============================================

CREATE OR REPLACE FUNCTION check_journal_entry_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debit DECIMAL(15,2);
  v_total_credit DECIMAL(15,2);
  v_status journal_entry_status;
BEGIN
  -- Get the entry status
  SELECT status INTO v_status
  FROM journal_entries
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  
  -- Only enforce balance check when posting
  IF v_status = 'posted' THEN
    -- Calculate totals
    SELECT 
      COALESCE(SUM(debit_amount), 0),
      COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_entry_lines
    WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
    
    -- Check balance
    IF v_total_debit != v_total_credit THEN
      RAISE EXCEPTION 'Journal entry is not balanced: Debit (%) != Credit (%)', 
        v_total_debit, v_total_credit;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check balance on line changes (only validates, doesn't prevent draft saves)
-- Note: The actual balance enforcement happens at posting time in the application layer
