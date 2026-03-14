CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  profile_id UUID REFERENCES profiles(id),
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_used_input INT NOT NULL DEFAULT 0,
  tokens_used_output INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_store ON ai_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);

CREATE TABLE IF NOT EXISTS ai_generation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  total INT NOT NULL DEFAULT 0,
  completed INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  query_original TEXT NOT NULL,
  interpretation JSONB NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_search_cache_expires ON ai_search_cache(expires_at);

CREATE TABLE IF NOT EXISTS constitution_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  profile_id UUID REFERENCES profiles(id),
  session_id TEXT NOT NULL,
  answers JSONB NOT NULL,
  scores JSONB NOT NULL,
  normalized_scores JSONB NOT NULL,
  primary_constitution TEXT NOT NULL,
  secondary_constitution TEXT,
  element_scores JSONB NOT NULL,
  confidence NUMERIC(4,2) NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  product_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  lifestyle_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_used_input INT NOT NULL DEFAULT 0,
  tokens_used_output INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_input INT NOT NULL DEFAULT 0,
  tokens_output INT NOT NULL DEFAULT 0,
  cost_input NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost_output NUMERIC(10,4) NOT NULL DEFAULT 0,
  cost_total NUMERIC(10,4) NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'Read own ai conversations'
  ) THEN
    CREATE POLICY "Read own ai conversations"
      ON ai_conversations FOR SELECT
      USING (profile_id IS NULL OR profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
  END IF;
END $$;
