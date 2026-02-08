// ==================== USER & AUTH ====================
export interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    role: UserRole;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
}

export type UserRole =
    | "viewer"
    | "commenter"
    | "reviewer"
    | "editor"
    | "owner"
    | "admin";

// ==================== DOCUMENTS ====================
export interface Document {
    id: string;
    title: string;
    description?: string;
    status: DocumentStatus;
    current_version_id?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export type DocumentStatus = "draft" | "review" | "approved" | "archived";

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: string;
    content_hash: string;
    change_summary?: string;
    is_major_version: boolean;
    parent_version_id?: string;
    created_by: string;
    created_at: string;
}

// ==================== SECTIONS & PARAGRAPHS ====================
export interface Section {
    id: string;
    document_version_id: string;
    section_id: string;
    title: string;
    parent_section_id?: string;
    level: number;
    order_index: number;
    children?: Section[];
    paragraphs?: Paragraph[];
}

export interface Paragraph {
    id: string;
    section_id: string;
    paragraph_id: string;
    content: string;
    order_index: number;
    status: ParagraphStatus;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    comments_count?: number;
    author?: User;
}

export type ParagraphStatus =
    | "draft"
    | "under_review"
    | "accepted"
    | "escalated";

// ==================== COMMENTS ====================
export interface Comment {
    id: string;
    paragraph_id: string;
    parent_comment_id?: string;
    author_id: string;
    author?: User;
    comment_type: CommentType;
    content: string;
    status: CommentStatus;
    priority: CommentPriority;
    tags: string[];
    mentions: string[];
    attachments: Attachment[];
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    resolved_by?: string;
    resolution_note?: string;
    replies?: Comment[];
}

export type CommentType =
    | "suggestion"
    | "objection"
    | "clarification"
    | "observation"
    | "approval"
    | "question";

export type CommentStatus = "open" | "resolved" | "escalated" | "deferred";

export type CommentPriority = "low" | "medium" | "high" | "critical";

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
}

// ==================== DECISIONS ====================
export interface Decision {
    id: string;
    paragraph_id: string;
    comment_id?: string;
    decision_type: DecisionType;
    decision_summary: string;
    rationale?: string;
    impact_assessment?: string;
    action_items: ActionItem[];
    related_decisions: string[];
    is_final: boolean;
    decided_by: string;
    decided_by_user?: User;
    decided_at: string;
}

export type DecisionType = "accepted" | "rejected" | "deferred" | "modified";

export interface ActionItem {
    id: string;
    title: string;
    description?: string;
    assignee?: string;
    due_date?: string;
    status: "pending" | "in_progress" | "completed";
}

// ==================== AUDIT LOGS ====================
export interface ChangeLog {
    id: string;
    entity_type: EntityType;
    entity_id: string;
    action: ChangeAction;
    changed_by: string;
    changed_by_user?: User;
    changed_at: string;
    before_snapshot?: Record<string, unknown>;
    after_snapshot?: Record<string, unknown>;
    change_summary?: string;
    ip_address?: string;
}

export type EntityType =
    | "paragraph"
    | "section"
    | "document"
    | "comment"
    | "decision";

export type ChangeAction =
    | "created"
    | "updated"
    | "deleted"
    | "status_changed";

// ==================== NOTIFICATIONS ====================
export interface Notification {
    id: string;
    user_id: string;
    notification_type: NotificationType;
    title: string;
    content?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export type NotificationType =
    | "comment_reply"
    | "mention"
    | "status_change"
    | "escalation"
    | "resolution"
    | "decision";

// ==================== CHAT ====================
export interface ChatMessage {
    id: string;
    user_id?: string;
    document_version_id?: string;
    role: "user" | "assistant";
    content: string;
    retrieved_paragraphs?: string[];
    citations?: Citation[];
    model_used?: string;
    token_count?: number;
    latency_ms?: number;
    feedback?: "thumbs_up" | "thumbs_down" | "flagged";
    created_at: string;
}

export interface Citation {
    paragraph_id: string;
    section_id: string;
    section_title: string;
    content_snippet: string;
}

// ==================== EMBEDDINGS ====================
export interface Embedding {
    id: string;
    paragraph_id: string;
    chunk_index: number;
    chunk_text: string;
    section_context?: string;
    metadata?: Record<string, unknown>;
    embedding?: number[];
    created_at: string;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T> {
    data?: T;
    error?: ApiError;
    status: "success" | "error";
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

// ==================== UI STATE ====================
export interface NavigationNode {
    id: string;
    section_id: string;
    title: string;
    level: number;
    children: NavigationNode[];
    paragraph_count: number;
    comment_count: number;
    status?: ParagraphStatus;
    is_expanded?: boolean;
}

export interface SearchResult {
    type: "paragraph" | "comment" | "decision";
    id: string;
    title: string;
    snippet: string;
    paragraph_id?: string;
    section_title?: string;
    relevance_score: number;
}

// ==================== DISCUSSION ROOMS ====================
export interface DiscussionRoom {
    id: string;
    name: string;
    description?: string;
    document_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
    creator?: User;
    member_count?: number;
    unread_count?: number;
}

export interface DiscussionRoomMember {
    id: string;
    room_id: string;
    user_id: string;
    role: "member" | "moderator" | "admin";
    joined_at: string;
    last_read_at: string;
    user?: User;
}

export interface DiscussionMessage {
    id: string;
    room_id: string;
    author_id: string;
    author?: User;
    content: string;
    parent_message_id?: string;
    paragraph_reference_id?: string;
    paragraph_reference?: Paragraph;
    created_at: string;
    edited_at?: string;
    is_deleted: boolean;
    replies?: DiscussionMessage[];
}
