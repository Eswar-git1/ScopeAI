"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Trash2, CheckCircle, Check, Clock } from "lucide-react";
import { useNotificationStore, useAuthStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types"; // Ensure you import the type if needed, though store has it

interface NotificationsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationsDialog({ isOpen, onClose }: NotificationsDialogProps) {
    const supabase = createClient();
    const { user } = useAuthStore();
    const {
        notifications,
        setNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotificationStore();
    const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
    const [loading, setLoading] = useState(false);

    // Fetch all notifications when dialog opens
    useEffect(() => {
        if (isOpen && user) {
            fetchAllNotifications();
        }
    }, [isOpen, user]);

    const fetchAllNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50); // Fetch more than the header limit

            if (error) throw error;
            if (data) {
                setNotifications(data as any);
            }
        } catch (error) {
            console.error("Error fetching all notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        markAsRead(id);
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id);
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic update
        markAllAsRead();
        if (user) {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent ensuring read if we click the row
        // Optimistic update
        deleteNotification(id);
        await supabase
            .from("notifications")
            .delete()
            .eq("id", id);
    };

    const filteredNotifications = activeTab === "all"
        ? notifications
        : notifications.filter(n => !n.is_read);

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
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--primary-500)]/10 rounded-lg">
                                <Bell className="w-5 h-5 text-[var(--primary-500)]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                                    Notifications
                                </h2>
                                <p className="text-sm text-[var(--text-muted)]">
                                    Manage your alerts and updates
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="px-6 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-tertiary)]/30">
                        <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-subtle)]">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === "all"
                                        ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab("unread")}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                    activeTab === "unread"
                                        ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                Unread
                                {notifications.filter(n => !n.is_read).length > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-[var(--primary-500)]"></span>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={handleMarkAllAsRead}
                            disabled={notifications.filter(n => !n.is_read).length === 0}
                            className="text-xs font-medium text-[var(--primary-400)] hover:text-[var(--primary-300)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-1.5 hover:bg-[var(--primary-500)]/10 rounded-md transition-colors"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Mark all as read
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]/30">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)]"></div>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] opacity-60">
                                <Bell className="w-12 h-12 mb-4 stroke-[1.5]" />
                                <p className="text-lg font-medium">No {activeTab} notifications</p>
                                <p className="text-sm">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "group p-4 hover:bg-[var(--bg-tertiary)]/50 transition-colors flex gap-4 relative",
                                            !notification.is_read && "bg-[var(--primary-500)]/5"
                                        )}
                                    >
                                        <div className="mt-1">
                                            {!notification.is_read ? (
                                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-500)] shadow-sm shadow-[var(--primary-500)]/50"></div>
                                            ) : (
                                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-subtle)]"></div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-1">
                                                <h4 className={cn(
                                                    "text-sm font-medium text-[var(--text-primary)] leading-snug",
                                                    !notification.is_read && "font-bold"
                                                )}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(notification.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
                                                {notification.content}
                                            </p>

                                            {notification.link && (
                                                <a href={notification.link} className="text-xs text-[var(--primary-400)] hover:underline inline-flex items-center gap-1 mb-2">
                                                    View details
                                                </a>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] shadow-lg rounded-lg border border-[var(--border-subtle)] p-1">
                                            {!notification.is_read && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                                                    className="p-1.5 text-[var(--primary-400)] hover:bg-[var(--primary-500)]/10 rounded-md transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(notification.id, e)}
                                                className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                title="Delete notification"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
