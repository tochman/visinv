-- FIX: Add created_by column to organizations and simplify INSERT policy
-- The issue: INSERT policy has WITH CHECK (true) but the trigger runs AFTER INSERT
-- This means the INSERT itself fails before the trigger can run

-- ============================================
-- STEP 1: Add created_by column to organizations
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================
-- STEP 2: Drop and recreate the INSERT policy
-- ============================================
DROP POLICY IF EXISTS "org_insert_policy" ON organizations;

-- INSERT: Users can create organizations where they set themselves as created_by
CREATE POLICY "org_insert_policy"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- STEP 3: Update the trigger function
-- Note: created_by is set by the service, not the trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as the organization owner
  INSERT INTO public.organization_members (organization_id, user_id, role, is_default)
  VALUES (NEW.id, NEW.created_by, 'owner', TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger to run AFTER insert (org must exist for FK constraint)
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION handle_new_organization();
