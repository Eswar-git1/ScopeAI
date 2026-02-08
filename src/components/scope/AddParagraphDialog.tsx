"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";

interface AddParagraphDialogProps {
    sectionId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddParagraphDialog({ sectionId, isOpen, onClose, onSuccess }: AddParagraphDialogProps) {
    const [content, setContent] = useState("");
    const [paragraphId, setParagraphId] = useState("");
    const [status, setStatus] = useState("draft");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuthStore();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !paragraphId.trim() || !user) return;

        setSubmitting(true);
        setError(null);

        try {
            // Get the highest order_index in this section
            const { data: existing } = await supabase
                .from("paragraphs")
                .select("order_index")
                .eq("section_id", sectionId)
                .order("order_index", { ascending: false })
                .limit(1);

            const nextOrderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

            // Create the paragraph
            const { data, error: insertError } = await supabase
                .from("paragraphs")
                .insert({
                    section_id: sectionId,
                    paragraph_id: paragraphId,
                    content: content,
                    order_index: nextOrderIndex,
                    status: status,
                    created_by: user.id,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Reset form
            setContent("");
            setParagraphId("");
            setStatus("draft");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error creating paragraph:", err);
            setError(err.message || "Failed to create paragraph");
        } finally {
            setSubmitting(false);
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
                    className="w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[var(--primary-400)]" />
                                Add New Paragraph
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                Create a new content paragraph in this section
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

                        {/* Paragraph ID */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Paragraph ID <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={paragraphId}
                                onChange={(e) => setParagraphId(e.target.value)}
                                placeholder="e.g., P-1, P-2, 1.1, etc."
                                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                                required
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                A unique identifier for this paragraph within the section
                            </p>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Content <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter paragraph content... (supports Markdown)"
                                rows={8}
                                className="w-full resize-none px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
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
                                disabled={submitting || !content.trim() || !paragraphId.trim()}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Paragraph
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
