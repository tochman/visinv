-- Migration: Add Swedish Accounting Framework Support
-- Created: 2026-01-31
-- User Stories: US-283, US-284, US-285, US-286, US-289

-- Add accounting framework columns to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS accounting_framework VARCHAR(2) DEFAULT 'k2' CHECK (accounting_framework IN ('k1', 'k2', 'k3', 'k4')),
  ADD COLUMN IF NOT EXISTS chart_of_accounts_variant VARCHAR(50) DEFAULT 'bas2024',
  ADD COLUMN IF NOT EXISTS accounting_method VARCHAR(20) DEFAULT 'accrual' CHECK (accounting_method IN ('accrual', 'cash')),
  ADD COLUMN IF NOT EXISTS estimated_annual_revenue DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS employee_count INTEGER;

-- Comment on new columns
COMMENT ON COLUMN organizations.accounting_framework IS 'Swedish K-regelverk: k1 (micro), k2 (SMB), k3 (larger), k4 (listed)';
COMMENT ON COLUMN organizations.chart_of_accounts_variant IS 'Chart of accounts variant: bas2024, bas_handel, bas_service, custom';
COMMENT ON COLUMN organizations.accounting_method IS 'Accounting method: accrual (faktureringsmetoden) or cash (kontantmetoden)';
COMMENT ON COLUMN organizations.estimated_annual_revenue IS 'Estimated annual revenue in SEK for framework eligibility';
COMMENT ON COLUMN organizations.employee_count IS 'Number of employees for framework eligibility';

-- Create table for framework-specific account requirements
CREATE TABLE IF NOT EXISTS account_framework_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number VARCHAR(10) NOT NULL,
  framework VARCHAR(2) NOT NULL CHECK (framework IN ('k1', 'k2', 'k3', 'k4')),
  is_required BOOLEAN DEFAULT false,
  requirement_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_number, framework)
);

-- Comment on requirements table
COMMENT ON TABLE account_framework_requirements IS 'Defines which accounts are required for each K-regelverk';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_requirements_framework ON account_framework_requirements(framework, is_required);

-- Create table for framework change audit log
CREATE TABLE IF NOT EXISTS framework_change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('framework', 'method', 'kontoplan', 'settings')),
  field_name VARCHAR(50) NOT NULL,
  old_value VARCHAR(100),
  new_value VARCHAR(100),
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Comment on audit table
COMMENT ON TABLE framework_change_history IS 'Audit log for accounting framework configuration changes';

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_framework_history_org ON framework_change_history(organization_id, changed_at DESC);

-- Enable RLS on new tables
ALTER TABLE account_framework_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_change_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Anyone authenticated can read account requirements (public data)
CREATE POLICY "Anyone can read account requirements"
  ON account_framework_requirements
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS policy: Only service role can modify requirements (admin only)
CREATE POLICY "Service role can manage requirements"
  ON account_framework_requirements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS policy: Users can view their organization's framework history
CREATE POLICY "Users can view their organization framework history"
  ON framework_change_history
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Users can insert framework history for their organizations
CREATE POLICY "Users can log framework changes"
  ON framework_change_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Seed basic K2 requirements (most accounts optional for K2, some mandatory)
INSERT INTO account_framework_requirements (account_number, framework, is_required, requirement_reason)
VALUES 
  -- K2 mandatory accounts (Swedish law)
  ('1510', 'k2', true, 'Kundfordringar - Obligatoriskt för K2'),
  ('2440', 'k2', true, 'Leverantörsskulder - Obligatoriskt för K2'),
  ('2510', 'k2', true, 'Skatteskulder - Obligatoriskt för K2'),
  ('2611', 'k2', true, 'Utgående moms - Obligatoriskt för K2'),
  ('2640', 'k2', true, 'Ingående moms - Obligatoriskt för K2'),
  ('2050', 'k2', true, 'Övriga eget kapital - Obligatoriskt för K2'),
  ('2091', 'k2', true, 'Årets resultat - Obligatoriskt för K2')
ON CONFLICT (account_number, framework) DO NOTHING;

-- K3 has additional requirements (more detailed reporting)
INSERT INTO account_framework_requirements (account_number, framework, is_required, requirement_reason)
VALUES 
  -- All K2 requirements apply to K3
  ('1510', 'k3', true, 'Kundfordringar - Obligatoriskt för K3'),
  ('2440', 'k3', true, 'Leverantörsskulder - Obligatoriskt för K3'),
  ('2510', 'k3', true, 'Skatteskulder - Obligatoriskt för K3'),
  ('2611', 'k3', true, 'Utgående moms - Obligatoriskt för K3'),
  ('2640', 'k3', true, 'Ingående moms - Obligatoriskt för K3'),
  ('2050', 'k3', true, 'Övriga eget kapital - Obligatoriskt för K3'),
  ('2091', 'k3', true, 'Årets resultat - Obligatoriskt för K3'),
  -- Additional K3 requirements
  ('1229', 'k3', true, 'Ackumulerade avskrivningar - Obligatoriskt för K3 verkligt värde'),
  ('2330', 'k3', true, 'Uppskjuten skatteskuld - Obligatoriskt för K3')
ON CONFLICT (account_number, framework) DO NOTHING;

-- Grant permissions
GRANT SELECT ON account_framework_requirements TO authenticated;
GRANT SELECT, INSERT ON framework_change_history TO authenticated;
