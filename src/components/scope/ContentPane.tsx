"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    MessageSquare,
    ThumbsUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    MoreHorizontal,
    Edit,
    History,
    Share2,
    Flag,
    ChevronRight,
    Plus,
    Eye,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUIStore, useDocumentStore, useChatStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CommentsDialog } from "./CommentsDialog";
import { AddParagraphDialog } from "./AddParagraphDialog";
import { EditParagraphDialog } from "./EditParagraphDialog";
import { FlagDialog } from "./FlagDialog";
import { ShareDialog } from "./ShareDialog";

interface Paragraph {
    id: string;
    paragraph_id: string;
    content: string;
    order_index: number;
    status: string;
    metadata: any;
    created_at: string;
    updated_at: string;
    section?: {
        id: string;
        section_id: string;
        title: string;
    };
    comments_count?: number;
}

interface Section {
    id: string;
    section_id: string;
    title: string;
    level: number;
}

const statusConfig = {
    draft: { label: "Draft", color: "text-gray-400", bg: "bg-gray-500/20", icon: Eye },
    under_review: { label: "Under Review", color: "text-amber-400", bg: "bg-amber-500/20", icon: Clock },
    accepted: { label: "Accepted", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle },
    escalated: { label: "Escalated", color: "text-red-400", bg: "bg-red-500/20", icon: AlertTriangle },
};

function ParagraphCard({ paragraph, onAskAI, onViewComments, onEdit, onFlag, onShare }: {
    paragraph: Paragraph;
    onAskAI: (id: string) => void;
    onViewComments: (id: string, title: string) => void;
    onEdit: (paragraph: Paragraph) => void;
    onFlag: (id: string) => void;
    onShare: () => void;
}) {
    const [showActions, setShowActions] = useState(false);
    const status = statusConfig[paragraph.status as keyof typeof statusConfig] || statusConfig.draft;
    const StatusIcon = status.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card group hover:border-[var(--primary-500)]/30 transition-all"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-[var(--primary-400)] font-semibold">
                        {paragraph.paragraph_id}
                    </span>
                    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs", status.bg, status.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                    </div>
                </div>

                {/* Actions */}
                <div className={cn("flex items-center gap-1 transition-opacity", showActions ? "opacity-100" : "opacity-0")}>
                    <button
                        onClick={() => onAskAI(paragraph.id)}
                        className="p-1.5 hover:bg-[var(--primary-500)]/20 rounded-lg text-[var(--primary-400)] transition-colors"
                        title="Ask AI about this paragraph"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onEdit(paragraph)}
                        className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Edit paragraph"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)]">
                        <History className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-muted)]">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                    components={{
                        p: ({ children }) => <p className="text-[var(--text-secondary)] leading-relaxed mb-3">{children}</p>,
                        strong: ({ children }) => <strong className="text-[var(--text-primary)] font-semibold">{children}</strong>,
                        code: ({ children }) => (
                            <code className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--primary-400)] text-xs font-mono">
                                {children}
                            </code>
                        ),
                        pre: ({ children }) => (
                            <pre className="p-4 bg-[var(--bg-tertiary)] rounded-lg overflow-x-auto my-3 border border-[var(--border-subtle)]">
                                {children}
                            </pre>
                        ),
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">{children}</ol>,
                        li: ({ children }) => <li className="text-[var(--text-secondary)]">{children}</li>,
                    }}
                >
                    {paragraph.content}
                </ReactMarkdown>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <button
                        onClick={() => onViewComments(paragraph.id, paragraph.paragraph_id)}
                        className="flex items-center gap-1 hover:text-[var(--primary-400)] transition-colors"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {paragraph.comments_count || 0} comments
                    </button>
                    <span>
                        Updated {new Date(paragraph.updated_at).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onShare}
                        className="text-xs text-[var(--primary-400)] hover:text-[var(--primary-300)] flex items-center gap-1 transition-colors"
                    >
                        <Share2 className="w-3 h-3" />
                        Share
                    </button>
                    <button
                        onClick={() => onFlag(paragraph.id)}
                        className="text-xs text-[var(--text-muted)] hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                        <Flag className="w-3 h-3" />
                        Flag
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export function ContentPane() {
    const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
    const [currentSection, setCurrentSection] = useState<Section | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
    const [selectedParagraph, setSelectedParagraph] = useState<{ id: string; title: string } | null>(null);
    const [showAddParagraphDialog, setShowAddParagraphDialog] = useState(false);
    const [showEditParagraphDialog, setShowEditParagraphDialog] = useState(false);
    const [editingParagraph, setEditingParagraph] = useState<Paragraph | null>(null);
    const [showFlagDialog, setShowFlagDialog] = useState(false);
    const [flaggingParagraphId, setFlaggingParagraphId] = useState<string | null>(null);
    const [showShareDialog, setShowShareDialog] = useState(false);

    const { selectedSectionId, chatPanelOpen, toggleChatPanel } = useUIStore();
    const { currentDocument } = useDocumentStore();
    const { setContextParagraph } = useChatStore();
    const supabase = createClient();

    useEffect(() => {
        if (selectedSectionId) {
            fetchParagraphs();
            fetchSectionDetails();
        }
    }, [selectedSectionId]);

    const fetchSectionDetails = async () => {
        if (!selectedSectionId) return;

        const { data, error } = await supabase
            .from("sections")
            .select("id, section_id, title, level")
            .eq("id", selectedSectionId)
            .single();

        if (data) {
            setCurrentSection(data);
        }
    };

    const fetchParagraphs = async () => {
        if (!selectedSectionId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("paragraphs")
                .select(`
          id,
          paragraph_id,
          content,
          order_index,
          status,
          metadata,
          created_at,
          updated_at
        `)
                .eq("section_id", selectedSectionId)
                .order("order_index", { ascending: true });

            if (error) throw error;

            // Fetch comment counts
            const paragraphIds = data?.map((p) => p.id) || [];
            if (paragraphIds.length > 0) {
                const { data: comments } = await supabase
                    .from("comments")
                    .select("paragraph_id")
                    .in("paragraph_id", paragraphIds);

                const countMap = new Map<string, number>();
                comments?.forEach((c) => {
                    countMap.set(c.paragraph_id, (countMap.get(c.paragraph_id) || 0) + 1);
                });

                const enrichedParagraphs = data?.map((p) => ({
                    ...p,
                    comments_count: countMap.get(p.id) || 0,
                }));

                setParagraphs(enrichedParagraphs || []);
            } else {
                setParagraphs(data || []);
            }
        } catch (error) {
            console.error("Error fetching paragraphs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAskAI = (paragraphId: string) => {
        setContextParagraph(paragraphId);
        // Open chat panel if closed
        if (!chatPanelOpen) {
            toggleChatPanel();
        }
        // Focus the chat input after a brief delay to allow panel to open
        setTimeout(() => {
            const chatInput = document.querySelector("textarea[placeholder*='scope']");
            if (chatInput) {
                (chatInput as HTMLTextAreaElement).focus();
            }
        }, 100);
    };

    const handleViewComments = (paragraphId: string, paragraphTitle: string) => {
        setSelectedParagraph({ id: paragraphId, title: paragraphTitle });
        setCommentsDialogOpen(true);
    };

    const handleAddParagraph = () => {
        setShowAddParagraphDialog(true);
    };

    const handleEditParagraph = (paragraph: Paragraph) => {
        setEditingParagraph(paragraph);
        setShowEditParagraphDialog(true);
    };

    const handleFlagParagraph = (paragraphId: string) => {
        setFlaggingParagraphId(paragraphId);
        setShowFlagDialog(true);
    };

    const handleShareDocument = () => {
        setShowShareDialog(true);
    };

    if (!selectedSectionId) {
        return (
            <main className="flex-1 flex items-center justify-center p-6 bg-[var(--bg-primary)]">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <div className="text-xl font-semibold mb-2">Select a Section</div>
                    <p className="text-[var(--text-muted)]">
                        Choose a section from the sidebar to view its content
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-primary)]">
            {/* Breadcrumb & Section Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
                    <span>{currentDocument?.title || "Document"}</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[var(--primary-400)] font-medium">
                        {currentSection?.section_id}
                    </span>
                </div>

                {/* Title */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">
                            {currentSection?.title || "Section"}
                        </h1>
                        <p className="text-[var(--text-muted)]">
                            {paragraphs.length} paragraph{paragraphs.length !== 1 ? "s" : ""} in this section
                        </p>
                    </div>

                    <button
                        onClick={handleAddParagraph}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Paragraph
                    </button>
                </div>
            </motion.div>

            {/* Paragraphs */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)]"></div>
                </div>
            ) : paragraphs.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No paragraphs yet</h3>
                    <p className="text-[var(--text-muted)] mb-4">
                        This section is empty. Add content to get started.
                    </p>
                    <button
                        onClick={handleAddParagraph}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add First Paragraph
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {paragraphs.map((paragraph, index) => (
                        <motion.div
                            key={paragraph.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <ParagraphCard
                                paragraph={paragraph}
                                onAskAI={handleAskAI}
                                onViewComments={handleViewComments}
                                onEdit={handleEditParagraph}
                                onFlag={handleFlagParagraph}
                                onShare={handleShareDocument}
                            />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Bottom Spacer */}
            <div className="h-20" />

            {/* Comments Dialog */}
            {selectedParagraph && (
                <CommentsDialog
                    paragraphId={selectedParagraph.id}
                    paragraphTitle={selectedParagraph.title}
                    isOpen={commentsDialogOpen}
                    onClose={() => {
                        setCommentsDialogOpen(false);
                        setSelectedParagraph(null);
                        // Refresh comment counts
                        fetchParagraphs();
                    }}
                />
            )}

            {/* Add Paragraph Dialog */}
            {selectedSectionId && (
                <AddParagraphDialog
                    sectionId={selectedSectionId}
                    isOpen={showAddParagraphDialog}
                    onClose={() => setShowAddParagraphDialog(false)}
                    onSuccess={fetchParagraphs}
                />
            )}

            {/* Edit Paragraph Dialog */}
            <EditParagraphDialog
                paragraph={editingParagraph}
                isOpen={showEditParagraphDialog}
                onClose={() => {
                    setShowEditParagraphDialog(false);
                    setEditingParagraph(null);
                }}
                onSuccess={fetchParagraphs}
            />

            {/* Flag Dialog */}
            {flaggingParagraphId && currentDocument && (
                <FlagDialog
                    paragraphId={flaggingParagraphId}
                    documentId={currentDocument.id}
                    isOpen={showFlagDialog}
                    onClose={() => {
                        setShowFlagDialog(false);
                        setFlaggingParagraphId(null);
                        fetchParagraphs(); // Refresh to see status change
                    }}
                />
            )}

            {/* Share Dialog */}
            {currentDocument && (
                <ShareDialog
                    documentId={currentDocument.id}
                    documentTitle={currentDocument.title}
                    isOpen={showShareDialog}
                    onClose={() => setShowShareDialog(false)}
                />
            )}
        </main>
    );
}
