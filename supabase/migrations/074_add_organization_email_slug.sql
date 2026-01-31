-- Migration: US-264a Organization Email Slug Management
-- Adds email_slug column to organizations and creates history table for tracking slug changes.
-- Slugs are used for receiving supplier invoices via email (e.g., company_name@dortal.resend.app)

-- ============================================
-- RESERVED SLUGS (System Reserved)
-- ============================================
-- Block list of slugs that cannot be used by organizations
CREATE OR REPLACE FUNCTION is_reserved_slug(slug TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN slug = ANY(ARRAY[
    'admin', 'support', 'billing', 'help', 'info', 'noreply', 
    'postmaster', 'abuse', 'security', 'sales', 'contact', 
    'system', 'test', 'invoice', 'invoices', 'mail', 'email',
    'dortal', 'svethna', 'api', 'app', 'www', 'ftp', 'smtp'
  ]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- SLUG GENERATION FUNCTION
-- ============================================
-- Generates a URL-safe slug from organization name
-- - Transliterates Swedish characters (å→a, ä→a, ö→o)
-- - Converts to lowercase
-- - Replaces spaces and special chars with underscores
-- - Removes consecutive underscores
-- - Truncates to 50 characters at word boundary
CREATE OR REPLACE FUNCTION generate_email_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  IF org_name IS NULL OR org_name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Start with the name
  slug := org_name;
  
  -- Transliterate Swedish characters
  slug := translate(slug, 'åäöÅÄÖ', 'aaoAAO');
  
  -- Transliterate other common diacritics
  slug := translate(slug, 'àáâãéèêëíìîïóòôõúùûüñç', 'aaaaeeeeiiiioooouuuunc');
  slug := translate(slug, 'ÀÁÂÃÉÈÊËÍÌÎÏÓÒÔÕÚÙÛÜÑÇ', 'AAAAEEEEIIIIOOOOUUUUNC');
  
  -- Convert to lowercase
  slug := lower(slug);
  
  -- Replace spaces and common separators with underscores
  slug := regexp_replace(slug, '[\s\-\.]+', '_', 'g');
  
  -- Remove all non-alphanumeric characters except underscores
  slug := regexp_replace(slug, '[^a-z0-9_]', '', 'g');
  
  -- Remove consecutive underscores
  slug := regexp_replace(slug, '_+', '_', 'g');
  
  -- Remove leading/trailing underscores
  slug := trim(both '_' from slug);
  
  -- Truncate to 50 characters at word boundary (underscore)
  IF length(slug) > 50 THEN
    slug := substring(slug from 1 for 50);
    -- Try to cut at last underscore to avoid partial words
    IF position('_' in reverse(slug)) > 0 THEN
      slug := substring(slug from 1 for (50 - position('_' in reverse(slug))));
    END IF;
  END IF;
  
  -- Ensure minimum length of 3
  IF length(slug) < 3 THEN
    slug := slug || '_org';
  END IF;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- ORGANIZATION EMAIL SLUG HISTORY TABLE
-- ============================================
-- Tracks historical slugs so old email addresses remain valid
CREATE TABLE IF NOT EXISTS organization_email_slug_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  replaced_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(slug)
);

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_org_email_slug_history_slug ON organization_email_slug_history(slug);
CREATE INDEX IF NOT EXISTS idx_org_email_slug_history_org_id ON organization_email_slug_history(organization_id);

-- ============================================
-- ADD EMAIL_SLUG COLUMN TO ORGANIZATIONS
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_slug TEXT UNIQUE;

-- Create index for fast slug lookups on organizations
CREATE INDEX IF NOT EXISTS idx_organizations_email_slug ON organizations(email_slug);

-- ============================================
-- SLUG UNIQUENESS CHECK FUNCTION
-- ============================================
-- Checks if a slug is available (not used by any org or in history)
CREATE OR REPLACE FUNCTION is_slug_available(check_slug TEXT, exclude_org_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  slug_exists BOOLEAN;
BEGIN
  -- Check if reserved
  IF is_reserved_slug(check_slug) THEN
    RETURN FALSE;
  END IF;
  
  -- Check current slugs (excluding the specified org)
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE email_slug = check_slug 
    AND (exclude_org_id IS NULL OR id != exclude_org_id)
  ) INTO slug_exists;
  
  IF slug_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check historical slugs (excluding history entries for the specified org)
  SELECT EXISTS(
    SELECT 1 FROM organization_email_slug_history 
    WHERE slug = check_slug 
    AND (exclude_org_id IS NULL OR organization_id != exclude_org_id)
  ) INTO slug_exists;
  
  RETURN NOT slug_exists;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GENERATE UNIQUE SLUG FUNCTION
-- ============================================
-- Generates a unique slug, appending numbers if necessary
CREATE OR REPLACE FUNCTION generate_unique_email_slug(org_name TEXT, org_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 2;
BEGIN
  base_slug := generate_email_slug(org_name);
  
  IF base_slug IS NULL THEN
    base_slug := 'organization';
  END IF;
  
  -- Check if base slug is available
  IF is_slug_available(base_slug, org_id) THEN
    RETURN base_slug;
  END IF;
  
  -- Try appending numbers until we find an available slug
  LOOP
    final_slug := base_slug || '_' || counter;
    EXIT WHEN is_slug_available(final_slug, org_id);
    counter := counter + 1;
    
    -- Safety limit
    IF counter > 1000 THEN
      final_slug := base_slug || '_' || extract(epoch from now())::integer;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: AUTO-GENERATE SLUG ON INSERT
-- ============================================
CREATE OR REPLACE FUNCTION trigger_generate_org_email_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if email_slug is not provided
  IF NEW.email_slug IS NULL THEN
    NEW.email_slug := generate_unique_email_slug(NEW.name, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_org_email_slug ON organizations;
CREATE TRIGGER trg_generate_org_email_slug
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_org_email_slug();

-- ============================================
-- TRIGGER: TRACK SLUG HISTORY ON UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION trigger_track_slug_history()
RETURNS TRIGGER AS $$
BEGIN
  -- If slug is changing (and old slug exists)
  IF OLD.email_slug IS NOT NULL AND OLD.email_slug != NEW.email_slug THEN
    -- Check if old slug is already in history (shouldn't happen, but be safe)
    IF NOT EXISTS (
      SELECT 1 FROM organization_email_slug_history 
      WHERE organization_id = OLD.id AND slug = OLD.email_slug
    ) THEN
      -- Add old slug to history
      INSERT INTO organization_email_slug_history (organization_id, slug, replaced_at)
      VALUES (OLD.id, OLD.email_slug, NOW());
    ELSE
      -- Update the replaced_at timestamp
      UPDATE organization_email_slug_history 
      SET replaced_at = NOW()
      WHERE organization_id = OLD.id AND slug = OLD.email_slug;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_slug_history ON organizations;
CREATE TRIGGER trg_track_slug_history
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  WHEN (OLD.email_slug IS DISTINCT FROM NEW.email_slug)
  EXECUTE FUNCTION trigger_track_slug_history();

-- ============================================
-- FUNCTION: FIND ORGANIZATION BY SLUG
-- ============================================
-- Looks up organization by current slug or historical slug
CREATE OR REPLACE FUNCTION find_organization_by_slug(lookup_slug TEXT)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- First check current slugs
  SELECT id INTO org_id FROM organizations WHERE email_slug = lookup_slug;
  
  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;
  
  -- Check historical slugs
  SELECT organization_id INTO org_id 
  FROM organization_email_slug_history 
  WHERE slug = lookup_slug;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RLS POLICIES FOR SLUG HISTORY
-- ============================================
ALTER TABLE organization_email_slug_history ENABLE ROW LEVEL SECURITY;

-- Users can view slug history for organizations they're members of
CREATE POLICY "Users can view slug history for their organizations"
  ON organization_email_slug_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Only owners/admins can manage slug history (via trigger, not direct access)
-- No direct INSERT/UPDATE/DELETE policies - history is managed by triggers

-- ============================================
-- GENERATE SLUGS FOR EXISTING ORGANIZATIONS
-- ============================================
-- Update existing organizations that don't have a slug
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id, name FROM organizations WHERE email_slug IS NULL
  LOOP
    UPDATE organizations 
    SET email_slug = generate_unique_email_slug(org.name, org.id)
    WHERE id = org.id;
  END LOOP;
END $$;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN organizations.email_slug IS 'Unique slug used for inbound email address (e.g., {slug}@dortal.resend.app)';
COMMENT ON TABLE organization_email_slug_history IS 'Historical slugs that remain valid for email routing even after slug changes';
COMMENT ON FUNCTION generate_email_slug(TEXT) IS 'Generates a URL-safe slug from organization name with Swedish character transliteration';
COMMENT ON FUNCTION is_slug_available(TEXT, UUID) IS 'Checks if a slug is available (not reserved, not in use by other orgs)';
COMMENT ON FUNCTION find_organization_by_slug(TEXT) IS 'Finds organization ID by current or historical slug';
