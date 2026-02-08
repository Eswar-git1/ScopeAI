"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";

interface FlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  paragraphId: string;
  documentId: string;
}

type FlagReason = "technical_issue" | "compliance" | "clarity" | "scope_creep" | "other";

export function FlagDialog({ isOpen, onClose, paragraphId, documentId }: FlagDialogProps) {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const [reason, setReason] = useState<FlagReason>("technical_issue");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const flagReasons: { value: FlagReason; label: string; description: string }[] = [
    {
      value: "technical_issue",
      label: "Technical Issue",
      description: "Technical accuracy or feasibility concerns",
    },
    {
      value: "compliance",
      label: "Compliance",
      description: "Legal, regulatory, or policy compliance issues",
    },
    {
      value: "clarity",
      label: "Clarity Issue",
      description: "Unclear, ambiguous, or confusing content",
    },
    {
      value: "scope_creep",
      label: "Scope Creep",
      description: "Content exceeds agreed project scope",
    },
    {
      value: "other",
      label: "Other",
      description: "Other concerns requiring review",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !description.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Create flag as a special comment type
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert({
          paragraph_id: paragraphId,
          author_id: user.id,
          comment_type: "objection",
          content: `🚩 FLAGGED: ${reason.replace("_", " ").toUpperCase()}\n\n${description}`,
          status: "escalated",
          priority: priority,
          tags: ["flagged", reason],
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Update paragraph status to escalated
      await supabase
        .from("paragraphs")
        .update({ status: "escalated" })
        .eq("id", paragraphId);

      // Create notification for document owner and admins
      const { data: doc } = await supabase
        .from("documents")
        .select("created_by")
        .eq("id", documentId)
        .single();

      if (doc?.created_by) {
        await supabase.from("notifications").insert({
          user_id: doc.created_by,
          notification_type: "escalation",
          title: "Content Flagged for Review",
          content: `${profile?.full_name || "Someone"} flagged a paragraph: ${reason.replace("_", " ")}`,
          link: `/documents/${documentId}?paragraph=${paragraphId}`,
        });
      }

      // Notify all admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .neq("id", user.id);

      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
          admins.map((admin) => ({
            user_id: admin.id,
            notification_type: "escalation",
            title: "Content Flagged for Review",
            content: `${profile?.full_name || "A user"} flagged content for ${reason.replace("_", " ")}`,
            link: `/documents/${documentId}?paragraph=${paragraphId}`,
          }))
        );
      }

      // Reset form and close
      setDescription("");
      setReason("technical_issue");
      setPriority("medium");
      onClose();
    } catch (err: any) {
      console.error("Error flagging content:", err);
      setError(err.message || "Failed to flag content");
    } finally {
      setLoading(false);
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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-w-lg w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Flag className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Flag Content for Review
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Report concerns to document owners and admins
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Alert */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  This will escalate the paragraph for review
                </p>
                <p className="text-amber-600/70 dark:text-amber-400/70 text-xs mt-1">
                  Document owner and admins will be notified immediately
                </p>
              </div>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Reason for Flag <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {flagReasons.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      reason === option.value
                        ? "border-red-500 bg-red-500/5"
                        : "border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/80 hover:bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={(e) => setReason(e.target.value as FlagReason)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-[var(--text-primary)]">
                        {option.label}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-[var(--text-primary)]"
              >
                <option value="low">Low - Minor issue</option>
                <option value="medium">Medium - Needs attention</option>
                <option value="high">High - Important issue</option>
                <option value="critical">Critical - Blocking issue</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                required
                maxLength={1000}
                disabled={loading}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-[var(--text-primary)] resize-none"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {description.length}/1000 characters
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)]/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Flagging...
                  </span>
                ) : (
                  "Flag for Review"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
