"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Search,
  UserPlus,
  Trash2,
  Mail,
  Shield,
  Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import type { User } from "@/types";

interface CollaboratorsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
  };
  onUpdate: () => void;
}

type PermissionRole = "viewer" | "commenter" | "reviewer" | "editor" | "owner";

interface Collaborator {
  id: string;
  user_id: string;
  role: PermissionRole;
  granted_at: string;
  user?: User;
}

export function CollaboratorsDialog({
  isOpen,
  onClose,
  document,
  onUpdate,
}: CollaboratorsDialogProps) {
  const supabase = createClient();
  const { user: currentUser } = useAuthStore();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<PermissionRole>("viewer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
      loadAllUsers();
    }
  }, [isOpen, document.id]);

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from("document_permissions")
      .select(`
        *,
        user:profiles!document_permissions_user_id_fkey(*)
      `)
      .eq("document_id", document.id)
      .order("granted_at", { ascending: false });

    if (data) {
      setCollaborators(data as any);
    }
  };

  const loadAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("full_name");

    if (data) {
      setAllUsers(data as any);
    }
  };

  const handleAddCollaborator = async (userId: string) => {
    setLoading(true);
    try {
      // Add permission
      const { error: permError } = await supabase
        .from("document_permissions")
        .insert({
          document_id: document.id,
          user_id: userId,
          role: selectedRole,
          granted_by: currentUser?.id,
        });

      if (permError) throw permError;

      // Send notification
      await supabase.from("notifications").insert({
        user_id: userId,
        notification_type: "status_change",
        title: "Added to Project",
        content: `You've been added to "${document.title}" as ${selectedRole}`,
        link: `/documents/${document.id}`,
      });

      await loadCollaborators();
      onUpdate();
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error adding collaborator:", error);
      if (error.code === "23505") {
        alert("This user is already a collaborator");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (permissionId: string, newRole: PermissionRole) => {
    try {
      const { error } = await supabase
        .from("document_permissions")
        .update({ role: newRole })
        .eq("id", permissionId);

      if (!error) {
        await loadCollaborators();
        onUpdate();
      }
    } catch (error) {
      console.error("Error changing role:", error);
    }
  };

  const handleRemoveCollaborator = async (permissionId: string, userId: string) => {
    if (!confirm("Remove this collaborator from the project?")) return;

    try {
      const { error } = await supabase
        .from("document_permissions")
        .delete()
        .eq("id", permissionId);

      if (!error) {
        // Notify user
        await supabase.from("notifications").insert({
          user_id: userId,
          notification_type: "status_change",
          title: "Removed from Project",
          content: `You've been removed from "${document.title}"`,
        });

        await loadCollaborators();
        onUpdate();
      }
    } catch (error) {
      console.error("Error removing collaborator:", error);
    }
  };

  const availableUsers = allUsers.filter(
    (u) =>
      !collaborators.some((c) => c.user_id === u.id) &&
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const roleOptions: { value: PermissionRole; label: string; icon: any }[] = [
    { value: "viewer", label: "Viewer", icon: Shield },
    { value: "commenter", label: "Commenter", icon: Mail },
    { value: "reviewer", label: "Reviewer", icon: Users },
    { value: "editor", label: "Editor", icon: Shield },
    { value: "owner", label: "Owner", icon: Crown },
  ];

  const roleColors: Record<PermissionRole, string> = {
    viewer: "bg-gray-500/20 text-gray-400",
    commenter: "bg-amber-500/20 text-amber-400",
    reviewer: "bg-green-500/20 text-green-400",
    editor: "bg-blue-500/20 text-blue-400",
    owner: "bg-purple-500/20 text-purple-400",
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
          className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Manage Collaborators
                </h2>
                <p className="text-sm text-[var(--text-muted)]">{document.title}</p>
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
            {/* Add Collaborator */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Add Collaborator
              </label>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-[var(--text-primary)] text-sm"
                  />
                </div>
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

              {/* Available Users */}
              {searchQuery && availableUsers.length > 0 && (
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {availableUsers.slice(0, 5).map((availableUser) => (
                    <button
                      key={availableUser.id}
                      onClick={() => handleAddCollaborator(availableUser.id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left disabled:opacity-50"
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
                      <UserPlus className="w-4 h-4 text-[var(--primary-400)]" />
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && availableUsers.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-3">
                  No users found or all users are already collaborators
                </p>
              )}
            </div>

            {/* Current Collaborators */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Current Collaborators ({collaborators.length})
              </label>
              {collaborators.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">
                  No collaborators yet
                </p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collab) => {
                    if (!collab.user) return null;
                    return (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white font-semibold">
                            {collab.user.full_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {collab.user.full_name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {collab.user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={collab.role}
                            onChange={(e) =>
                              handleChangeRole(collab.id, e.target.value as PermissionRole)
                            }
                            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)]"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() =>
                              handleRemoveCollaborator(collab.id, collab.user_id)
                            }
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
              className="w-full px-4 py-2 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
