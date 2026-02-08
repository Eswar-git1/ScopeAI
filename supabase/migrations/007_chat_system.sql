-- ============================================
-- CHAT SYSTEM TABLES
-- ============================================

-- Drop existing tables to ensure schema consistency for the new chat system
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Chat sessions (conversation threads)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]', -- [{paragraph_id, section_id, section_title, similarity}]
  metadata JSONB DEFAULT '{}', -- {tokens, latency, model, confidence, retrievalMethod}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_document_user ON chat_sessions(document_id, user_id);
CREATE INDEX idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- Function to update session timestamp
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session timestamp
CREATE TRIGGER chat_message_updates_session
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_timestamp();

-- Function to auto-generate session titles
CREATE OR REPLACE FUNCTION generate_session_title()
RETURNS TRIGGER AS $$
DECLARE
  first_message TEXT;
BEGIN
  -- Get first user message
  SELECT content INTO first_message
  FROM chat_messages
  WHERE session_id = NEW.session_id
    AND role = 'user'
  ORDER BY created_at
  LIMIT 1;

  -- Generate title from first 50 chars
  IF first_message IS NOT NULL AND NEW.title IS NULL THEN
    UPDATE chat_sessions
    SET title = LEFT(first_message, 50) || CASE WHEN LENGTH(first_message) > 50 THEN '...' ELSE '' END
    WHERE id = NEW.session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate title after first message
CREATE TRIGGER auto_generate_session_title
AFTER INSERT ON chat_messages
FOR EACH ROW
WHEN (NEW.role = 'user')
EXECUTE FUNCTION generate_session_title();

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY chat_sessions_select ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY chat_sessions_insert ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_sessions_update ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY chat_sessions_delete ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Users can see messages from their sessions
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Add full-text search for chat messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_chat_messages_search ON chat_messages USING GIN(search_vector);

COMMENT ON TABLE chat_sessions IS 'Chat conversation sessions for RAG chatbot';
COMMENT ON TABLE chat_messages IS 'Individual messages in chat sessions with source citations';

-- ============================================
-- VECTOR SEARCH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION match_paragraphs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  p_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  paragraph_id text,
  content text,
  section_id text,
  section_title text,
  similarity float,
  order_index int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.paragraph_id,
    p.content,
    p.section_id,
    s.title as section_title,
    1 - (e.embedding <=> query_embedding) as similarity,
    p.order_index
  FROM embeddings e
  JOIN paragraphs p ON e.paragraph_id = p.paragraph_id
  JOIN sections s ON p.section_id = s.section_id
  WHERE (p_document_id IS NULL OR p.document_id = p_document_id)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_paragraphs IS 'Semantic search using vector similarity for RAG chatbot';
