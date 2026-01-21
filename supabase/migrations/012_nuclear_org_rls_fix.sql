-- NUCLEAR OPTION: Complete reset of organization RLS
-- Run this to completely reset all organization policies

-- ============================================
-- STEP 1: Disable RLS temporarily
-- ============================================
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL policies (every possible name)
-- ============================================
DROP POLICY IF EXISTS "org_insert_policy" ON organizations;
DROP POLICY IF EXISTS "org_select_policy" ON organizations;
DROP POLICY IF EXISTS "org_update_policy" ON organizations;
DROP POLICY IF EXISTS "org_delete_policy" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON organizations;

DROP POLICY IF EXISTS "org_members_select_policy" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert_policy" ON organization_members;
DROP POLICY IF EXISTS "org_members_update_policy" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete_policy" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can remove members" ON organization_members;

-- ============================================
-- STEP 3: Ensure created_by column exists
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================
-- STEP 4: Re-enable RLS
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create simple policies (same pattern as clients table)
-- ============================================

-- ORGANIZATIONS: SELECT - users can see orgs they created
CREATE POLICY "organizations_select"
  ON organizations FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- ORGANIZATIONS: INSERT - users can create orgs with themselves as creator
CREATE POLICY "organizations_insert"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ORGANIZATIONS: UPDATE - users can update orgs they created
CREATE POLICY "organizations_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- ORGANIZATIONS: DELETE - users can delete orgs they created
CREATE POLICY "organizations_delete"
  ON organizations FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- STEP 6: Organization members policies
-- ============================================

-- MEMBERS: SELECT - users can see their own memberships
CREATE POLICY "org_members_select"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- MEMBERS: INSERT - handled by trigger (SECURITY DEFINER bypasses RLS)
CREATE POLICY "org_members_insert"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- MEMBERS: UPDATE - users can update their own membership
CREATE POLICY "org_members_update"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- MEMBERS: DELETE - users can remove themselves
CREATE POLICY "org_members_delete"
  ON organization_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STEP 7: Trigger for auto-adding creator as owner
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, is_default)
  VALUES (NEW.id, NEW.created_by, 'owner', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION handle_new_organization();

-- ============================================
-- VERIFY
-- ============================================
-- Run this to check:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('organizations', 'organization_members');
