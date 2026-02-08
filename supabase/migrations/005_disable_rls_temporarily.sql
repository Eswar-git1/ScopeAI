-- ============================================================
-- MIGRATION 005: Disable RLS Temporarily
-- ============================================================
-- This disables RLS on all tables to get the app working
-- We'll add proper policies later once core features work
-- ============================================================

-- Drop all existing RLS policies to clean up
DROP POLICY IF EXISTS "Users can view documents they have access to" ON public.documents;
DROP POLICY IF EXISTS "Editors can create documents" ON public.documents;
DROP POLICY IF EXISTS "Editors can update documents" ON public.documents;
DROP POLICY IF EXISTS "Owners can delete documents" ON public.documents;

DROP POLICY IF EXISTS "Users can view document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Editors can create versions" ON public.document_versions;

DROP POLICY IF EXISTS "Users can view sections" ON public.sections;
DROP POLICY IF EXISTS "Editors can create sections" ON public.sections;
DROP POLICY IF EXISTS "Editors can update sections" ON public.sections;
DROP POLICY IF EXISTS "Editors can delete sections" ON public.sections;

DROP POLICY IF EXISTS "Users can view paragraphs" ON public.paragraphs;
DROP POLICY IF EXISTS "Commenters can create paragraphs" ON public.paragraphs;
DROP POLICY IF EXISTS "Editors can update paragraphs" ON public.paragraphs;
DROP POLICY IF EXISTS "Editors can delete paragraphs" ON public.paragraphs;

DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Commenters can create comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can update comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can delete comments" ON public.comments;

DROP POLICY IF EXISTS "Users can view decisions" ON public.decisions;
DROP POLICY IF EXISTS "Reviewers can create decisions" ON public.decisions;
DROP POLICY IF EXISTS "Decision makers can update decisions" ON public.decisions;

DROP POLICY IF EXISTS "Users can view change logs" ON public.change_logs;
DROP POLICY IF EXISTS "System can create change logs" ON public.change_logs;

DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "System can create embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "System can update embeddings" ON public.embeddings;

DROP POLICY IF EXISTS "Users can view document permissions" ON public.document_permissions;
DROP POLICY IF EXISTS "Owners can create permissions" ON public.document_permissions;
DROP POLICY IF EXISTS "Owners can update permissions" ON public.document_permissions;
DROP POLICY IF EXISTS "Owners can delete permissions" ON public.document_permissions;

DROP POLICY IF EXISTS "Users can view user preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;

-- Drop the helper function
DROP FUNCTION IF EXISTS public.is_document_creator(uuid);

-- Disable RLS on all tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- Verification: Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Note: We'll re-enable RLS later with proper policies
-- For now, focus on getting core features working
