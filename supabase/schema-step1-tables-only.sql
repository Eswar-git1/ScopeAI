-- ============================================================
-- STEP 1: TABLES ONLY (NO RLS POLICIES)
-- Run this first to create all tables
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- User profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  current_version_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);

-- Document versions
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

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_created ON public.document_versions(created_at DESC);

-- Sections
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

CREATE INDEX IF NOT EXISTS idx_sections_version ON public.sections(document_version_id);
CREATE INDEX IF NOT EXISTS idx_sections_parent ON public.sections(parent_section_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON public.sections(document_version_id, order_index);

-- Paragraphs
CREATE TABLE IF NOT EXISTS public.paragraphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  paragraph_id VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, paragraph_id)
);

CREATE INDEX IF NOT EXISTS idx_paragraphs_section ON public.paragraphs(section_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_status ON public.paragraphs(status);
CREATE INDEX IF NOT EXISTS idx_paragraphs_search ON public.paragraphs USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_paragraphs_order ON public.paragraphs(section_id, order_index);

-- Embeddings
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

CREATE INDEX IF NOT EXISTS idx_embeddings_paragraph ON public.embeddings(paragraph_id);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id),
  author_id UUID REFERENCES public.profiles(id),
  comment_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_paragraph ON public.comments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);

-- Decisions
CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id),
  decision_type VARCHAR(50) NOT NULL,
  decision_summary TEXT NOT NULL,
  rationale TEXT,
  impact_assessment TEXT,
  action_items JSONB DEFAULT '[]',
  related_decisions UUID[] DEFAULT '{}',
  is_final BOOLEAN DEFAULT false,
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_paragraph ON public.decisions(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_decisions_decided_at ON public.decisions(decided_at DESC);

-- Change logs
CREATE TABLE IF NOT EXISTS public.change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  before_snapshot JSONB,
  after_snapshot JSONB,
  change_summary TEXT,
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_change_logs_entity ON public.change_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON public.change_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_by ON public.change_logs(changed_by);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  document_version_id UUID REFERENCES public.document_versions(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  retrieved_paragraphs UUID[] DEFAULT '{}',
  model_used VARCHAR(100),
  token_count INTEGER,
  latency_ms INTEGER,
  feedback VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON public.chat_messages(created_at DESC);

-- Document permissions
CREATE TABLE IF NOT EXISTS public.document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_permissions_doc ON public.document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_permissions_user ON public.document_permissions(user_id);

-- User preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_email BOOLEAN DEFAULT true,
  notification_frequency VARCHAR(20) DEFAULT 'realtime',
  theme VARCHAR(20) DEFAULT 'dark',
  preferences JSONB DEFAULT '{}'
);

-- Trigger function for search vector
CREATE OR REPLACE FUNCTION update_paragraph_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.paragraph_id, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS paragraphs_search_update ON public.paragraphs;
CREATE TRIGGER paragraphs_search_update
BEFORE INSERT OR UPDATE ON public.paragraphs
FOR EACH ROW EXECUTE FUNCTION update_paragraph_search_vector();

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Disable RLS for now (we'll enable it in step 2)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;
