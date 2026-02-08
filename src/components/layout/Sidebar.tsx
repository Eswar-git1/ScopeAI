"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronDown,
    FileText,
    FolderOpen,
    Folder,
    Plus,
    Search,
    BookOpen,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye,
} from "lucide-react";
import { useUIStore, useDocumentStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AddSectionDialog } from "../scope/AddSectionDialog";

interface Section {
    id: string;
    section_id: string;
    title: string;
    level: number;
    order_index: number;
    parent_section_id: string | null;
    children?: Section[];
    paragraphs_count?: number;
}

export function Sidebar() {
    const [sections, setSections] = useState<Section[]>([]);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);

    const { sidebarCollapsed, toggleSidebar, selectedSectionId, setSelectedSection } = useUIStore();
    const { currentDocument } = useDocumentStore();
    const supabase = createClient();

    useEffect(() => {
        fetchSections();
    }, [currentDocument]);

    const fetchSections = async () => {
        if (!currentDocument?.current_version_id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("sections")
                .select(`
          id,
          section_id,
          title,
          level,
          order_index,
          parent_section_id
        `)
                .eq("document_version_id", currentDocument.current_version_id)
                .order("order_index", { ascending: true });

            if (error) throw error;

            // Build tree structure
            const sectionMap = new Map<string, Section>();
            const rootSections: Section[] = [];

            data?.forEach((section) => {
                sectionMap.set(section.id, { ...section, children: [] });
            });

            data?.forEach((section) => {
                const sectionWithChildren = sectionMap.get(section.id)!;
                if (section.parent_section_id) {
                    const parent = sectionMap.get(section.parent_section_id);
                    if (parent) {
                        parent.children?.push(sectionWithChildren);
                    }
                } else {
                    rootSections.push(sectionWithChildren);
                }
            });

            setSections(rootSections);

            // Expand first section by default
            if (rootSections.length > 0) {
                setExpandedSections(new Set([rootSections[0].id]));
            }
        } catch (error) {
            console.error("Error fetching sections:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    // Filter sections based on search query
    const filterSections = (sections: Section[], query: string): Section[] => {
        if (!query.trim()) return sections;

        const lowerQuery = query.toLowerCase();

        return sections.reduce((filtered: Section[], section) => {
            const matchesTitle = section.title.toLowerCase().includes(lowerQuery);
            const matchesId = section.section_id.toLowerCase().includes(lowerQuery);
            const filteredChildren = section.children ? filterSections(section.children, query) : [];

            if (matchesTitle || matchesId || filteredChildren.length > 0) {
                filtered.push({
                    ...section,
                    children: filteredChildren,
                });

                // Auto-expand matching sections
                if (filteredChildren.length > 0) {
                    setExpandedSections((prev) => new Set(prev).add(section.id));
                }
            }

            return filtered;
        }, []);
    };

    const filteredSections = filterSections(sections, searchQuery);

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case "accepted":
                return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
            case "under_review":
                return <Clock className="w-3 h-3 text-amber-400" />;
            case "escalated":
                return <AlertCircle className="w-3 h-3 text-red-400" />;
            default:
                return <Eye className="w-3 h-3 text-[var(--text-muted)]" />;
        }
    };

    const renderSection = (section: Section, depth: number = 0) => {
        const isExpanded = expandedSections.has(section.id);
        const isSelected = selectedSectionId === section.id;
        const hasChildren = section.children && section.children.length > 0;

        return (
            <div key={section.id}>
                <motion.div
                    initial={false}
                    animate={{ backgroundColor: isSelected ? "var(--bg-tertiary)" : "transparent" }}
                    className={cn(
                        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-[var(--bg-tertiary)]",
                        isSelected && "bg-[var(--bg-tertiary)] border-l-2 border-[var(--primary-500)]"
                    )}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    onClick={() => {
                        setSelectedSection(section.id);
                        if (hasChildren) {
                            toggleSection(section.id);
                        }
                    }}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(section.id);
                            }}
                            className="p-0.5 hover:bg-[var(--bg-secondary)] rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}

                    {hasChildren ? (
                        isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-[var(--primary-400)]" />
                        ) : (
                            <Folder className="w-4 h-4 text-[var(--text-muted)]" />
                        )
                    ) : (
                        <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[var(--primary-400)]">
                                {section.section_id}
                            </span>
                        </div>
                        <p className="text-sm truncate">{section.title}</p>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {section.children?.map((child) => renderSection(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (sidebarCollapsed) {
        return (
            <motion.aside
                initial={{ width: 280 }}
                animate={{ width: 60 }}
                className="h-full border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col"
            >
                <div className="p-3 flex flex-col items-center gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg"
                    >
                        <BookOpen className="w-5 h-5" />
                    </button>
                </div>
            </motion.aside>
        );
    }

    return (
        <motion.aside
            initial={{ width: 60 }}
            animate={{ width: 280 }}
            className="h-full border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-lg">Document Navigator</div>
                    <button
                        onClick={toggleSidebar}
                        className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search sections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50"
                        style={{ paddingLeft: "2.5rem" }}
                    />
                </div>
            </div>

            {/* Section Tree */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-500)]"></div>
                    </div>
                ) : sections.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No sections found</p>
                        <p className="text-xs mt-1">Add seed data to get started</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredSections.length > 0 ? (
                            filteredSections.map((section) => renderSection(section))
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No sections found</p>
                                <p className="text-xs mt-1">Try a different search term</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Section Button */}
            <div className="p-3 border-t border-[var(--border-subtle)]">
                <button
                    onClick={() => setShowAddSectionDialog(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Section
                </button>
            </div>

            {/* Add Section Dialog */}
            <AddSectionDialog
                isOpen={showAddSectionDialog}
                onClose={() => setShowAddSectionDialog(false)}
                onSuccess={fetchSections}
            />
        </motion.aside>
    );
}
