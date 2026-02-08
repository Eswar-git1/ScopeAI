-- ============================================================
-- MIGRATION 004: Add Missing SELECT Policies for RLS
-- ============================================================
-- This fixes the 500 error by adding SELECT policies for all tables
-- ============================================================

-- Drop existing SELECT policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view documents they have access to" ON public.documents;
DROP POLICY IF EXISTS "Users can view document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can view sections" ON public.sections;
DROP POLICY IF EXISTS "Users can view paragraphs" ON public.paragraphs;
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view decisions" ON public.decisions;
DROP POLICY IF EXISTS "Users can view embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Users can view change logs" ON public.change_logs;
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view document permissions" ON public.document_permissions;
DROP POLICY IF EXISTS "Users can view user preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- Function to check document creation without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_document_creator(doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = doc_id
    AND created_by = auth.uid()
  );
END;
$$;

-- ============================================================
-- SELECT POLICIES FOR ALL TABLES
-- ============================================================

-- DOCUMENTS: Users can view documents they created or have permission to access
CREATE POLICY "Users can view documents they have access to" ON public.documents
FOR SELECT USING (
  deleted_at IS NULL AND (
    -- User created the document
    created_by = auth.uid() OR
    -- User has explicit permission
    EXISTS (
      SELECT 1 FROM public.document_permissions dp
      WHERE dp.document_id::uuid = documents.id
      AND dp.user_id = auth.uid()
    ) OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- DOCUMENT VERSIONS: Users can view versions of documents they have access to
CREATE POLICY "Users can view document versions" ON public.document_versions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id::uuid
    AND d.deleted_at IS NULL
    AND (
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_permissions dp
        WHERE dp.document_id::uuid = d.id
        AND dp.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
);

-- SECTIONS: Users can view sections of documents they have access to
CREATE POLICY "Users can view sections" ON public.sections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id::uuid
    WHERE dv.id = sections.document_version_id::uuid
    AND d.deleted_at IS NULL
    AND (
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_permissions dp
        WHERE dp.document_id::uuid = d.id
        AND dp.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
);

-- PARAGRAPHS: Users can view paragraphs of documents they have access to
CREATE POLICY "Users can view paragraphs" ON public.paragraphs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    WHERE s.id = paragraphs.section_id::uuid
    AND d.deleted_at IS NULL
    AND (
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_permissions dp
        WHERE dp.document_id::uuid = d.id
        AND dp.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
);

-- COMMENTS: Users can view comments on documents they have access to
CREATE POLICY "Users can view comments" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    WHERE p.id = comments.paragraph_id::uuid
    AND d.deleted_at IS NULL
    AND (
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_permissions dp
        WHERE dp.document_id::uuid = d.id
        AND dp.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
);

-- DECISIONS: Users can view decisions on documents they have access to
CREATE POLICY "Users can view decisions" ON public.decisions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    WHERE p.id = decisions.paragraph_id::uuid
    AND d.deleted_at IS NULL
    AND (
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_permissions dp
        WHERE dp.document_id::uuid = d.id
        AND dp.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
);

-- EMBEDDINGS: Users can view embeddings for documents they have access to
CREATE POLICY "Users can view embeddings" ON public.embeddings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    WHERE p.id = embeddings.paragraph_id::uuid
    AND d.deleted_at IS NULL
    AND (
      d.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_permissions dp
        WHERE dp.document_id::uuid = d.id
        AND dp.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
);

-- CHANGE LOGS: Users can view change logs for documents they have access to
CREATE POLICY "Users can view change logs" ON public.change_logs
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- NOTIFICATIONS: Users can view their own notifications
CREATE POLICY "Users can view notifications" ON public.notifications
FOR SELECT USING (
  user_id = auth.uid()
);

-- CHAT MESSAGES: Users can view chat messages for documents they have access to
CREATE POLICY "Users can view chat messages" ON public.chat_messages
FOR SELECT USING (
  user_id = auth.uid()
);

-- DOCUMENT PERMISSIONS: Users can view permissions for documents they have access to
CREATE POLICY "Users can view document permissions" ON public.document_permissions
FOR SELECT USING (
  -- Users can see permissions for documents they created (using function to avoid recursion)
  public.is_document_creator(document_permissions.document_id::uuid) OR
  -- Users can see their own permissions
  user_id = auth.uid() OR
  -- Users can see permissions for documents they have owner/editor access to
  EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id::uuid = document_permissions.document_id::uuid
    AND dp.user_id = auth.uid()
    AND dp.role IN ('owner', 'editor')
  ) OR
  -- Admins can see all permissions
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- USER PREFERENCES: Users can view their own preferences
CREATE POLICY "Users can view user preferences" ON public.user_preferences
FOR SELECT USING (
  user_id = auth.uid()
);

-- PROFILES: Users can view all profiles (needed for collaboration features)
CREATE POLICY "Users can view profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this to verify all SELECT policies are in place
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'SELECT'
ORDER BY tablename, policyname;
