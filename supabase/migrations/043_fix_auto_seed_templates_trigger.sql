-- Migration: Fix auto_seed_templates_after_accounts trigger
-- The accounts table doesn't have a created_by column, but the trigger was trying to access NEW.created_by
-- This caused error: record "new" has no field "created_by"

-- Drop and recreate the trigger function without referencing created_by
CREATE OR REPLACE FUNCTION auto_seed_templates_after_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_count INTEGER;
  v_template_count INTEGER;
BEGIN
  -- Only proceed for new accounts
  IF TG_OP = 'INSERT' THEN
    -- Count how many accounts this organization has now
    SELECT COUNT(*) INTO v_account_count
    FROM accounts
    WHERE organization_id = NEW.organization_id;
    
    -- Count existing templates
    SELECT COUNT(*) INTO v_template_count
    FROM journal_entry_templates
    WHERE organization_id = NEW.organization_id;
    
    -- If this is the first batch of accounts (5+ accounts) and no templates exist yet
    -- then seed the common templates
    IF v_account_count >= 5 AND v_template_count = 0 THEN
      -- Check if we have the minimum required accounts for the templates
      IF EXISTS (
        SELECT 1 FROM accounts 
        WHERE organization_id = NEW.organization_id 
        AND account_number IN ('1510', '1930', '2440', '2610', '2640', '3010')
        HAVING COUNT(DISTINCT account_number) >= 4
      ) THEN
        -- Pass NULL for created_by since accounts table doesn't track this
        -- The seed function handles NULL created_by gracefully
        PERFORM seed_journal_entry_templates(NEW.organization_id, NULL);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- The trigger already exists, just the function needed to be updated
-- No need to recreate the trigger since it references the function by name

COMMENT ON FUNCTION auto_seed_templates_after_accounts() IS 'Automatically seeds common journal entry templates when an organization imports their first batch of accounts. Fixed to not reference non-existent created_by column on accounts table.';
