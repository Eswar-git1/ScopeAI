"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Search,
  UserPlus,
  Crown,
  Shield,
  User,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import type { DiscussionRoom, DiscussionRoomMember, User as UserType } from "@/types";

interface ManageMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  room: DiscussionRoom | null;
  members: DiscussionRoomMember[];
  onUpdate: () => void;
}

export function ManageMembersDialog({
  isOpen,
  onClose,
  room,
  members,
  onUpdate,
}: ManageMembersDialogProps) {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const currentUserMember = members.find((m) => m.user_id === user?.id);
  const canManageMembers =
    currentUserMember?.role === "admin" ||
    currentUserMember?.role === "moderator" ||
    profile?.role === "admin";

  useEffect(() => {
    if (isOpen && room) {
      loadAllUsers();
    }
  }, [isOpen, room?.id]);

  const loadAllUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role")
      .eq("is_active", true)
      .order("full_name");

    if (!error && data) {
      setAllUsers(data as any);
    }
    setLoading(false);
  };

  const handleAddMember = async (userId: string) => {
    if (!room?.id || !canManageMembers) return;

    setAddingUser(true);
    try {
      const { error } = await supabase.from("discussion_room_members").insert({
        room_id: room.id,
        user_id: userId,
        role: "member",
      });

      if (!error) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error adding member:", err);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!canManageMembers) return;

    // Can't remove yourself if you're the last admin
    const adminCount = members.filter((m) => m.role === "admin").length;
    if (memberUserId === user?.id && adminCount === 1) {
      alert("You're the last admin. Promote someone else first.");
      return;
    }

    const { error } = await supabase
      .from("discussion_room_members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      onUpdate();
    }
  };

  const handleChangeRole = async (
    memberId: string,
    newRole: "member" | "moderator" | "admin"
  ) => {
    if (!canManageMembers) return;

    const { error } = await supabase
      .from("discussion_room_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (!error) {
      onUpdate();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "moderator":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "moderator":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.user_id === u.id)
  );

  const filteredAvailableUsers = availableUsers.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen || !room) return null;

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
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Manage Members
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {room.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Current Members */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({members.length})
              </h3>

              {filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No members found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getRoleIcon(member.role)}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.user?.full_name || "Unknown"}
                            {member.user_id === user?.id && (
                              <span className="text-xs text-gray-500 ml-2">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.user?.email}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {member.role}
                        </span>
                      </div>

                      {canManageMembers && member.user_id !== user?.id && (
                        <div className="flex items-center gap-2 ml-3">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleChangeRole(
                                member.id,
                                e.target.value as any
                              )
                            }
                            className="text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() =>
                              handleRemoveMember(member.id, member.user_id)
                            }
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Members */}
            {canManageMembers && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Members
                </h3>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : filteredAvailableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {availableUsers.length === 0
                      ? "All users are already members"
                      : "No users found"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableUsers.map((availableUser) => (
                      <div
                        key={availableUser.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {availableUser.full_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {availableUser.email}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddMember(availableUser.id)}
                          disabled={addingUser}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
