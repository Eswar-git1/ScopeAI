"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    MessageSquare,
    Send,
    ThumbsUp,
    AlertTriangle,
    HelpCircle,
    CheckCircle,
    Lightbulb,
    Eye,
    Clock,
    MoreHorizontal,
    Reply,
    Flag,
    Trash,
    Edit,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

interface Comment {
    id: string;
    paragraph_id: string;
    parent_comment_id: string | null;
    author_id: string;
    comment_type: string;
    content: string;
    status: string;
    priority: string;
    created_at: string;
    author?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        role: string;
    };
    replies?: Comment[];
}

interface CommentsDialogProps {
    paragraphId: string;
    paragraphTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

const commentTypes = [
    { value: "suggestion", label: "Suggestion", icon: Lightbulb, color: "text-blue-400" },
    { value: "objection", label: "Objection", icon: AlertTriangle, color: "text-red-400" },
    { value: "question", label: "Question", icon: HelpCircle, color: "text-amber-400" },
    { value: "approval", label: "Approval", icon: CheckCircle, color: "text-emerald-400" },
    { value: "observation", label: "Observation", icon: Eye, color: "text-purple-400" },
];

const priorityOptions = [
    { value: "low", label: "Low", color: "text-gray-400" },
    { value: "medium", label: "Medium", color: "text-amber-400" },
    { value: "high", label: "High", color: "text-orange-400" },
    { value: "critical", label: "Critical", color: "text-red-400" },
];

function CommentItem({ comment, onReply, onResolve }: {
    comment: Comment;
    onReply: (id: string) => void;
    onResolve: (id: string) => void;
}) {
    const [showActions, setShowActions] = useState(false);
    const typeConfig = commentTypes.find((t) => t.value === comment.comment_type) || commentTypes[0];
    const TypeIcon = typeConfig.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={cn(
                "p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]",
                comment.status === "resolved" && "opacity-60"
            )}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white font-semibold text-sm">
                            {comment.author?.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{comment.author?.full_name || "User"}</span>
                                <span className={cn("flex items-center gap-1 text-xs", typeConfig.color)}>
                                    <TypeIcon className="w-3 h-3" />
                                    {typeConfig.label}
                                </span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">
                                {new Date(comment.created_at).toLocaleDateString()} at{" "}
                                {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                        {comment.status === "resolved" ? (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                Resolved
                            </span>
                        ) : (
                            <span className={cn(
                                "px-2 py-0.5 text-xs rounded-full",
                                comment.priority === "critical" && "bg-red-500/20 text-red-400",
                                comment.priority === "high" && "bg-orange-500/20 text-orange-400",
                                comment.priority === "medium" && "bg-amber-500/20 text-amber-400",
                                comment.priority === "low" && "bg-gray-500/20 text-gray-400"
                            )}>
                                {comment.priority}
                            </span>
                        )}

                        <AnimatePresence>
                            {showActions && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-1"
                                >
                                    <button
                                        onClick={() => onReply(comment.id)}
                                        className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-muted)]"
                                        title="Reply"
                                    >
                                        <Reply className="w-4 h-4" />
                                    </button>
                                    {comment.status !== "resolved" && (
                                        <button
                                            onClick={() => onResolve(comment.id)}
                                            className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400"
                                            title="Resolve"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-muted)]">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Content */}
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                    {comment.content}
                </p>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-[var(--border-subtle)] space-y-3">
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                onReply={onReply}
                                onResolve={onResolve}
                            />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export function CommentsDialog({ paragraphId, paragraphTitle, isOpen, onClose }: CommentsDialogProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [commentType, setCommentType] = useState("suggestion");
    const [priority, setPriority] = useState("medium");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const { user, profile } = useAuthStore();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && paragraphId) {
            fetchComments();
        }
    }, [isOpen, paragraphId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("comments")
                .select(`
          id,
          paragraph_id,
          parent_comment_id,
          author_id,
          comment_type,
          content,
          status,
          priority,
          created_at,
          author:profiles!author_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
                .eq("paragraph_id", paragraphId)
                .order("created_at", { ascending: true });

            if (error) throw error;

            // Organize into threads
            const commentMap = new Map<string, Comment>();
            const topLevel: Comment[] = [];

            data?.forEach((comment: any) => {
                commentMap.set(comment.id, { ...comment, replies: [] });
            });

            data?.forEach((comment: any) => {
                const enrichedComment = commentMap.get(comment.id)!;
                if (comment.parent_comment_id) {
                    const parent = commentMap.get(comment.parent_comment_id);
                    if (parent) {
                        parent.replies?.push(enrichedComment);
                    }
                } else {
                    topLevel.push(enrichedComment);
                }
            });

            setComments(topLevel);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setSubmitting(true);
        try {
            const { data, error } = await supabase
                .from("comments")
                .insert({
                    paragraph_id: paragraphId,
                    parent_comment_id: replyingTo,
                    author_id: user.id,
                    comment_type: commentType,
                    content: newComment,
                    priority: replyingTo ? "medium" : priority,
                    status: "open",
                })
                .select(`
          id,
          paragraph_id,
          parent_comment_id,
          author_id,
          comment_type,
          content,
          status,
          priority,
          created_at
        `)
                .single();

            if (error) throw error;

            // Add the new comment with author info
            const newCommentWithAuthor = {
                ...data,
                author: {
                    id: user.id,
                    full_name: profile?.full_name || user.email?.split("@")[0] || "User",
                    avatar_url: profile?.avatar_url,
                    role: profile?.role || "member",
                },
                replies: [],
            };

            if (replyingTo) {
                // Add as reply
                setComments((prev) =>
                    prev.map((c) => {
                        if (c.id === replyingTo) {
                            return { ...c, replies: [...(c.replies || []), newCommentWithAuthor] };
                        }
                        return c;
                    })
                );
            } else {
                setComments((prev) => [...prev, newCommentWithAuthor]);
            }

            setNewComment("");
            setReplyingTo(null);
        } catch (error) {
            console.error("Error creating comment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async (commentId: string) => {
        try {
            await supabase
                .from("comments")
                .update({ status: "resolved", resolved_at: new Date().toISOString() })
                .eq("id", commentId);

            setComments((prev) =>
                prev.map((c) => (c.id === commentId ? { ...c, status: "resolved" } : c))
            );
        } catch (error) {
            console.error("Error resolving comment:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[var(--primary-400)]" />
                                Comments
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">{paragraphTitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)]"></div>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                                <p className="text-[var(--text-muted)]">No comments yet</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Be the first to add feedback</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={setReplyingTo}
                                    onResolve={handleResolve}
                                />
                            ))
                        )}
                    </div>

                    {/* Reply Indicator */}
                    {replyingTo && (
                        <div className="mx-4 p-2 bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30 rounded-lg flex items-center justify-between">
                            <span className="text-sm text-[var(--primary-400)]">Replying to comment</span>
                            <button
                                onClick={() => setReplyingTo(null)}
                                className="p-1 hover:bg-[var(--primary-500)]/20 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* New Comment Form */}
                    <div className="p-4 border-t border-[var(--border-subtle)]">
                        <form onSubmit={handleSubmit}>
                            {/* Type & Priority Selection */}
                            {!replyingTo && (
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-1">
                                        {commentTypes.map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => setCommentType(type.value)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-colors",
                                                        commentType === type.value
                                                            ? "bg-[var(--bg-tertiary)]"
                                                            : "hover:bg-[var(--bg-tertiary)]"
                                                    )}
                                                    title={type.label}
                                                >
                                                    <Icon className={cn("w-4 h-4", type.color)} />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="h-4 w-px bg-[var(--border-subtle)]" />

                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-sm"
                                    >
                                        {priorityOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label} Priority
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Input */}
                            <div className="relative">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                                    rows={2}
                                    className="w-full resize-none bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || submitting}
                                    className={cn(
                                        "absolute right-2 bottom-2 p-2 rounded-lg transition-all",
                                        newComment.trim() && !submitting
                                            ? "bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)]"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                                    )}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
}
