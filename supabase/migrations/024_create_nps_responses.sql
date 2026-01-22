-- Create NPS responses table for storing Net Promoter Score feedback
CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own NPS responses
CREATE POLICY "Users can insert own NPS responses"
  ON nps_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own NPS responses
CREATE POLICY "Users can read own NPS responses"
  ON nps_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_nps_responses_user_id ON nps_responses(user_id);
CREATE INDEX idx_nps_responses_created_at ON nps_responses(created_at);

-- Comment on table
COMMENT ON TABLE nps_responses IS 'Stores Net Promoter Score (NPS) survey responses from users';
COMMENT ON COLUMN nps_responses.score IS 'NPS score from 0 (not likely) to 10 (very likely)';
COMMENT ON COLUMN nps_responses.category IS 'Auto-generated: promoter (9-10), passive (7-8), detractor (0-6)';
