-- ============================================================
-- MIGRATION 001: Fix RLS Policies and Add Missing Columns
-- ============================================================
-- Run this in Supabase SQL Editor after running the main schema
-- ============================================================

-- ============================================================
-- PART 1: ADD MISSING COLUMNS
-- ============================================================

-- Add created_by to paragraphs for author tracking
ALTER TABLE public.paragraphs
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_paragraphs_created_by ON public.paragraphs(created_by);

-- Add approval fields to decisions table
ALTER TABLE public.decisions
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.decisions
ADD COLUMN IF NOT EXISTS approval_type VARCHAR(50);

ALTER TABLE public.decisions
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add citations column to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]';

-- ============================================================
-- PART 2: ADD MISSING INSERT/UPDATE/DELETE RLS POLICIES
-- ============================================================

-- DOCUMENTS: Allow editors/owners to create, update, delete
CREATE POLICY "Editors can create documents" ON public.documents
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User is creating their own document
    created_by = auth.uid() OR
    -- User has admin role
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Editors can update documents" ON public.documents
FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id::uuid = documents.id
    AND user_id = auth.uid()
    AND role IN ('editor', 'owner')
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Owners can delete documents" ON public.documents
FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.document_permissions
    WHERE document_id::uuid = documents.id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DOCUMENT VERSIONS: Allow creation by editors/owners
CREATE POLICY "Editors can create versions" ON public.document_versions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE d.id = document_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- SECTIONS: Allow editors to create, update, delete
CREATE POLICY "Editors can create sections" ON public.sections
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE dv.id = document_version_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Editors can update sections" ON public.sections
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE dv.id = document_version_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Editors can delete sections" ON public.sections
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.document_versions dv
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE dv.id = document_version_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PARAGRAPHS: Allow editors to create, update, delete
CREATE POLICY "Editors can create paragraphs" ON public.paragraphs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.document_versions dv ON dv.id = s.document_version_id::uuid
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE s.id = section_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Editors can update paragraphs" ON public.paragraphs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.document_versions dv ON dv.id = s.document_version_id::uuid
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE s.id = section_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Editors can delete paragraphs" ON public.paragraphs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.document_versions dv ON dv.id = s.document_version_id::uuid
    JOIN public.documents d ON d.id = dv.document_id::uuid
    LEFT JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE s.id = section_id::uuid
    AND (
      d.created_by = auth.uid() OR
      (dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner'))
    )
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- COMMENTS: Allow authors to update their own comments, reviewers+ to update status
CREATE POLICY "Authors can update own comments" ON public.comments
FOR UPDATE USING (
  author_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id::uuid
    JOIN public.document_versions dv ON dv.id = s.document_version_id::uuid
    JOIN public.documents d ON d.id = dv.document_id::uuid
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE p.id = paragraph_id::uuid
    AND dp.user_id = auth.uid()
    AND dp.role IN ('reviewer', 'editor', 'owner')
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authors can delete own comments" ON public.comments
FOR DELETE USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DECISIONS: Allow reviewers+ to create and update
CREATE POLICY "Reviewers can create decisions" ON public.decisions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.paragraphs p
    JOIN public.sections s ON s.id = p.section_id::uuid
    JOIN public.document_versions dv ON dv.id = s.document_version_id::uuid
    JOIN public.documents d ON d.id = dv.document_id::uuid
    JOIN public.document_permissions dp ON dp.document_id = d.id
    WHERE p.id = paragraph_id::uuid
    AND dp.user_id = auth.uid()
    AND dp.role IN ('reviewer', 'editor', 'owner')
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Decision makers can update decisions" ON public.decisions
FOR UPDATE USING (
  decided_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CHANGE LOGS: Allow system to insert
CREATE POLICY "System can create change logs" ON public.change_logs
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- NOTIFICATIONS: Allow system to insert
CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete own notifications" ON public.notifications
FOR DELETE USING (
  user_id = auth.uid()
);

-- EMBEDDINGS: Allow system to create and update
CREATE POLICY "System can create embeddings" ON public.embeddings
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "System can update embeddings" ON public.embeddings
FOR UPDATE USING (
  auth.uid() IS NOT NULL
);

-- DOCUMENT PERMISSIONS: Allow owners to manage
CREATE POLICY "Owners can create permissions" ON public.document_permissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id::uuid
    AND d.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = document_permissions.document_id
    AND dp.user_id = auth.uid()
    AND dp.role = 'owner'
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Owners can update permissions" ON public.document_permissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id::uuid
    AND d.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = document_permissions.document_id
    AND dp.user_id = auth.uid()
    AND dp.role = 'owner'
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Owners can delete permissions" ON public.document_permissions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id::uuid
    AND d.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = document_permissions.document_id
    AND dp.user_id = auth.uid()
    AND dp.role = 'owner'
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PART 3: ADD HELPFUL TRIGGERS
-- ============================================================

-- Auto-update documents.updated_at when paragraphs change
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
BEGIN
  -- Get the document_id through the section
  SELECT dv.document_id INTO doc_id
  FROM public.document_versions dv
  JOIN public.sections s ON s.document_version_id::uuid = dv.id
  WHERE s.id = NEW.section_id::UUID;

  -- Update the document's updated_at timestamp
  IF doc_id IS NOT NULL THEN
    UPDATE public.documents
    SET updated_at = NOW()
    WHERE id = doc_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_paragraph_change ON public.paragraphs;
CREATE TRIGGER on_paragraph_change
AFTER INSERT OR UPDATE ON public.paragraphs
FOR EACH ROW EXECUTE FUNCTION update_document_updated_at();

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify the migration worked:
-- SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents';
-- SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'paragraphs';
-- SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'paragraphs' AND column_name = 'created_by';
