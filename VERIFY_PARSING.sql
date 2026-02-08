-- ============================================
-- SQL QUERIES TO VERIFY DOCUMENT PARSING
-- ============================================
-- Run these in Supabase SQL Editor after upload

-- 1. COUNT TOTAL SECTIONS (Should be ~62)
-- ============================================
SELECT COUNT(*) as total_sections FROM sections;


-- 2. LIST ALL SECTIONS WITH PARAGRAPH COUNTS
-- ============================================
SELECT
  section_id,
  title,
  level,
  order_index,
  (SELECT COUNT(*) FROM paragraphs WHERE section_id = sections.section_id) as paragraph_count
FROM sections
ORDER BY order_index;


-- 3. CHECK SECTION 2 STRUCTURE (Should have 4 paragraphs)
-- ============================================
SELECT
  p.paragraph_id,
  LEFT(p.content, 100) as content_preview
FROM paragraphs p
JOIN sections s ON p.section_id = s.section_id
WHERE s.title LIKE '2. Core Problem%'
ORDER BY p.order_index;

-- Expected Results:
-- PARA-0001: **2.1 Fragmented AI Adoption Risk** As Army applications begin adopting AI independently...
-- PARA-0002: **2.2 Lack of Deterministic AI Integration Standards** Existing AI solutions are often...
-- PARA-0003: **2.3 Absence of Centralised AI Governance Infrastructure** There is currently no standard...
-- PARA-0004: This project does not assume pre-existing operational AI problem statements...


-- 4. CHECK SECTION 4 STRUCTURE (Should have 6 definition paragraphs)
-- ============================================
SELECT
  p.paragraph_id,
  LEFT(p.content, 80) as content_preview
FROM paragraphs p
JOIN sections s ON p.section_id = s.section_id
WHERE s.title LIKE '4. Key Definitions%'
ORDER BY p.order_index;

-- Expected Results:
-- Para 1: **4.1 Deterministic** For the purpose of this project...
-- Para 2: **4.2 Agent** An agent in this framework is not an autonomous entity...
-- Para 3: **4.3 Agentic** Refers to the use of agentic design principles...
-- Para 4: **4.4 Operational Information System (OIS)** Systems used for situational awareness...
-- Para 5: **4.5 Management Information System (MIS)** Administrative applications...
-- Para 6: **4.6 Shared OIS SDK** A read-only, governed software development kit...


-- 5. CHECK SECTION 7 NESTED SUBSECTIONS (Should have multiple levels)
-- ============================================
SELECT
  p.paragraph_id,
  LEFT(p.content, 120) as content_preview
FROM paragraphs p
JOIN sections s ON p.section_id = s.section_id
WHERE s.title LIKE '7. Applicability%'
ORDER BY p.order_index
LIMIT 20;

-- Expected: Paragraphs with **7.1**, **7.1.1**, **7.1.2**, **7.2**, **7.2.1**, etc.


-- 6. VERIFY NO SUBSECTION BECAME A SECTION (Should return 0)
-- ============================================
SELECT COUNT(*) as incorrect_sections
FROM sections
WHERE title LIKE '%.1 %'
   OR title LIKE '%.2 %'
   OR title LIKE '%.3 %'
   OR title LIKE '%.1.%';

-- Expected: 0 (zero)
-- If > 0, subsections were incorrectly treated as sections


-- 7. COUNT TOTAL PARAGRAPHS (Should be 300-500)
-- ============================================
SELECT COUNT(*) as total_paragraphs FROM paragraphs;


-- 8. COUNT EMBEDDINGS (Should match paragraph count)
-- ============================================
SELECT COUNT(*) as total_embeddings FROM embeddings;


-- 9. CHECK FOR PARAGRAPHS WITH SUBHEADINGS (Should find many)
-- ============================================
SELECT COUNT(*) as paragraphs_with_subheadings
FROM paragraphs
WHERE content LIKE '%**%';

-- Expected: 100+ (all subsections have bold subheadings)


-- 10. FIND SPECIFIC CONTENT TO VERIFY NO TEXT LOST
-- ============================================
-- Search for a specific phrase from your document
SELECT
  s.title as section_title,
  p.paragraph_id,
  LEFT(p.content, 150) as content_preview
FROM paragraphs p
JOIN sections s ON p.section_id = s.section_id
WHERE p.content ILIKE '%deterministic orchestration%'
LIMIT 5;


-- 11. CHECK DOCUMENT METADATA
-- ============================================
SELECT
  d.title,
  d.status,
  d.created_at,
  (SELECT COUNT(*) FROM sections WHERE document_id = d.id) as section_count,
  (SELECT COUNT(*) FROM paragraphs WHERE document_id = d.document_id) as paragraph_count
FROM documents d
ORDER BY d.created_at DESC
LIMIT 1;


-- 12. VERIFY SECTION HIERARCHY (Check levels are correct)
-- ============================================
SELECT
  level,
  COUNT(*) as count,
  STRING_AGG(LEFT(title, 50), ', ') as examples
FROM sections
GROUP BY level
ORDER BY level;

-- Expected:
-- Level 1: 1-2 sections (main titles like SCOPE FOR DEVELOPMENT)
-- Level 2: ~60 sections (numbered sections like 1. Objective, 2. Core Problem, etc.)


-- ============================================
-- QUICK SUCCESS CHECK (Run this one query)
-- ============================================
SELECT
  (SELECT COUNT(*) FROM sections) as total_sections,
  (SELECT COUNT(*) FROM paragraphs) as total_paragraphs,
  (SELECT COUNT(*) FROM embeddings) as total_embeddings,
  (SELECT COUNT(*) FROM sections WHERE title LIKE '%.1 %') as incorrect_subsection_sections,
  (SELECT COUNT(*) FROM paragraphs WHERE content LIKE '%**%') as paragraphs_with_subheadings;

-- ✅ SUCCESS if:
-- total_sections = ~62
-- total_paragraphs = 300-500
-- total_embeddings = same as total_paragraphs
-- incorrect_subsection_sections = 0
-- paragraphs_with_subheadings = 100+
