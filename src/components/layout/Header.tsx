"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Bell,
    Settings,
    User,
    LogOut,
    ChevronDown,
    Menu,
    Command,
    Moon,
    Sun,
    HelpCircle,
    FileText,
    Sparkles,
    MessageCircle,
    Shield,
} from "lucide-react";
import { useUIStore, useAuthStore, useDocumentStore, useNotificationStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationsDialog } from "./NotificationsDialog";

export function Header() {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAllNotificationsDialog, setShowAllNotificationsDialog] = useState(false);
    const [showVersionDropdown, setShowVersionDropdown] = useState(false);

    const { toggleSidebar, searchOpen, setSearchOpen, theme, setTheme, discussionPanelOpen, toggleDiscussionPanel } = useUIStore();
    const { user, profile, signOut } = useAuthStore();
    const { currentDocument } = useDocumentStore();
    const { notifications, unreadCount } = useNotificationStore();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        signOut();
        router.push("/login");
    };

    // Load notifications from database
    const fetchNotifications = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) {
                const { setNotifications } = useNotificationStore.getState();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Poll every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking inside a dropdown
            if (!target.closest('[data-dropdown]')) {
                setShowUserMenu(false);
                setShowNotifications(false);
                setShowVersionDropdown(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <header className="w-full h-16 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] z-50 shrink-0">
            <div className="h-full px-4 flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center gap-4">
                    {/* Menu Toggle */}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors md:hidden"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center shadow-lg shadow-[var(--primary-500)]/20">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-gradient">ScopeAI</h1>
                            <p className="text-xs text-[var(--text-muted)] -mt-0.5">Intelligence Platform</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-8 bg-[var(--border-subtle)]" />

                    {/* Document Info */}
                    {currentDocument && (
                        <div className="hidden md:flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-base font-semibold truncate max-w-[200px]">
                                {currentDocument.title}
                            </span>

                            {/* Version Dropdown */}
                            <div className="relative" data-dropdown>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowVersionDropdown(!showVersionDropdown);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--bg-tertiary)] rounded-md hover:bg-[var(--bg-tertiary)]/80 transition-colors"
                                >
                                    <span className="text-[var(--primary-400)]">v1.0.0</span>
                                    <ChevronDown className="w-3 h-3" />
                                </button>

                                <AnimatePresence>
                                    {showVersionDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg shadow-xl overflow-hidden"
                                        >
                                            <div className="p-2">
                                                <div className="text-xs text-[var(--text-muted)] px-2 py-1">Versions</div>
                                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] rounded-md flex items-center justify-between">
                                                    <span>v1.0.0 (Current)</span>
                                                    <span className="text-xs text-[var(--primary-400)]">Latest</span>
                                                </button>
                                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] rounded-md text-[var(--text-muted)]">
                                                    v0.9.0
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Status Badge */}
                            <span className={cn(
                                "px-2 py-0.5 text-xs rounded-full",
                                currentDocument.status === "draft" && "bg-gray-500/20 text-gray-400",
                                currentDocument.status === "review" && "bg-amber-500/20 text-amber-400",
                                currentDocument.status === "approved" && "bg-emerald-500/20 text-emerald-400"
                            )}>
                                {currentDocument.status || "Draft"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Center Section - Search */}
                <div className="flex-1 max-w-xl mx-4 hidden md:block">
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl hover:border-[var(--primary-500)]/50 transition-colors"
                    >
                        <Search className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-muted)]">Search sections, paragraphs...</span>
                        <span className="ml-auto flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Command className="w-3 h-3" />K
                        </span>
                    </button>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    {/* Mobile Search */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors md:hidden"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    {/* Discussion Rooms */}
                    {currentDocument && (
                        <button
                            onClick={toggleDiscussionPanel}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors relative"
                            title="Discussion Rooms"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </button>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    >
                        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative" data-dropdown>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowNotifications(!showNotifications);
                            }}
                            className="relative p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden"
                                >
                                    <div className="p-4 border-b border-[var(--border-subtle)]">
                                        <h3 className="font-semibold">Notifications</h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-[var(--text-muted)]">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No notifications yet</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className="p-3 hover:bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] last:border-0 cursor-pointer"
                                                >
                                                    <p className="text-sm font-medium">{notification.title}</p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">{notification.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-[var(--border-subtle)]">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false);
                                                setShowAllNotificationsDialog(true);
                                            }}
                                            className="w-full text-center text-sm text-[var(--primary-400)] hover:text-[var(--primary-300)]"
                                        >
                                            View all notifications
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User Menu */}
                    <div className="relative" data-dropdown>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowUserMenu(!showUserMenu);
                            }}
                            className="flex items-center gap-2 p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white font-semibold text-sm">
                                {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-sm font-medium">
                                    {profile?.full_name || user?.email?.split("@")[0] || "User"}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">{profile?.role || "Member"}</p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] hidden lg:block" />
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="absolute top-full right-0 mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden"
                                >
                                    <div className="p-3 border-b border-[var(--border-subtle)]">
                                        <p className="font-medium">{profile?.full_name || "User"}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                                    </div>
                                    <div className="p-2">
                                        {profile?.role === "admin" && (
                                            <button
                                                onClick={() => router.push("/admin")}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-red-400"
                                            >
                                                <Shield className="w-4 h-4" />
                                                Admin Panel
                                            </button>
                                        )}
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                                            <User className="w-4 h-4" />
                                            Profile
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                                            <HelpCircle className="w-4 h-4" />
                                            Help & Support
                                        </button>
                                    </div>
                                    <div className="p-2 border-t border-[var(--border-subtle)]">
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <NotificationsDialog
                isOpen={showAllNotificationsDialog}
                onClose={() => setShowAllNotificationsDialog(false)}
            />
        </header>
    );
}
