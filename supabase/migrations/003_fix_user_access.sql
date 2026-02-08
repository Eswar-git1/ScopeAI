-- ============================================================
-- MIGRATION 003: Fix User Access After Enabling RLS
-- ============================================================
-- This script grants you document permissions so you can view documents
-- ============================================================

-- STEP 1: Check your user ID
-- Replace 'your-email@example.com' with your actual email
-- Copy the ID that this returns
SELECT id, email, full_name, role FROM profiles WHERE email = 'eswarinnovations@gmail.com';

-- STEP 2: Update your role to admin (replace <your-user-id> with ID from step 1)
-- Example: UPDATE profiles SET role = 'admin' WHERE id = '56583d4e-b489-4a6c-8a70-e7f6c...';
UPDATE profiles
SET role = 'admin'
WHERE email = 'eswarinnovations@gmail.com';

-- STEP 3: Grant yourself owner permission on all documents
-- This will allow you to access all documents
INSERT INTO document_permissions (document_id, user_id, role, granted_by)
SELECT
    d.id as document_id,
    p.id as user_id,
    'owner' as role,
    d.created_by as granted_by
FROM documents d
CROSS JOIN profiles p
WHERE p.email = 'eswarinnovations@gmail.com'
ON CONFLICT (document_id, user_id) DO UPDATE
SET role = 'owner';

-- STEP 4: Verify your permissions
SELECT
    d.title as document,
    dp.role,
    dp.granted_at
FROM document_permissions dp
JOIN documents d ON d.id = dp.document_id
JOIN profiles p ON p.id = dp.user_id
WHERE p.email = 'eswarinnovations@gmail.com';

-- ============================================================
-- ROLE TYPES EXPLANATION
-- ============================================================

/*
PROFILE ROLES (on profiles table):
- viewer: Can only view documents they're granted access to
- commenter: Can view and add comments
- reviewer: Can view, comment, and change comment status
- editor: Can view, comment, and edit content
- owner: Full control of documents they own
- admin: Full system access, can bypass most restrictions

DOCUMENT PERMISSION ROLES (on document_permissions table):
- viewer: Read-only access to document
- commenter: Can add comments on paragraphs
- reviewer: Can resolve/escalate comments, make decisions
- editor: Can edit paragraphs, sections, document metadata
- owner: Full control, can delete document, manage permissions

For defense software projects, recommended setup:
- Project Lead: admin role
- Technical Lead: owner on relevant documents
- Developers: editor on their documents, viewer on others
- Stakeholders: reviewer on documents they need to approve
- External reviewers: commenter (can only add feedback)
*/
