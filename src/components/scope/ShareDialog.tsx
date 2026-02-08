"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Users, Mail, Link as LinkIcon, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import type { User } from "@/types";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

type PermissionRole = "viewer" | "commenter" | "reviewer" | "editor" | "owner";

export function ShareDialog({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}: ShareDialogProps) {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sharedWith, setSharedWith] = useState<
    Array<{ id: string; user: User; role: PermissionRole; granted_at: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<PermissionRole>("viewer");
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadSharedUsers();
      generateShareLink();
    }
  }, [isOpen, documentId]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .neq("id", user?.id)
      .order("full_name");

    if (data) setAllUsers(data as any);
  };

  const loadSharedUsers = async () => {
    const { data } = await supabase
      .from("document_permissions")
      .select(`
        id,
        role,
        granted_at,
        user:profiles!document_permissions_user_id_fkey(*)
      `)
      .eq("document_id", documentId);

    if (data) setSharedWith(data as any);
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    setShareLink(`${baseUrl}/documents/${documentId}`);
  };

  const handleShare = async () => {
    if (!selectedUserId || !user?.id) return;

    setLoading(true);
    try {
      // Add permission
      const { error: permError } = await supabase
        .from("document_permissions")
        .insert({
          document_id: documentId,
          user_id: selectedUserId,
          role: selectedRole,
          granted_by: user.id,
        });

      if (permError) throw permError;

      // Send notification
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        notification_type: "status_change",
        title: "Document Shared With You",
        content: `${profile?.full_name || "Someone"} shared "${documentTitle}" with you as ${selectedRole}`,
        link: `/documents/${documentId}`,
      });

      // Reload shared users
      await loadSharedUsers();
      setSelectedUserId("");
      setSelectedRole("viewer");
    } catch (err) {
      console.error("Error sharing document:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccess = async (permissionId: string, userId: string) => {
    try {
      await supabase.from("document_permissions").delete().eq("id", permissionId);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: userId,
        notification_type: "status_change",
        title: "Document Access Removed",
        content: `Your access to "${documentTitle}" has been removed`,
      });

      await loadSharedUsers();
    } catch (err) {
      console.error("Error removing access:", err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      !sharedWith.some((s) => s.user?.id === u.id) &&
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const roleOptions: { value: PermissionRole; label: string; description: string }[] = [
    { value: "viewer", label: "Viewer", description: "Can view document only" },
    {
      value: "commenter",
      label: "Commenter",
      description: "Can view and add comments",
    },
    {
      value: "reviewer",
      label: "Reviewer",
      description: "Can review and make decisions",
    },
    {
      value: "editor",
      label: "Editor",
      description: "Can edit content",
    },
    {
      value: "owner",
      label: "Owner",
      description: "Full access and management",
    },
  ];

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
          className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Share2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Share Document
                </h2>
                <p className="text-sm text-[var(--text-muted)]">{documentTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Share Link */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-[var(--primary-500)] text-white rounded-lg hover:bg-[var(--primary-600)] transition-colors flex items-center gap-2"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Add People */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Add People
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-[var(--text-primary)] text-sm"
                />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as PermissionRole)}
                  className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {searchQuery && filteredUsers.length > 0 && (
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredUsers.slice(0, 5).map((availableUser) => (
                    <button
                      key={availableUser.id}
                      onClick={() => {
                        setSelectedUserId(availableUser.id);
                        handleShare();
                        setSearchQuery("");
                      }}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white text-sm font-semibold">
                          {availableUser.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {availableUser.full_name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {availableUser.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--primary-400)]">Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* People with Access */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                People with Access ({sharedWith.length})
              </label>
              {sharedWith.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">
                  No one has been granted access yet
                </p>
              ) : (
                <div className="space-y-2">
                  {sharedWith.map((share) => {
                    if (!share.user) return null;
                    return (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white text-sm font-semibold">
                            {share.user.full_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {share.user.full_name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {share.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs font-medium text-[var(--text-primary)]">
                            {share.role}
                          </span>
                          {(profile?.role === "admin" ||
                            profile?.role === "owner") && (
                              <button
                                onClick={() =>
                                  handleRemoveAccess(share.id, share.user.id)
                                }
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Remove access"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border-subtle)]">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)]/80 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
