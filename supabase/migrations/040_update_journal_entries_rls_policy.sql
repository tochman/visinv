-- Migration: Update journal_entries RLS policy to allow posting
-- This allows updating a draft entry's status to 'posted'

-- Drop the existing update policy
DROP POLICY IF EXISTS "Members can update draft journal entries" ON journal_entries;

-- Create new policy that allows updating draft entries and posting them
-- USING: checks the OLD row (must be draft to update)
-- WITH CHECK: checks the NEW row (can be draft or posted)
CREATE POLICY "Members can update draft journal entries"
  ON journal_entries FOR UPDATE
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    status IN ('draft', 'posted')
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Members can update draft journal entries" ON journal_entries IS 
  'Allows organization members to update journal entries that are in draft status. The entry can be updated to draft or posted status.';
