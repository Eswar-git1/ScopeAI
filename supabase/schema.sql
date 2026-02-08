-- ============================================================
-- SCOPE INTELLIGENCE PLATFORM - DATABASE SCHEMA (FIXED)
-- ============================================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'commenter', 'reviewer', 'editor', 'owner', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ============================================================
-- 2. DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
  current_version_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_created_by ON public.documents(created_by);

-- ============================================================
-- 3. DOCUMENT VERSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  change_summary TEXT,
  is_major_version BOOLEAN DEFAULT false,
  parent_version_id UUID REFERENCES public.document_versions(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

CREATE INDEX idx_doc_versions_doc ON public.document_versions(document_id);
CREATE INDEX idx_doc_versions_created ON public.document_versions(created_at DESC);

-- Add foreign key for current_version_id after document_versions exists
ALTER TABLE public.documents 
ADD CONSTRAINT fk_current_version 
FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id);

-- ============================================================
-- 4. SECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
  section_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  parent_section_id UUID REFERENCES public.sections(id),
  level INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_version_id, section_id)
);

CREATE INDEX idx_sections_version ON public.sections(document_version_id);
CREATE INDEX idx_sections_parent ON public.sections(parent_section_id);
CREATE INDEX idx_sections_order ON public.sections(document_version_id, order_index);

-- ============================================================
-- 5. PARAGRAPHS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.paragraphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  paragraph_id VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'accepted', 'escalated')),
  metadata JSONB DEFAULT '{}',
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, paragraph_id)
);

CREATE INDEX idx_paragraphs_section ON public.paragraphs(section_id);
CREATE INDEX idx_paragraphs_status ON public.paragraphs(status);
CREATE INDEX idx_paragraphs_search ON public.paragraphs USING GIN(search_vector);
CREATE INDEX idx_paragraphs_order ON public.paragraphs(section_id, order_index);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION update_paragraph_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.paragraph_id, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER paragraphs_search_update
BEFORE INSERT OR UPDATE ON public.paragraphs
FOR EACH ROW EXECUTE FUNCTION update_paragraph_search_vector();

-- ============================================================
-- 6. EMBEDDINGS (for RAG)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  chunk_index INTEGER DEFAULT 0,
  chunk_text TEXT NOT NULL,
  section_context TEXT,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_paragraph ON public.embeddings(paragraph_id);
CREATE INDEX idx_embeddings_vector ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 7. COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id),
  author_id UUID REFERENCES public.profiles(id),
  comment_type VARCHAR(50) NOT NULL CHECK (comment_type IN ('suggestion', 'objection', 'clarification', 'observation', 'approval', 'question')),
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated', 'deferred')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] DEFAULT '{}',
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_note TEXT
);

CREATE INDEX idx_comments_paragraph ON public.comments(paragraph_id);
CREATE INDEX idx_comments_author ON public.comments(author_id);
CREATE INDEX idx_comments_status ON public.comments(status);
CREATE INDEX idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_created ON public.comments(created_at DESC);

-- ============================================================
-- 8. DECISIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id),
  decision_type VARCHAR(50) NOT NULL CHECK (decision_type IN ('accepted', 'rejected', 'deferred', 'modified')),
  decision_summary TEXT NOT NULL,
  rationale TEXT,
  impact_assessment TEXT,
  action_items JSONB DEFAULT '[]',
  related_decisions UUID[] DEFAULT '{}',
  is_final BOOLEAN DEFAULT false,
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_paragraph ON public.decisions(paragraph_id);
CREATE INDEX idx_decisions_decided_at ON public.decisions(decided_at DESC);

-- ============================================================
-- 9. CHANGE LOGS (Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('paragraph', 'section', 'document', 'comment', 'decision')),
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  before_snapshot JSONB,
  after_snapshot JSONB,
  change_summary TEXT,
  ip_address INET
);

CREATE INDEX idx_change_logs_entity ON public.change_logs(entity_type, entity_id);
CREATE INDEX idx_change_logs_changed_at ON public.change_logs(changed_at DESC);
CREATE INDEX idx_change_logs_changed_by ON public.change_logs(changed_by);

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('comment_reply', 'mention', 'status_change', 'escalation', 'resolution', 'decision')),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================================
-- 11. CHAT MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  document_version_id UUID REFERENCES public.document_versions(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  retrieved_paragraphs UUID[] DEFAULT '{}',
  model_used VARCHAR(100),
  token_count INTEGER,
  latency_ms INTEGER,
  feedback VARCHAR(20) CHECK (feedback IN ('thumbs_up', 'thumbs_down', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_created ON public.chat_messages(created_at DESC);

-- ============================================================
-- 12. DOCUMENT PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('viewer', 'commenter', 'reviewer', 'editor', 'owner')),
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

CREATE INDEX idx_doc_permissions_doc ON public.document_permissions(document_id);
CREATE INDEX idx_doc_permissions_user ON public.document_permissions(user_id);

-- ============================================================
-- 13. USER PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_email BOOLEAN DEFAULT true,
  notification_frequency VARCHAR(20) DEFAULT 'realtime' CHECK (notification_frequency IN ('realtime', 'daily', 'weekly')),
  theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  preferences JSONB DEFAULT '{}'
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Documents: Viewable by users with permissions
CREATE POLICY "Documents viewable by permitted users" ON public.documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.document_permissions 
    WHERE document_id = documents.id AND user_id = auth.uid()
  ) OR created_by = auth.uid()
);

-- Document versions: Viewable if user can view document
CREATE POLICY "Versions viewable if document accessible" ON public.document_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE d.id = document_versions.document_id AND dp.user_id = auth.uid()
  )
);

-- Sections: Viewable if version accessible
CREATE POLICY "Sections viewable if version accessible" ON public.sections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE dv.id = sections.document_version_id AND dp.user_id = auth.uid()
  )
);

-- Paragraphs: Viewable if section accessible
CREATE POLICY "Paragraphs viewable if section accessible" ON public.paragraphs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE s.id = paragraphs.section_id AND dp.user_id = auth.uid()
  )
);

-- Comments: Viewable if paragraph accessible
CREATE POLICY "Comments viewable if paragraph accessible" ON public.comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE p.id = comments.paragraph_id AND dp.user_id = auth.uid()
  )
);

-- Comments: Users with commenter+ role can create
CREATE POLICY "Commenters can create comments" ON public.comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE p.id = paragraph_id 
    AND dp.user_id = auth.uid() 
    AND dp.role IN ('commenter', 'reviewer', 'editor', 'owner')
  )
);

-- Notifications: Users can only see their own
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Chat messages: Users can see their own
CREATE POLICY "Users see own chat messages" ON public.chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own chat messages" ON public.chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

-- User preferences: Users can manage their own
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (user_id = auth.uid());

-- Change logs: Viewable by all authenticated users
CREATE POLICY "Change logs viewable" ON public.change_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Decisions: Viewable by all authenticated users
CREATE POLICY "Decisions viewable" ON public.decisions FOR SELECT USING (auth.uid() IS NOT NULL);

-- Embeddings: Viewable by all authenticated users
CREATE POLICY "Embeddings viewable" ON public.embeddings FOR SELECT USING (auth.uid() IS NOT NULL);

-- Document permissions: Viewable by document owners
CREATE POLICY "Permissions viewable by owners" ON public.document_permissions FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = document_permissions.document_id 
    AND dp.user_id = auth.uid() 
    AND dp.role = 'owner'
  )
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for semantic search
CREATE OR REPLACE FUNCTION match_paragraphs(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  paragraph_id VARCHAR(100),
  content TEXT,
  section_context TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.paragraph_id,
    p.content,
    e.section_context,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM public.embeddings e
  JOIN public.paragraphs p ON p.id = e.paragraph_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
