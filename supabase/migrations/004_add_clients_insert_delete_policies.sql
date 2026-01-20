-- Add missing INSERT and DELETE policies for clients table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

-- Clients INSERT policy
CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Clients DELETE policy
CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_team_admin(team_id)
  );
