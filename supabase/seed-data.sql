-- ============================================================
-- SEED DATA FOR TESTING
-- Run this AFTER creating your first user account
-- ============================================================

-- Replace 'YOUR_USER_EMAIL@example.com' with your actual email after signup

-- Create a demo document
INSERT INTO public.documents (id, title, description, status, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Project Scope - AI Platform',
  'Comprehensive scope document for the Scope Collaboration + RAG Intelligence Platform',
  'draft',
  (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1)
);

-- Create initial version
INSERT INTO public.document_versions (id, document_id, version_number, content_hash, change_summary, is_major_version, created_by)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '1.0.0',
  'initial_hash',
  'Initial version of scope document',
  true,
  (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1)
);

-- Update document with current version
UPDATE public.documents 
SET current_version_id = '22222222-2222-2222-2222-222222222222'::uuid
WHERE id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Create sections
INSERT INTO public.sections (id, document_version_id, section_id, title, level, order_index)
VALUES 
  ('33333333-3333-3333-3333-333333333333'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'SEC-1', 'Introduction', 1, 1),
  ('44444444-4444-4444-4444-444444444444'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'SEC-2', 'Technical Architecture', 1, 2),
  ('55555555-5555-5555-5555-555555555555'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'SEC-3', 'Database Design', 1, 3),
  ('66666666-6666-6666-6666-666666666666'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'SEC-4', 'RAG Pipeline', 1, 4),
  ('77777777-7777-7777-7777-777777777777'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'SEC-5', 'LLM Integration', 1, 5);

-- Create paragraphs
INSERT INTO public.paragraphs (section_id, paragraph_id, content, order_index, status)
VALUES 
  -- Introduction
  ('33333333-3333-3333-3333-333333333333'::uuid, 'SEC-1-A', 
   'The Scope Collaboration Platform is designed to enable multi-stakeholder review and discussion of technical scope documents with AI-powered intelligence.', 
   1, 'accepted'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'SEC-1-B', 
   'Key objectives include: (1) Zero-hallucination RAG chatbot for scope Q&A, (2) Full audit trail and traceability, (3) Real-time collaboration features, (4) Version control for scope documents.', 
   2, 'accepted'),
  
  -- Technical Architecture
  ('44444444-4444-4444-4444-444444444444'::uuid, 'SEC-2-A', 
   'The platform uses Next.js 14 with App Router for the frontend, leveraging React Server Components for optimal performance.', 
   1, 'under_review'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'SEC-2-B', 
   'Backend infrastructure utilizes Supabase for PostgreSQL database, authentication, and real-time subscriptions. Hosting is provided via Vercel for seamless deployment and edge functions.', 
   2, 'under_review'),
  
  -- Database Design
  ('55555555-5555-5555-5555-555555555555'::uuid, 'SEC-3-A', 
   'The database schema includes 13+ tables covering documents, sections, paragraphs, embeddings (pgvector), comments, decisions, and audit trails.', 
   1, 'accepted'),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'SEC-3-B', 
   'Row Level Security (RLS) policies ensure data access control based on user roles and document permissions. All changes are logged in the change_logs table for complete auditability.', 
   2, 'draft'),
  
  -- RAG Pipeline
  ('66666666-6666-6666-6666-666666666666'::uuid, 'SEC-4-A', 
   'The RAG pipeline uses OpenAI embeddings (text-embedding-3-small, 1536 dimensions) stored in PostgreSQL with pgvector extension for semantic search.', 
   1, 'under_review'),
  ('66666666-6666-6666-6666-666666666666'::uuid, 'SEC-4-B', 
   'Hybrid search combines full-text search (PostgreSQL tsvector) with semantic similarity for optimal retrieval. Retrieved paragraphs are ranked by relevance and passed to the LLM with strict instructions.', 
   2, 'under_review'),
  
  -- LLM Integration
  ('77777777-7777-7777-7777-777777777777'::uuid, 'SEC-5-A', 
   'OpenRouter API is used for LLM access, currently configured with Nvidia Nemotron 30B model for cost-effective inference.', 
   1, 'accepted'),
  ('77777777-7777-7777-7777-777777777777'::uuid, 'SEC-5-B', 
   'System prompt enforces strict RAG behavior: (1) Only answer from provided context, (2) Always cite paragraph IDs, (3) Never hallucinate or use training data, (4) Admit when information is not in scope.', 
   2, 'accepted'),
  ('77777777-7777-7777-7777-777777777777'::uuid, 'SEC-5-C', 
   'All LLM responses undergo hallucination detection, checking for uncertainty markers and validating citations against retrieved context. Invalid responses are flagged for review.', 
   3, 'draft');

-- Grant document permission to user
INSERT INTO public.document_permissions (document_id, user_id, role, granted_by)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1),
  'owner',
  (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1)
);

-- Add some demo comments
INSERT INTO public.comments (paragraph_id, author_id, comment_type, content, status, priority)
VALUES 
  (
    (SELECT id FROM public.paragraphs WHERE paragraph_id = 'SEC-2-A' LIMIT 1),
    (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1),
    'suggestion',
    'Should we consider SSR vs CSR implications for SEO? This is critical for discoverability.',
    'open',
    'high'
  ),
  (
    (SELECT id FROM public.paragraphs WHERE paragraph_id = 'SEC-4-B' LIMIT 1),
    (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1),
    'question',
    'What is the expected latency for semantic search queries? Do we need caching?',
    'open',
    'medium'
  ),
  (
    (SELECT id FROM public.paragraphs WHERE paragraph_id = 'SEC-5-B' LIMIT 1),
    (SELECT id FROM public.profiles WHERE email = 'YOUR_USER_EMAIL@example.com' LIMIT 1),
    'approval',
    'Excellent approach! The strict system prompt is exactly what we need for zero hallucination.',
    'resolved',
    'low'
  );

-- Success message
SELECT 
  'Seed data created successfully!' as message,
  COUNT(*) as total_paragraphs 
FROM public.paragraphs;
