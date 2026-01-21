-- Add foreign key relationship from organization_members to profiles
-- This enables joining organization_members with profiles in Supabase queries

-- Add a foreign key from organization_members.user_id to profiles.id
-- Note: profiles.id references auth.users.id, so this creates a valid chain
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key relationship from organization_invitations to profiles
-- This enables joining to get inviter details
ALTER TABLE organization_invitations
ADD CONSTRAINT organization_invitations_invited_by_profiles_fkey
FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;
