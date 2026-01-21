-- COMPLETE FIX for organization RLS policies
-- Run this ONCE to fix all organization-related RLS issues
-- This script is idempotent - safe to run multiple times

-- ============================================
-- STEP 1: Drop ALL existing policies on both tables
-- ============================================

-- Drop all organization policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON organizations;

-- Drop all organization_members policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON organization_members;

-- ============================================
-- STEP 2: Create/Replace helper functions (SECURITY DEFINER)
-- These bypass RLS to prevent infinite recursion
-- ============================================

-- Function to get all organization IDs for a user
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = user_uuid;
$$;

-- Function to check if user is owner/admin of an organization
CREATE OR REPLACE FUNCTION is_org_admin(org_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_uuid 
    AND user_id = user_uuid 
    AND role IN ('owner', 'admin')
  );
$$;

-- Function to check if user is owner of an organization
CREATE OR REPLACE FUNCTION is_org_owner(org_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_uuid 
    AND user_id = user_uuid 
    AND role = 'owner'
  );
$$;

-- ============================================
-- STEP 3: Recreate the trigger function
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as the organization owner
  INSERT INTO public.organization_members (organization_id, user_id, role, is_default)
  VALUES (NEW.id, auth.uid(), 'owner', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION handle_new_organization();

-- ============================================
-- STEP 4: Enable RLS (idempotent)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create ORGANIZATIONS policies
-- ============================================

-- SELECT: Users can view organizations they belong to
CREATE POLICY "org_select_policy"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_organization_ids(auth.uid())));

-- INSERT: Any authenticated user can create an organization
-- The trigger will automatically add them as owner
CREATE POLICY "org_insert_policy"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Only owners/admins can update
CREATE POLICY "org_update_policy"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_org_admin(id, auth.uid()));

-- DELETE: Only owners can delete
CREATE POLICY "org_delete_policy"
  ON organizations FOR DELETE
  TO authenticated
  USING (is_org_owner(id, auth.uid()));

-- ============================================
-- STEP 6: Create ORGANIZATION_MEMBERS policies
-- ============================================

-- SELECT: Users can view members of orgs they belong to
CREATE POLICY "org_members_select_policy"
  ON organization_members FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- INSERT: Admins can add members, OR the trigger can add the creator
CREATE POLICY "org_members_insert_policy"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_org_admin(organization_id, auth.uid()) 
    OR user_id = auth.uid()
  );

-- UPDATE: Only admins can update member roles
CREATE POLICY "org_members_update_policy"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (is_org_admin(organization_id, auth.uid()));

-- DELETE: Only admins can remove members
CREATE POLICY "org_members_delete_policy"
  ON organization_members FOR DELETE
  TO authenticated
  USING (is_org_admin(organization_id, auth.uid()));

-- ============================================
-- VERIFICATION: Check policies exist
-- ============================================
-- You can run this to verify:
-- SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('organizations', 'organization_members');
