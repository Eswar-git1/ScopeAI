-- ============================================================
-- MIGRATION 005: Fix Missing SELECT Policies
-- ============================================================
-- The previous migrations enabled RLS but didn't add SELECT policies
-- This prevents users (even admins) from viewing data
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================
-- Allow authenticated users to view profiles (needed for UI to show names/avatars)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT USING ( auth.role() = 'authenticated' );

-- ============================================================
-- 2. DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "Users can view documents" ON public.documents;
CREATE POLICY "Users can view documents" ON public.documents
FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id::uuid = id
    AND user_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 3. DOCUMENT PERMISSIONS
-- ============================================================
DROP POLICY IF EXISTS "Users can view document permissions" ON public.document_permissions;
CREATE POLICY "Users can view document permissions" ON public.document_permissions
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id AND d.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id::uuid = document_permissions.document_id::uuid
    AND dp.user_id = auth.uid()
    AND dp.role = 'owner'
  )
);

-- ============================================================
-- 4. DOCUMENT VERSIONS
-- ============================================================
DROP POLICY IF EXISTS "Users can view document versions" ON public.document_versions;
CREATE POLICY "Users can view document versions" ON public.document_versions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE d.id = document_id::uuid
    AND (
      d.created_by = auth.uid() OR
      dp.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- ============================================================
-- 5. SECTIONS
-- ============================================================
DROP POLICY IF EXISTS "Users can view sections" ON public.sections;
CREATE POLICY "Users can view sections" ON public.sections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE dv.id = document_version_id::uuid
    AND (
      d.created_by = auth.uid() OR
      dp.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- ============================================================
-- 6. PARAGRAPHS
-- ============================================================
DROP POLICY IF EXISTS "Users can view paragraphs" ON public.paragraphs;
CREATE POLICY "Users can view paragraphs" ON public.paragraphs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE s.id = section_id::uuid
    AND (
      d.created_by = auth.uid() OR
      dp.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- ============================================================
-- 7. COMMENTS
-- ============================================================
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
CREATE POLICY "Users can view comments" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE p.id = paragraph_id::uuid
    AND (
      d.created_by = auth.uid() OR
      dp.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- ============================================================
-- 8. DECISIONS
-- ============================================================
DROP POLICY IF EXISTS "Users can view decisions" ON public.decisions;
CREATE POLICY "Users can view decisions" ON public.decisions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id
    JOIN public.document_versions dv ON dv.id = s.document_version_id
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE p.id = paragraph_id::uuid
    AND (
      d.created_by = auth.uid() OR
      dp.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- ============================================================
-- 9. OTHER TABLES
-- ============================================================

-- Notifications: Users only see their own
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING ( user_id = auth.uid() );

-- Chat Messages: Users only see their own
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
FOR SELECT USING ( user_id = auth.uid() );

-- Change Logs: Viewable if you have document access (simplified to authenticated for now log visibility usually nice)
-- Or strictly link to document access. Let's do authenticated for simplicity or skip if not critical. 
-- Let's enable authenticated read for change logs to allow activity feeds to work easily.
DROP POLICY IF EXISTS "Authenticated users can view change logs" ON public.change_logs;
CREATE POLICY "Authenticated users can view change logs" ON public.change_logs
FOR SELECT USING ( auth.role() = 'authenticated' );
