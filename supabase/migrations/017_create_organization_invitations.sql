-- Create organization invitations table for US-056
-- Allows organization owners to invite users via email

-- ============================================
-- ORGANIZATION INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'associate')),
  invited_by UUID REFERENCES auth.users ON DELETE SET NULL NOT NULL,
  token TEXT UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  -- Prevent duplicate pending invitations for same email/org
  UNIQUE(organization_id, email)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires ON organization_invitations(expires_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organization owners can view invitations
CREATE POLICY "Organization owners can view invitations"
  ON organization_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );

-- Organization owners can create invitations
CREATE POLICY "Organization owners can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );

-- Organization owners can delete invitations
CREATE POLICY "Organization owners can delete invitations"
  ON organization_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );

-- Anyone can view invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
  ON organization_invitations FOR SELECT
  USING (token IS NOT NULL);

-- ============================================
-- UPDATE organization_members role constraint
-- Change from owner/admin/member/viewer to owner/associate
-- ============================================
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check 
  CHECK (role IN ('owner', 'associate'));

-- Update existing roles: map admin/member/viewer to associate
UPDATE organization_members SET role = 'associate' WHERE role IN ('admin', 'member', 'viewer');
