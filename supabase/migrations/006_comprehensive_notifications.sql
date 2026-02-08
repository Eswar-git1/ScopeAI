-- ============================================================
-- MIGRATION 006: Comprehensive Notifications System
-- ============================================================
-- Automatic notifications for all document actions
-- ============================================================

-- ============================================================
-- NOTIFICATION TRIGGER FUNCTIONS
-- ============================================================

-- Function to notify on new comments
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  para_owner UUID;
  doc_id UUID;
  doc_title TEXT;
  author_name TEXT;
  para_id_text TEXT;
BEGIN
  -- Get paragraph owner and document info
  SELECT
    p.created_by,
    d.id,
    d.title,
    p.paragraph_id
  INTO para_owner, doc_id, doc_title, para_id_text
  FROM paragraphs p
  JOIN sections s ON s.id = p.section_id
  JOIN document_versions dv ON dv.id = s.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE p.id = NEW.paragraph_id;

  -- Get author name
  SELECT full_name INTO author_name FROM profiles WHERE id = NEW.author_id;

  -- Notify paragraph owner (if not the commenter)
  IF para_owner IS NOT NULL AND para_owner != NEW.author_id THEN
    INSERT INTO notifications (user_id, notification_type, title, content, link)
    VALUES (
      para_owner,
      'comment_reply',
      'New Comment on Your Content',
      author_name || ' commented on paragraph ' || para_id_text,
      '/documents/' || doc_id || '?paragraph=' || NEW.paragraph_id
    );
  END IF;

  -- Notify document owner (if different from paragraph owner and commenter)
  IF doc_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, title, content, link)
    SELECT
      d.created_by,
      'comment_reply',
      'New Comment on ' || doc_title,
      author_name || ' commented on paragraph ' || para_id_text,
      '/documents/' || doc_id || '?paragraph=' || NEW.paragraph_id
    FROM documents d
    WHERE d.id = doc_id
      AND d.created_by != NEW.author_id
      AND d.created_by != COALESCE(para_owner, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on new paragraphs
CREATE OR REPLACE FUNCTION notify_on_paragraph()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  doc_title TEXT;
  author_name TEXT;
  section_title TEXT;
BEGIN
  -- Get document info
  SELECT
    d.id,
    d.title,
    s.title
  INTO doc_id, doc_title, section_title
  FROM sections s
  JOIN document_versions dv ON dv.id = s.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE s.id = NEW.section_id;

  -- Get author name
  SELECT full_name INTO author_name FROM profiles WHERE id = NEW.created_by;

  -- Notify document collaborators (owners, editors)
  INSERT INTO notifications (user_id, notification_type, title, content, link)
  SELECT
    dp.user_id,
    'status_change',
    'New Content Added to ' || doc_title,
    author_name || ' added paragraph ' || NEW.paragraph_id || ' in section "' || section_title || '"',
    '/documents/' || doc_id || '?paragraph=' || NEW.id
  FROM document_permissions dp
  WHERE dp.document_id = doc_id
    AND dp.user_id != NEW.created_by
    AND dp.role IN ('owner', 'editor', 'reviewer');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on new sections
CREATE OR REPLACE FUNCTION notify_on_section()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  doc_title TEXT;
  author_id UUID;
  author_name TEXT;
BEGIN
  -- Get document info and author
  SELECT
    d.id,
    d.title,
    d.created_by
  INTO doc_id, doc_title, author_id
  FROM document_versions dv
  JOIN documents d ON d.id = dv.document_id
  WHERE dv.id = NEW.document_version_id;

  -- Get current user (assume it's the document owner for now)
  SELECT full_name INTO author_name FROM profiles WHERE id = author_id LIMIT 1;

  -- Notify document collaborators
  INSERT INTO notifications (user_id, notification_type, title, content, link)
  SELECT
    dp.user_id,
    'status_change',
    'New Section Added to ' || doc_title,
    'Section "' || NEW.title || '" (' || NEW.section_id || ') was added',
    '/documents/' || doc_id || '?section=' || NEW.id
  FROM document_permissions dp
  WHERE dp.document_id = doc_id
    AND dp.role IN ('owner', 'editor', 'reviewer');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on paragraph status changes
CREATE OR REPLACE FUNCTION notify_on_paragraph_status_change()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  doc_title TEXT;
  para_owner UUID;
  updater_name TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get document info
  SELECT
    d.id,
    d.title,
    NEW.created_by
  INTO doc_id, doc_title, para_owner
  FROM sections s
  JOIN document_versions dv ON dv.id = s.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE s.id = NEW.section_id;

  -- Get updater name (would need to track this separately in real app)
  SELECT full_name INTO updater_name FROM profiles ORDER BY id LIMIT 1;

  -- Notify paragraph owner
  IF para_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, title, content, link)
    VALUES (
      para_owner,
      'status_change',
      'Paragraph Status Changed',
      'Paragraph ' || NEW.paragraph_id || ' status changed from ' || OLD.status || ' to ' || NEW.status,
      '/documents/' || doc_id || '?paragraph=' || NEW.id
    );
  END IF;

  -- If escalated, notify admins
  IF NEW.status = 'escalated' THEN
    INSERT INTO notifications (user_id, notification_type, title, content, link)
    SELECT
      p.id,
      'escalation',
      'Content Escalated for Review',
      'Paragraph ' || NEW.paragraph_id || ' in "' || doc_title || '" was escalated',
      '/documents/' || doc_id || '?paragraph=' || NEW.id
    FROM profiles p
    WHERE p.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on decisions
CREATE OR REPLACE FUNCTION notify_on_decision()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  doc_title TEXT;
  para_owner UUID;
  decider_name TEXT;
  para_id_text TEXT;
BEGIN
  -- Get info
  SELECT
    d.id,
    d.title,
    p.created_by,
    p.paragraph_id
  INTO doc_id, doc_title, para_owner, para_id_text
  FROM paragraphs p
  JOIN sections s ON s.id = p.section_id
  JOIN document_versions dv ON dv.id = s.document_version_id
  JOIN documents d ON d.id = dv.document_id
  WHERE p.id = NEW.paragraph_id;

  -- Get decider name
  SELECT full_name INTO decider_name FROM profiles WHERE id = NEW.decided_by;

  -- Notify paragraph owner
  IF para_owner IS NOT NULL AND para_owner != NEW.decided_by THEN
    INSERT INTO notifications (user_id, notification_type, title, content, link)
    VALUES (
      para_owner,
      'decision',
      'Decision Made on Your Content',
      decider_name || ' made a ' || NEW.decision_type || ' decision on paragraph ' || para_id_text,
      '/documents/' || doc_id || '?paragraph=' || NEW.paragraph_id
    );
  END IF;

  -- Notify document owner
  INSERT INTO notifications (user_id, notification_type, title, content, link)
  SELECT
    d.created_by,
    'decision',
    'Decision Made on ' || doc_title,
    decider_name || ' made a ' || NEW.decision_type || ' decision on paragraph ' || para_id_text,
    '/documents/' || doc_id || '?paragraph=' || NEW.paragraph_id
  FROM documents d
  WHERE d.id = doc_id
    AND d.created_by != NEW.decided_by
    AND d.created_by != COALESCE(para_owner, '00000000-0000-0000-0000-000000000000'::UUID);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_on_comment ON comments;
DROP TRIGGER IF EXISTS trigger_notify_on_paragraph ON paragraphs;
DROP TRIGGER IF EXISTS trigger_notify_on_section ON sections;
DROP TRIGGER IF EXISTS trigger_notify_on_paragraph_status ON paragraphs;
DROP TRIGGER IF EXISTS trigger_notify_on_decision ON decisions;

-- Create triggers
CREATE TRIGGER trigger_notify_on_comment
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();

CREATE TRIGGER trigger_notify_on_paragraph
AFTER INSERT ON paragraphs
FOR EACH ROW
EXECUTE FUNCTION notify_on_paragraph();

CREATE TRIGGER trigger_notify_on_section
AFTER INSERT ON sections
FOR EACH ROW
EXECUTE FUNCTION notify_on_section();

CREATE TRIGGER trigger_notify_on_paragraph_status
AFTER UPDATE OF status ON paragraphs
FOR EACH ROW
EXECUTE FUNCTION notify_on_paragraph_status_change();

CREATE TRIGGER trigger_notify_on_decision
AFTER INSERT ON decisions
FOR EACH ROW
EXECUTE FUNCTION notify_on_decision();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Comprehensive notification system installed!';
  RAISE NOTICE 'Automatic notifications will be created for:';
  RAISE NOTICE '- New comments';
  RAISE NOTICE '- New paragraphs';
  RAISE NOTICE '- New sections';
  RAISE NOTICE '- Status changes';
  RAISE NOTICE '- Decisions';
  RAISE NOTICE '- Escalations';
END $$;
