-- Fix RLS policies for organizations table
-- The issue: INSERT policy check was being affected by SELECT policy subquery

-- Drop and recreate the INSERT policy to be explicit
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Any authenticated user can create an organization
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also ensure the SELECT policy doesn't cause recursion issues
-- by using a SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_organization_ids(auth.uid())));

-- Update the UPDATE policy similarly  
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;

CREATE POLICY "Organization owners can update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_org_admin(id, auth.uid()));

-- Update DELETE policy
DROP POLICY IF EXISTS "Organization owners can delete" ON organizations;

CREATE POLICY "Organization owners can delete"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
    )
  );
