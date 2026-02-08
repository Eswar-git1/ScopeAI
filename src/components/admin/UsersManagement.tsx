"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

type UserRole = "viewer" | "commenter" | "reviewer" | "editor" | "owner" | "admin";

export function UsersManagement() {
  const supabase = createClient();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("viewer");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data as any);
    }
    setLoading(false);
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (!error) {
        // Send notification to user
        await supabase.from("notifications").insert({
          user_id: userId,
          notification_type: "status_change",
          title: "Your Role Has Been Updated",
          content: `Your role has been changed to ${role}`,
        });

        await loadUsers();
        setEditingUser(null);
      }
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !isActive })
        .eq("id", userId);

      if (!error) {
        await loadUsers();
      }
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleColors: Record<UserRole, string> = {
    admin: "bg-red-500/20 text-red-400",
    owner: "bg-purple-500/20 text-purple-400",
    editor: "bg-blue-500/20 text-blue-400",
    reviewer: "bg-green-500/20 text-green-400",
    commenter: "bg-amber-500/20 text-amber-400",
    viewer: "bg-gray-500/20 text-gray-400",
  };

  const roles: UserRole[] = ["viewer", "commenter", "reviewer", "editor", "owner", "admin"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Users Management
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage user roles and permissions
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or role..."
            className="w-full pl-14 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white font-semibold">
                        {user.full_name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {user.full_name || "Unnamed User"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {user.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {editingUser?.id === user.id ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        onBlur={() => {
                          handleChangeRole(user.id, newRole);
                        }}
                        autoFocus
                        className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)]"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role as UserRole] || roleColors.viewer
                          }`}
                      >
                        {user.role === "admin" && <Shield className="w-3 h-3" />}
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-red-400">
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <Calendar className="w-4 h-4" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setNewRole(user.role as UserRole);
                        }}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        title="Edit Role"
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        title={user.is_active ? "Deactivate" : "Activate"}
                      >
                        {user.is_active ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No users found</p>
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="mt-6 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Role Descriptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="font-medium text-gray-400">Viewer:</span>
            <span className="text-[var(--text-muted)]"> Can only view documents</span>
          </div>
          <div>
            <span className="font-medium text-amber-400">Commenter:</span>
            <span className="text-[var(--text-muted)]"> Can view and comment</span>
          </div>
          <div>
            <span className="font-medium text-green-400">Reviewer:</span>
            <span className="text-[var(--text-muted)]"> Can review and make decisions</span>
          </div>
          <div>
            <span className="font-medium text-blue-400">Editor:</span>
            <span className="text-[var(--text-muted)]"> Can edit content</span>
          </div>
          <div>
            <span className="font-medium text-purple-400">Owner:</span>
            <span className="text-[var(--text-muted)]"> Full document access</span>
          </div>
          <div>
            <span className="font-medium text-red-400">Admin:</span>
            <span className="text-[var(--text-muted)]"> System administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
}
