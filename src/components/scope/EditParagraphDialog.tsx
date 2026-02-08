"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";

interface EditParagraphDialogProps {
    paragraph: {
        id: string;
        paragraph_id: string;
        content: string;
        status: string;
    } | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditParagraphDialog({ paragraph, isOpen, onClose, onSuccess }: EditParagraphDialogProps) {
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("draft");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuthStore();
    const supabase = createClient();

    useEffect(() => {
        if (paragraph && isOpen) {
            setContent(paragraph.content);
            setStatus(paragraph.status);
        }
    }, [paragraph, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user || !paragraph) return;

        setSubmitting(true);
        setError(null);

        try {
            // Update the paragraph
            const { error: updateError } = await supabase
                .from("paragraphs")
                .update({
                    content: content,
                    status: status,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", paragraph.id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error updating paragraph:", err);
            setError(err.message || "Failed to update paragraph. Make sure you have the required permissions.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !paragraph) return null;

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
                    className="w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold flex items-center gap-2">
                                <Save className="w-5 h-5 text-[var(--primary-400)]" />
                                Edit Paragraph
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                {paragraph.paragraph_id}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Content <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter paragraph content... (supports Markdown)"
                                rows={12}
                                className="w-full resize-none px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50 font-mono text-sm"
                                required
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Markdown formatting is supported (bold, italic, lists, code, etc.)
                            </p>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                            >
                                <option value="draft">Draft</option>
                                <option value="under_review">Under Review</option>
                                <option value="accepted">Accepted</option>
                                <option value="escalated">Escalated</option>
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary flex-1"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                                disabled={submitting || !content.trim()}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
