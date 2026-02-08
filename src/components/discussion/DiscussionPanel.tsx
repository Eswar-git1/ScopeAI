"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Users,
  Settings,
  Hash,
  X,
  Reply,
  Trash2,
  Edit2,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, useDocumentStore } from "@/store";
import type {
  DiscussionRoom,
  DiscussionMessage,
  DiscussionRoomMember,
} from "@/types";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { ManageMembersDialog } from "./ManageMembersDialog";

interface DiscussionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscussionPanel({ isOpen, onClose }: DiscussionPanelProps) {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const { currentDocument } = useDocumentStore();
  const [rooms, setRooms] = useState<DiscussionRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<DiscussionRoom | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [members, setMembers] = useState<DiscussionRoomMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load rooms for current document
  useEffect(() => {
    if (!currentDocument?.id || !user?.id) return;
    loadRooms();

    // Subscribe to room changes
    const roomsChannel = supabase
      .channel("discussion_rooms_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_rooms",
          filter: `document_id=eq.${currentDocument.id}`,
        },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      roomsChannel.unsubscribe();
    };
  }, [currentDocument?.id, user?.id]);

  // Load messages when room is selected
  useEffect(() => {
    if (!selectedRoom?.id) return;
    loadMessages();
    loadMembers();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`room_${selectedRoom.id}_messages`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    // Update last_read_at
    updateLastRead();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [selectedRoom?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadRooms = async () => {
    if (!currentDocument?.id) return;

    const { data, error } = await supabase
      .from("discussion_rooms")
      .select(
        `
        *,
        creator:profiles!discussion_rooms_created_by_fkey(id, email, full_name, avatar_url)
      `
      )
      .eq("document_id", currentDocument.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setRooms(data as any);

      // Auto-select first room if none selected
      if (!selectedRoom && data.length > 0) {
        setSelectedRoom(data[0] as any);
      }
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("discussion_messages")
      .select(
        `
        *,
        author:profiles!discussion_messages_author_id_fkey(id, email, full_name, avatar_url),
        paragraph_reference:paragraphs(id, paragraph_id, content)
      `
      )
      .eq("room_id", selectedRoom.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as any);
    }
    setLoading(false);
  };

  const loadMembers = async () => {
    if (!selectedRoom?.id) return;

    const { data, error } = await supabase
      .from("discussion_room_members")
      .select(
        `
        *,
        user:profiles!discussion_room_members_user_id_fkey(id, email, full_name, avatar_url, role)
      `
      )
      .eq("room_id", selectedRoom.id);

    if (!error && data) {
      setMembers(data as any);
    }
  };

  const updateLastRead = async () => {
    if (!selectedRoom?.id || !user?.id) return;

    await supabase
      .from("discussion_room_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("room_id", selectedRoom.id)
      .eq("user_id", user.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom?.id || !user?.id) return;

    const { error } = await supabase.from("discussion_messages").insert({
      room_id: selectedRoom.id,
      author_id: user.id,
      content: newMessage.trim(),
      parent_message_id: replyTo?.id,
    });

    if (!error) {
      setNewMessage("");
      setReplyTo(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await supabase
      .from("discussion_messages")
      .update({ is_deleted: true })
      .eq("id", messageId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen w-full md:w-[480px] bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] shadow-2xl z-50 flex flex-col font-sans"
      >
        {/* Main Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] relative z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary-500)]/10 rounded-xl text-[var(--primary-400)]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Discussion</h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Real-time collaboration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        {!selectedRoom ? (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Available Rooms
              </h3>
              {(profile?.role === "admin" || profile?.role === "owner") && (
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="px-3 py-1.5 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white text-xs font-semibold rounded-lg transition-all shadow-lg shadow-[var(--primary-500)]/20 flex items-center gap-1"
                >
                  <span>+ New Room</span>
                </button>
              )}
            </div>

            {rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] opacity-60">
                <div className="p-4 bg-[var(--bg-tertiary)] rounded-full mb-4">
                  <MessageCircle className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-sm font-medium">No discussion rooms yet</p>
                {(profile?.role === "admin" || profile?.role === "owner") && (
                  <p className="text-xs mt-2 text-[var(--text-secondary)]">Create a room to start discussing</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="w-full p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--primary-500)]/30 rounded-xl text-left transition-all group relative overflow-hidden shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[var(--primary-500)]/10 rounded-md text-[var(--primary-400)] group-hover:bg-[var(--primary-500)] group-hover:text-white transition-colors">
                          <Hash className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-[var(--text-primary)] text-sm group-hover:text-[var(--primary-400)] transition-colors">
                          {room.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.unread_count && room.unread_count > 0 ? (
                          <span className="px-2 py-0.5 bg-[var(--primary-500)] text-white text-[10px] font-bold rounded-full">
                            {room.unread_count}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                          {room.updated_at ? formatTime(room.updated_at) : ''}
                        </span>
                      </div>
                    </div>

                    {room.description && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 pl-9 mb-2 leading-relaxed opacity-80">
                        {room.description}
                      </p>
                    )}

                    <div className="pl-9 flex items-center gap-3 text-[10px] text-[var(--text-muted)] font-medium">
                      <span className="flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                        <Users className="w-3 h-3" />
                        {room.member_count || 0} members
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Room Header */}
            <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/95 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1 pl-0 pr-2 rounded-md group"
                >
                  <div className="p-1 rounded-md bg-[var(--bg-tertiary)] group-hover:bg-[var(--primary-500)]/10 transition-colors">
                    <Reply className="w-3.5 h-3.5 group-hover:text-[var(--primary-400)] rotate-180" />
                  </div>
                  <span>All Rooms</span>
                </button>
                <button
                  onClick={() => setManageMembersOpen(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1.5 hover:bg-[var(--bg-tertiary)] rounded-md"
                  title="Room Members"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Hash className="w-4 h-4 text-[var(--primary-400)]" />
                    <h3 className="font-bold text-base text-[var(--text-primary)]">{selectedRoom.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-6">
                    <span>{members.length} participants</span>
                    {selectedRoom.description && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]"></span>
                        <span className="line-clamp-1 max-w-[200px]">{selectedRoom.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[var(--bg-primary)]/30">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-500)]"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-50">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 rotate-3">
                    <MessageCircle className="w-8 h-8 text-[var(--primary-400)] stroke-[1.5]" />
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-[var(--text-muted)]">Be the first to say hello!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMe = message.author_id === user?.id;
                  const showAvatar = index === messages.length - 1 || messages[index + 1]?.author_id !== message.author_id;
                  const isAdmin = message.author?.id && members.find(m => m.user_id === message.author_id && m.role === 'admin');

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 group ${isMe ? "flex-row-reverse" : "flex-row"} ${!showAvatar ? (isMe ? "mr-[40px]" : "ml-[40px]") : ""}`}
                    >
                      {/* Avatar */}
                      {showAvatar && (
                        <div className="flex-shrink-0 self-end mb-1">
                          {message.author?.avatar_url ? (
                            <img
                              src={message.author.avatar_url}
                              alt={message.author.full_name || "User"}
                              className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] object-cover ring-2 ring-[var(--bg-primary)]"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-[var(--bg-primary)] ${isMe ? "bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-600)]" : "bg-gradient-to-br from-slate-500 to-slate-600"}`}>
                              {message.author?.full_name?.[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                        {/* Name - only show for first message in sequence */}
                        {(index === 0 || messages[index - 1]?.author_id !== message.author_id) && (
                          <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                            <span className={`text-[11px] font-semibold ${isMe ? "text-[var(--primary-400)]" : "text-[var(--text-primary)]"}`}>
                              {message.author?.full_name || "Unknown"}
                            </span>
                            {isAdmin && <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">Admin</span>}
                            <span className="text-[10px] text-[var(--text-muted)] opacity-60">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        )}

                        {message.paragraph_reference && (
                          <div className={`mb-2 p-2.5 rounded-lg text-xs border border-[var(--border-subtle)] max-w-full ${isMe ? "bg-[var(--primary-500)]/10 border-[var(--primary-500)]/20" : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)]"}`}>
                            <div className="flex items-center gap-1.5 text-[var(--primary-400)] mb-1 font-medium text-[10px] uppercase tracking-wider">
                              <FileText className="w-3 h-3" />
                              <span>Referenced Context</span>
                            </div>
                            <p className="text-[var(--text-secondary)] italic line-clamp-2 leading-relaxed">
                              "{message.paragraph_reference.content}"
                            </p>
                          </div>
                        )}

                        <div className="relative group/bubble">
                          <div
                            className={`px-4 py-2.5 text-sm shadow-sm leading-relaxed whitespace-pre-wrap break-words ${isMe
                                ? "bg-[var(--primary-600)] text-white rounded-2xl rounded-tr-sm"
                                : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-2xl rounded-tl-sm"
                              }`}
                          >
                            {message.content}
                          </div>

                          {/* Message Actions */}
                          <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "-left-14 pr-2" : "-right-14 pl-2"} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1`}>
                            <button
                              onClick={() => setReplyTo(message)}
                              className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            {isMe && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded-full text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] relative z-20">
              {replyTo && (
                <div className="mb-3 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in shadow-lg">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-1 h-8 bg-[var(--primary-500)] rounded-full"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[var(--primary-400)] font-bold uppercase tracking-wider">Replying to</span>
                      <span className="text-sm text-[var(--text-primary)] truncate font-medium">{replyTo.author?.full_name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--text-muted)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-end bg-[var(--bg-tertiary)] p-1.5 rounded-2xl border border-[var(--border-subtle)] focus-within:border-[var(--primary-500)]/50 focus-within:ring-1 focus-within:ring-[var(--primary-500)]/50 transition-all shadow-sm">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2.5 bg-transparent border-none focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 text-sm font-medium"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-[var(--primary-500)] text-white rounded-xl hover:bg-[var(--primary-600)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 mb-0.5 mr-0.5"
                >
                  <Send className="w-4 h-4 text-white fill-current" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Dialogs */}
      <CreateRoomDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        documentId={currentDocument?.id || ""}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadRooms();
        }}
      />

      <ManageMembersDialog
        isOpen={manageMembersOpen}
        onClose={() => setManageMembersOpen(false)}
        room={selectedRoom}
        members={members}
        onUpdate={loadMembers}
      />
    </>
  );
}
