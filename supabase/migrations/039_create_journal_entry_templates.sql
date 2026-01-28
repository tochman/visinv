-- Migration: Create journal entry templates for US-213
-- US-213: Journal Entry Templates

-- Create journal entry templates table
CREATE TABLE journal_entry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template identification
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Default values for new entries
  default_description TEXT,
  
  -- Usage tracking
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique template name per organization
  CONSTRAINT journal_entry_templates_name_unique UNIQUE (organization_id, name)
);

-- Create template lines table
CREATE TABLE journal_entry_template_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES journal_entry_templates(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  
  -- Default amounts (can be 0 if user fills in each time)
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Optional details
  description TEXT,
  vat_code VARCHAR(10),
  
  -- Ordering
  line_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_jet_organization ON journal_entry_templates(organization_id);
CREATE INDEX idx_jet_name ON journal_entry_templates(name);
CREATE INDEX idx_jet_use_count ON journal_entry_templates(use_count DESC);
CREATE INDEX idx_jetl_template ON journal_entry_template_lines(template_id);
CREATE INDEX idx_jetl_account ON journal_entry_template_lines(account_id);

-- Enable RLS
ALTER TABLE journal_entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_template_lines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for journal_entry_templates
-- ============================================

CREATE POLICY "Users can view templates for their organizations"
  ON journal_entry_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert templates"
  ON journal_entry_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update templates"
  ON journal_entry_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete templates"
  ON journal_entry_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- RLS Policies for journal_entry_template_lines
-- ============================================

CREATE POLICY "Users can view template lines for accessible templates"
  ON journal_entry_template_lines FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM journal_entry_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert template lines"
  ON journal_entry_template_lines FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM journal_entry_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update template lines"
  ON journal_entry_template_lines FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM journal_entry_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete template lines"
  ON journal_entry_template_lines FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM journal_entry_templates
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );
