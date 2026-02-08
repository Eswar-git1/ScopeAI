"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, FolderPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, useDocumentStore } from "@/store";

interface AddSectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddSectionDialog({ isOpen, onClose, onSuccess }: AddSectionDialogProps) {
    const [title, setTitle] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [parentSectionId, setParentSectionId] = useState<string>("");
    const [level, setLevel] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuthStore();
    const { currentDocument } = useDocumentStore();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !sectionId.trim() || !user || !currentDocument?.current_version_id) return;

        setSubmitting(true);
        setError(null);

        try {
            // Get the highest order_index
            const { data: existing } = await supabase
                .from("sections")
                .select("order_index")
                .eq("document_version_id", currentDocument.current_version_id)
                .order("order_index", { ascending: false })
                .limit(1);

            const nextOrderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

            // Create the section
            const { data, error: insertError } = await supabase
                .from("sections")
                .insert({
                    document_version_id: currentDocument.current_version_id,
                    section_id: sectionId,
                    title: title,
                    parent_section_id: parentSectionId || null,
                    level: level,
                    order_index: nextOrderIndex,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Reset form
            setTitle("");
            setSectionId("");
            setParentSectionId("");
            setLevel(1);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error creating section:", err);
            setError(err.message || "Failed to create section. Make sure you have the required permissions.");
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
                    className="w-full max-w-lg bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-[var(--primary-400)]" />
                                Add New Section
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                Create a new section in the document
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

                        {/* Section ID */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Section ID <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={sectionId}
                                onChange={(e) => setSectionId(e.target.value)}
                                placeholder="e.g., SEC-1, SEC-2, 1.0, 2.0, etc."
                                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                                required
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                A unique identifier for this section
                            </p>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Section Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Introduction, Technical Architecture, etc."
                                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                                required
                            />
                        </div>

                        {/* Level */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Level</label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                            >
                                <option value={1}>1 (Top Level)</option>
                                <option value={2}>2 (Sub-section)</option>
                                <option value={3}>3 (Sub-sub-section)</option>
                                <option value={4}>4 (Detailed section)</option>
                            </select>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                The hierarchical level of this section
                            </p>
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
                                disabled={submitting || !title.trim() || !sectionId.trim()}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Section
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
