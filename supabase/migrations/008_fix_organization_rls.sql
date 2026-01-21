-- Fix infinite recursion in organization_members RLS policies
-- The issue: policies were querying the same table they protect
-- Solution: Use SECURITY DEFINER functions to bypass RLS during policy checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON organization_members;

-- Create helper function to get user's organization IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = user_uuid;
$$;

-- Create helper function to check if user is admin of an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION is_org_admin(org_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_uuid 
    AND user_id = user_uuid 
    AND role IN ('owner', 'admin')
  );
$$;

-- Organization Members RLS Policies (Fixed - using security definer functions)

-- Users can view members of organizations they belong to
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Organization owners/admins can invite members
-- Also allow insert if user_id matches auth.uid() (for initial membership via trigger)
CREATE POLICY "Organization admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    is_org_admin(organization_id, auth.uid()) 
    OR user_id = auth.uid()  -- Allow users to be added to orgs (via trigger)
  );

-- Organization owners/admins can update member roles
CREATE POLICY "Organization admins can update members"
  ON organization_members FOR UPDATE
  USING (is_org_admin(organization_id, auth.uid()));

-- Organization owners/admins can remove members
CREATE POLICY "Organization admins can remove members"
  ON organization_members FOR DELETE
  USING (is_org_admin(organization_id, auth.uid()));
