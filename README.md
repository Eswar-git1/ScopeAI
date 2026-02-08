This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

ScopeAI Platform Overview
Your codebase is a production-grade collaborative platform for reviewing technical scope documents with AI-powered intelligence. It's essentially a "Google Docs for technical specifications" with built-in RAG (Retrieval-Augmented Generation) AI assistance, comment threading, decision tracking, and full audit trails.

Core Purpose
The platform enables teams to:

Create and version scope documents
Organize content into hierarchical sections and paragraphs
Collaborate with paragraph-level threaded comments
Track decisions and action items
Get AI-powered answers strictly grounded in document content (zero hallucination)
Maintain complete audit trails for compliance
Technology Stack
Frontend:

Next.js 16 (React 19) with App Router
TypeScript for type safety
Zustand for state management (6 stores: auth, document, UI, chat, notifications, comments)
Tailwind CSS 4 for styling
Radix UI for accessible components
Framer Motion for animations
Backend:

Supabase (PostgreSQL database)
Supabase Auth (JWT sessions)
OpenRouter API (Nvidia Nemotron LLM for free tier)
Row-Level Security (RLS) for permissions
AI Features:

RAG chatbot with full-text search
pgvector extension for embeddings (1536-dimension vectors)
Citation system with paragraph references
Hallucination detection
Key Features Implemented
1. Document Management
Create/edit documents with semantic versioning (1.0.0, 1.1.0, etc.)
Document status workflow: draft → review → approved → archived
Soft deletes (never permanently remove data)
Role-based permissions: viewer, commenter, reviewer, editor, owner
2. Collaborative Review
Paragraph-level comments with types: suggestion, objection, clarification, observation, approval, question
Comment threading with replies
Comment status: open, resolved, escalated, deferred
Priority levels: low, medium, high, critical
@mentions with notifications
3. Decision Tracking
Record decisions with types: accepted, rejected, deferred, modified
Track rationale and impacts
Create action items tied to decisions
Link related decisions
4. RAG-Powered AI Chatbot (/api/chat)
Answers strictly grounded in document content
Full-text search retrieves relevant paragraphs
Every response includes citations (e.g., [SEC-1-3])
Hallucination detection (flags "I think", "probably", etc.)
Context-aware (can focus on specific paragraphs)
Model: Nvidia Nemotron-3-Nano-30B (free via OpenRouter)
5. Audit & Compliance
Change logs table tracks all modifications
Before/after snapshots for every change
User attribution for accountability
Tracks changes to paragraphs, sections, documents, comments, decisions
6. Real-Time Notifications
Comment replies, mentions, status changes, escalations
Unread count tracking
Notification types: comment_reply, mention, status_change, escalation, resolution, decision
Database Schema (13 Tables)
profiles - User accounts
documents - Scope documents with versioning
document_versions - Version control
sections - Hierarchical sections (can have parent sections)
paragraphs - Content with full-text search vector
embeddings - Vector embeddings for RAG (pgvector)
comments - Threaded comments
decisions - Decision records
change_logs - Audit trail
notifications - Notification queue
chat_messages - AI conversation history
document_permissions - Access control
user_preferences - User settings
Database Features:

Row Level Security (RLS) policies
Cascading deletes for data integrity
Optimized indexes for queries
Automatic search vector updates (triggers)
Extensions: uuid-ossp, vector (pgvector), pg_trgm (trigram)
Application Structure
src/
├── app/
│   ├── api/              # API routes (chat, documents, comments, paragraphs)
│   ├── auth/             # Auth callback
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard
├── components/
│   ├── chat/             # ChatPanel (RAG interface)
│   ├── layout/           # Header, Sidebar, SearchDialog
│   └── scope/            # ContentPane, CommentsDialog
├── lib/
│   ├── supabase/         # Client/server Supabase setup
│   └── utils.ts          # Helper functions
├── middleware.ts         # Auth protection
├── store/                # Zustand stores (6 stores)
└── types/                # TypeScript interfaces

Key API Endpoints
POST /api/chat - RAG chatbot (retrieves context, calls LLM, validates response)
GET/POST/PATCH/DELETE /api/documents - Document CRUD
GET/POST/PATCH/DELETE /api/paragraphs - Paragraph CRUD + full-text search
GET/POST/PATCH/DELETE /api/comments - Comments with threading + notifications
State Management (Zustand)
6 stores manage application state:

useAuthStore - User authentication & profile
useDocumentStore - Current document, sections, paragraphs
useUIStore - Sidebar, chat panel, search, theme
useChatStore - AI messages, loading, context
useNotificationStore - Notifications, unread count
useCommentsStore - Comments, selected comment
Security Features
Row-Level Security on all tables
JWT-based authentication with middleware protection
Role-based permissions (viewer → owner hierarchy)
Soft deletes prevent data loss
Change logs for audit trail
Content validation prevents XSS
RAG Chatbot Flow
User asks question → /api/chat
Full-text search retrieves 8 most relevant paragraphs
Format paragraphs as context with citations [SEC-X-Y]
Send to OpenRouter with system prompt (zero hallucination instructions)
Validate response (check for hallucination markers, verify citations)
Extract citations and return answer with metadata
Save to chat_messages table for history
Hallucination Detection:
Flags responses containing: "I think", "probably", "might be", "I believe", "I'm not sure", "possibly", "maybe"

Current Git Status
You have untracked files in:

src/app/api/ - API routes
src/app/auth/, src/app/login/, src/app/signup/ - Auth pages
src/components/ - All React components
src/lib/, src/middleware.ts, src/store/, src/types/ - Core logic
supabase/ - Database schema
Modified files:

package.json, package-lock.json - Dependencies added
src/app/globals.css, src/app/layout.tsx, src/app/page.tsx - Updated from Next.js default
What Makes This Special
Zero Hallucination Guarantee - AI strictly grounded in document content with citations
Enterprise Audit Trail - Every change tracked with before/after snapshots
Collaborative Workflow - Paragraph-level comments, decisions, notifications
Modern Stack - Next.js 16, React 19, Zustand, Supabase
Production-Ready - RLS, soft deletes, role-based permissions, error handling
This is a sophisticated, enterprise-grade application ready for production use. The codebase is well-organized, follows Next.js best practices, and implements features like RAG AI, collaborative review workflows, and comprehensive audit trails that are typically found in enterprise SaaS products.