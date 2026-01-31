-- Migration: Add proficiency_level to profiles
-- US-124: User Proficiency Level & Adaptive UI
-- Enables self-assessment of accounting/software proficiency to drive adaptive UI

-- Add proficiency level enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proficiency_level') THEN
    CREATE TYPE proficiency_level AS ENUM ('novice', 'basic', 'proficient', 'expert');
  END IF;
END $$;

-- Add proficiency_level column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS proficiency_level proficiency_level DEFAULT 'basic';

-- Add timestamp for when proficiency was explicitly set by user
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS proficiency_set_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.proficiency_level IS 'US-124: User self-assessed proficiency level for adaptive UI. novice=maximum guidance, basic=default, proficient=full features, expert=power user';
COMMENT ON COLUMN profiles.proficiency_set_at IS 'US-124: Timestamp when user explicitly set their proficiency level (null if never set/using default)';
