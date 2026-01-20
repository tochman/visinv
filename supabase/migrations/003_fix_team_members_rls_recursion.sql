-- Fix infinite recursion in team_members RLS policies
-- The issue: team_members policies query team_members table itself,
-- causing infinite recursion when checking membership.

-- Solution: Create SECURITY DEFINER functions that bypass RLS

-- Function to check if current user is a member of a specific team (bypasses RLS)
CREATE OR REPLACE FUNCTION is_team_member(check_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = auth.uid()
  ) INTO is_member;
  
  RETURN COALESCE(is_member, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is owner/admin of a specific team (bypasses RLS)
CREATE OR REPLACE FUNCTION is_team_admin(check_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) INTO is_admin_member;
  
  RETURN COALESCE(is_admin_member, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is owner of a specific team (bypasses RLS)
CREATE OR REPLACE FUNCTION is_team_owner(check_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = check_team_id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) INTO is_owner;
  
  RETURN COALESCE(is_owner, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all team IDs the current user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT team_id FROM team_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team_ids() TO authenticated;

-- ============================================
-- Drop and recreate team_members policies
-- ============================================

DROP POLICY IF EXISTS "Team members can view their team members" ON team_members;
DROP POLICY IF EXISTS "Team owners/admins can manage members" ON team_members;
DROP POLICY IF EXISTS "Team owners/admins can update members" ON team_members;
DROP POLICY IF EXISTS "Team owners/admins can remove members" ON team_members;

CREATE POLICY "Team members can view their team members"
  ON team_members FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Team owners/admins can manage members"
  ON team_members FOR INSERT
  WITH CHECK (is_team_admin(team_id));

CREATE POLICY "Team owners/admins can update members"
  ON team_members FOR UPDATE
  USING (is_team_admin(team_id));

CREATE POLICY "Team owners/admins can remove members"
  ON team_members FOR DELETE
  USING (
    is_team_admin(team_id)
    OR user_id = auth.uid() -- Users can leave teams themselves
  );

-- ============================================
-- Fix teams policies that also query team_members
-- ============================================

DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Team owners can update team" ON teams;
DROP POLICY IF EXISTS "Team owners can delete team" ON teams;

CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (id IN (SELECT get_user_team_ids()));

CREATE POLICY "Team owners can update team"
  ON teams FOR UPDATE
  USING (is_team_owner(id));

CREATE POLICY "Team owners can delete team"
  ON teams FOR DELETE
  USING (is_team_owner(id));

-- ============================================
-- Fix team_invitations policies that query team_members
-- ============================================

DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can delete invitations" ON team_invitations;

CREATE POLICY "Team admins can view invitations"
  ON team_invitations FOR SELECT
  USING (
    is_team_admin(team_id)
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (is_team_admin(team_id));

CREATE POLICY "Team admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (is_team_admin(team_id));

-- ============================================
-- Fix other tables that query team_members
-- ============================================

-- Clients
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;

CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (
    auth.uid() = user_id
    OR team_id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (
    auth.uid() = user_id
    OR is_team_admin(team_id)
  );

-- Products
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (
    auth.uid() = user_id
    OR team_id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (
    auth.uid() = user_id
    OR is_team_admin(team_id)
  );

-- Templates
DROP POLICY IF EXISTS "Users can view own and system templates" ON templates;

CREATE POLICY "Users can view own and system templates"
  ON templates FOR SELECT
  USING (
    is_system = TRUE
    OR auth.uid() = user_id
    OR team_id IN (SELECT get_user_team_ids())
  );

-- Invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (
    auth.uid() = user_id
    OR team_id IN (SELECT get_user_team_ids())
  );

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (team_id IN (SELECT get_user_team_ids()) AND is_team_member(team_id))
  );

-- Invoice Rows
DROP POLICY IF EXISTS "Users can view invoice rows" ON invoice_rows;
DROP POLICY IF EXISTS "Users can update invoice rows" ON invoice_rows;

CREATE POLICY "Users can view invoice rows"
  ON invoice_rows FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE user_id = auth.uid()
      OR team_id IN (SELECT get_user_team_ids())
    )
  );

CREATE POLICY "Users can update invoice rows"
  ON invoice_rows FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE user_id = auth.uid()
      OR team_id IN (SELECT get_user_team_ids())
    )
  );

-- Payments
DROP POLICY IF EXISTS "Users can view payments for their invoices" ON payments;

CREATE POLICY "Users can view payments for their invoices"
  ON payments FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE user_id = auth.uid()
      OR team_id IN (SELECT get_user_team_ids())
    )
  );
