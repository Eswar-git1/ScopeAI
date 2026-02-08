import { create } from "zustand";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface DiscussionRoom {
    id: string;
    name: string;
    description?: string;
    document_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
}

export interface DiscussionMessage {
    id: string;
    room_id: string;
    author_id: string;
    content: string;
    parent_message_id?: string;
    paragraph_reference_id?: string;
    created_at: string;
    edited_at?: string;
    is_deleted: boolean;
    author?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

export interface DiscussionRoomMember {
    id: string;
    room_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    last_read_at: string;
}

export interface PresenceUser {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    online_at: string;
}

// ============================================================
// DISCUSSION STORE
// ============================================================

interface DiscussionState {
    rooms: DiscussionRoom[];
    currentRoom: DiscussionRoom | null;
    messages: DiscussionMessage[];
    members: DiscussionRoomMember[];
    onlineUsers: PresenceUser[];
    isLoading: boolean;
    error: string | null;

    // Room actions
    setRooms: (rooms: DiscussionRoom[]) => void;
    setCurrentRoom: (room: DiscussionRoom | null) => void;
    addRoom: (room: DiscussionRoom) => void;
    updateRoom: (id: string, updates: Partial<DiscussionRoom>) => void;
    deleteRoom: (id: string) => void;

    // Message actions
    setMessages: (messages: DiscussionMessage[]) => void;
    addMessage: (message: DiscussionMessage) => void;
    updateMessage: (id: string, updates: Partial<DiscussionMessage>) => void;
    deleteMessage: (id: string) => void;
    clearMessages: () => void;

    // Member actions
    setMembers: (members: DiscussionRoomMember[]) => void;
    addMember: (member: DiscussionRoomMember) => void;
    removeMember: (id: string) => void;

    // Presence actions
    updatePresence: (users: PresenceUser[]) => void;
    addPresenceUser: (user: PresenceUser) => void;
    removePresenceUser: (userId: string) => void;

    // UI state
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useDiscussionStore = create<DiscussionState>()((set) => ({
    rooms: [],
    currentRoom: null,
    messages: [],
    members: [],
    onlineUsers: [],
    isLoading: false,
    error: null,

    // Room actions
    setRooms: (rooms) => set({ rooms }),
    setCurrentRoom: (currentRoom) => set({ currentRoom, messages: [] }),
    addRoom: (room) =>
        set((state) => ({ rooms: [...state.rooms, room] })),
    updateRoom: (id, updates) =>
        set((state) => ({
            rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)),
            currentRoom:
                state.currentRoom?.id === id
                    ? { ...state.currentRoom, ...updates }
                    : state.currentRoom,
        })),
    deleteRoom: (id) =>
        set((state) => ({
            rooms: state.rooms.filter((r) => r.id !== id),
            currentRoom: state.currentRoom?.id === id ? null : state.currentRoom,
        })),

    // Message actions
    setMessages: (messages) => set({ messages }),
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
    updateMessage: (id, updates) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, ...updates } : m
            ),
        })),
    deleteMessage: (id) =>
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, is_deleted: true } : m
            ),
        })),
    clearMessages: () => set({ messages: [] }),

    // Member actions
    setMembers: (members) => set({ members }),
    addMember: (member) =>
        set((state) => ({ members: [...state.members, member] })),
    removeMember: (id) =>
        set((state) => ({
            members: state.members.filter((m) => m.id !== id),
        })),

    // Presence actions
    updatePresence: (onlineUsers) => set({ onlineUsers }),
    addPresenceUser: (user) =>
        set((state) => {
            const exists = state.onlineUsers.find((u) => u.user_id === user.user_id);
            if (exists) {
                return {
                    onlineUsers: state.onlineUsers.map((u) =>
                        u.user_id === user.user_id ? user : u
                    ),
                };
            }
            return { onlineUsers: [...state.onlineUsers, user] };
        }),
    removePresenceUser: (userId) =>
        set((state) => ({
            onlineUsers: state.onlineUsers.filter((u) => u.user_id !== userId),
        })),

    // UI state
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
}));
