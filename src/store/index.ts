import { create } from "zustand";
import { User } from "@supabase/supabase-js";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    role: string;
    is_active: boolean;
}

interface Document {
    id: string;
    title: string;
    description?: string;
    status: string;
    current_version_id?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

interface Section {
    id: string;
    section_id: string;
    title: string;
    level: number;
    order_index: number;
    parent_section_id?: string;
}

interface Paragraph {
    id: string;
    paragraph_id: string;
    content: string;
    status: string;
    order_index: number;
}

interface Notification {
    id: string;
    notification_type: string;
    title: string;
    content?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Array<{
        paragraph_id: string;
        section_title: string;
        content_snippet: string;
    }>;
    model_used?: string;
    latency_ms?: number;
    feedback?: "thumbs_up" | "thumbs_down" | null;
    created_at: string;
}

// ============================================================
// AUTH STORE
// ============================================================

interface AuthState {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
    user: null,
    profile: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (isLoading) => set({ isLoading }),
    signOut: () => set({ user: null, profile: null }),
}));

// ============================================================
// DOCUMENT STORE
// ============================================================

interface DocumentState {
    currentDocument: Document | null;
    documents: Document[];
    sections: Section[];
    paragraphs: Paragraph[];
    isLoading: boolean;
    setCurrentDocument: (doc: Document | null) => void;
    setDocuments: (docs: Document[]) => void;
    setSections: (sections: Section[]) => void;
    setParagraphs: (paragraphs: Paragraph[]) => void;
    setLoading: (loading: boolean) => void;
}

export const useDocumentStore = create<DocumentState>()((set) => ({
    currentDocument: null,
    documents: [],
    sections: [],
    paragraphs: [],
    isLoading: false,
    setCurrentDocument: (currentDocument) => set({ currentDocument }),
    setDocuments: (documents) => set({ documents }),
    setSections: (sections) => set({ sections }),
    setParagraphs: (paragraphs) => set({ paragraphs }),
    setLoading: (isLoading) => set({ isLoading }),
}));

// ============================================================
// UI STORE
// ============================================================

interface UIState {
    sidebarCollapsed: boolean;
    chatPanelOpen: boolean;
    discussionPanelOpen: boolean;
    selectedParagraphId: string | null;
    selectedSectionId: string | null;
    searchQuery: string;
    searchOpen: boolean;
    commentsPanelOpen: boolean;
    theme: "light" | "dark";

    toggleSidebar: () => void;
    toggleChatPanel: () => void;
    toggleDiscussionPanel: () => void;
    setSelectedParagraph: (id: string | null) => void;
    setSelectedSection: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    setSearchOpen: (open: boolean) => void;
    toggleCommentsPanel: () => void;
    setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>()((set) => ({
    sidebarCollapsed: false,
    chatPanelOpen: true,
    discussionPanelOpen: false,
    selectedParagraphId: null,
    selectedSectionId: null,
    searchQuery: "",
    searchOpen: false,
    commentsPanelOpen: false,
    theme: "dark",

    toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    toggleChatPanel: () =>
        set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),
    toggleDiscussionPanel: () =>
        set((state) => ({ discussionPanelOpen: !state.discussionPanelOpen })),
    setSelectedParagraph: (selectedParagraphId) => set({ selectedParagraphId }),
    setSelectedSection: (selectedSectionId) => set({ selectedSectionId }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSearchOpen: (searchOpen) => set({ searchOpen }),
    toggleCommentsPanel: () =>
        set((state) => ({ commentsPanelOpen: !state.commentsPanelOpen })),
    setTheme: (theme) => set({ theme }),
}));

// ============================================================
// CHAT STORE
// ============================================================

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    contextParagraphId: string | null;
    aiMode: "research" | "critique";

    addMessage: (message: ChatMessage) => void;
    setMessages: (messages: ChatMessage[]) => void;
    clearMessages: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setContextParagraph: (id: string | null) => void;
    setAiMode: (mode: "research" | "critique") => void;
    updateMessageFeedback: (id: string, feedback: "thumbs_up" | "thumbs_down") => void;
}

export const useChatStore = create<ChatState>()((set) => ({
    messages: [],
    isLoading: false,
    error: null,
    contextParagraphId: null,
    aiMode: "research",

    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
    setMessages: (messages) => set({ messages }),
    clearMessages: () => set({ messages: [] }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setContextParagraph: (contextParagraphId) => set({ contextParagraphId }),
    setAiMode: (aiMode) => set({ aiMode }),
    updateMessageFeedback: (id, feedback) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, feedback } : m
            ),
        })),
}));

// ============================================================
// NOTIFICATION STORE
// ============================================================

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
    notifications: [],
    unreadCount: 0,
    setNotifications: (notifications) =>
        set({
            notifications,
            unreadCount: notifications.filter((n) => !n.is_read).length,
        }),
    addNotification: (notification) =>
        set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
        })),
    markAsRead: (id) =>
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            // If already read, or not found, don't change unread count improperly
            if (!notification || notification.is_read) {
                return {
                    notifications: state.notifications.map((n) =>
                        n.id === id ? { ...n, is_read: true } : n
                    ),
                }
            }
            return {
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            };
        }),
    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
            unreadCount: 0,
        })),
    deleteNotification: (id) =>
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            const wasUnread = notification && !notification.is_read;
            return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            };
        }),
}));

// ============================================================
// COMMENTS STORE
// ============================================================

interface Comment {
    id: string;
    paragraph_id: string;
    author_id: string;
    comment_type: string;
    content: string;
    status: string;
    priority: string;
    created_at: string;
    author?: Profile;
    replies?: Comment[];
}

interface CommentsState {
    comments: Comment[];
    selectedCommentId: string | null;
    isLoading: boolean;
    setComments: (comments: Comment[]) => void;
    addComment: (comment: Comment) => void;
    updateComment: (id: string, updates: Partial<Comment>) => void;
    deleteComment: (id: string) => void;
    setSelectedComment: (id: string | null) => void;
    setLoading: (loading: boolean) => void;
}

export const useCommentsStore = create<CommentsState>()((set) => ({
    comments: [],
    selectedCommentId: null,
    isLoading: false,
    setComments: (comments) => set({ comments }),
    addComment: (comment) =>
        set((state) => ({ comments: [...state.comments, comment] })),
    updateComment: (id, updates) =>
        set((state) => ({
            comments: state.comments.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            ),
        })),
    deleteComment: (id) =>
        set((state) => ({
            comments: state.comments.filter((c) => c.id !== id),
        })),
    setSelectedComment: (selectedCommentId) => set({ selectedCommentId }),
    setLoading: (isLoading) => set({ isLoading }),
}));
