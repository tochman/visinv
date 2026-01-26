-- Add additional tracking fields to NPS responses table for US-120
-- This allows tracking when surveys are shown vs when they're responded to,
-- and what action triggered the survey display

ALTER TABLE nps_responses
  ADD COLUMN IF NOT EXISTS shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trigger_context TEXT;

-- Update existing records to set responded_at to created_at
UPDATE nps_responses
SET responded_at = created_at
WHERE responded_at IS NULL;

-- Add comments for new columns
COMMENT ON COLUMN nps_responses.shown_at IS 'Timestamp when the NPS survey was first shown to the user';
COMMENT ON COLUMN nps_responses.responded_at IS 'Timestamp when the user actually submitted their response (NULL if dismissed without responding)';
COMMENT ON COLUMN nps_responses.trigger_context IS 'What action triggered the survey: invoice_created, client_created, or product_created';

-- Create index for checking last shown survey (for 30-day interval enforcement)
CREATE INDEX IF NOT EXISTS idx_nps_responses_user_shown_at ON nps_responses(user_id, shown_at DESC);
