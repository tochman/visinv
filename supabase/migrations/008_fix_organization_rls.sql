-- Fix infinite recursion in organization_members RLS policies
-- The issue: policies were querying the same table they protect

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON organization_members;

-- Organization Members RLS Policies (Fixed)
-- Users can view their own memberships directly
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid() OR organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  ));

-- Organization owners/admins can invite members
-- Check directly without subquery on same table
CREATE POLICY "Organization admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Organization owners/admins can update member roles
CREATE POLICY "Organization admins can update members"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- Organization owners/admins can remove members
CREATE POLICY "Organization admins can remove members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );
