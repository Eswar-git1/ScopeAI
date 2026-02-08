"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    X,
    FileText,
    MessageSquare,
    Hash,
    History,
    ArrowRight,
    Command,
} from "lucide-react";
import { useUIStore, useDocumentStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
    id: string;
    type: "section" | "paragraph" | "comment";
    title: string;
    snippet: string;
    section_id?: string;
    paragraph_id?: string;
}

export function SearchDialog() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const { searchOpen, setSearchOpen, setSelectedSection, setSelectedParagraph } = useUIStore();
    const { currentDocument } = useDocumentStore();
    const supabase = createClient();

    useEffect(() => {
        if (searchOpen) {
            inputRef.current?.focus();
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [searchOpen]);

    // Keyboard shortcut to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen(!searchOpen);
            }
            if (e.key === "Escape" && searchOpen) {
                setSearchOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [searchOpen]);

    // Search as user types
    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            if (query.trim().length >= 2) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const performSearch = async () => {
        if (!currentDocument) return;

        setLoading(true);
        try {
            // Search paragraphs
            const { data: paragraphs } = await supabase
                .from("paragraphs")
                .select(`
          id,
          paragraph_id,
          content,
          section:sections!inner (
            id,
            section_id,
            title
          )
        `)
                .textSearch("content", query)
                .limit(10);

            // Search sections
            const { data: sections } = await supabase
                .from("sections")
                .select("id, section_id, title")
                .ilike("title", `%${query}%`)
                .limit(5);

            const searchResults: SearchResult[] = [];

            // Add section results
            sections?.forEach((section) => {
                searchResults.push({
                    id: section.id,
                    type: "section",
                    title: section.title,
                    snippet: `Section ${section.section_id}`,
                    section_id: section.section_id,
                });
            });

            // Add paragraph results
            paragraphs?.forEach((para: any) => {
                searchResults.push({
                    id: para.id,
                    type: "paragraph",
                    title: para.paragraph_id,
                    snippet: para.content.slice(0, 100) + "...",
                    section_id: para.section?.section_id,
                    paragraph_id: para.paragraph_id,
                });
            });

            setResults(searchResults);
            setSelectedIndex(0);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (result: SearchResult) => {
        if (result.type === "section") {
            setSelectedSection(result.id);
        } else if (result.type === "paragraph") {
            // Navigate to the section containing this paragraph
            setSelectedParagraph(result.id);
        }
        setSearchOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "section":
                return <Hash className="w-4 h-4" />;
            case "paragraph":
                return <FileText className="w-4 h-4" />;
            case "comment":
                return <MessageSquare className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    if (!searchOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
                onClick={() => setSearchOpen(false)}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-[var(--border-subtle)]">
                        <Search className="w-5 h-5 text-[var(--text-muted)]" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search sections, paragraphs, comments..."
                            className="flex-1 bg-transparent border-none outline-none text-lg"
                            autoFocus
                        />
                        {loading && (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--primary-500)]" />
                        )}
                        <button
                            onClick={() => setSearchOpen(false)}
                            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Results */}
                    <div className="max-h-80 overflow-y-auto">
                        {query.length < 2 ? (
                            <div className="p-8 text-center">
                                <Search className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                                <p className="text-[var(--text-muted)]">Start typing to search</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                    Search across sections, paragraphs, and comments
                                </p>
                            </div>
                        ) : results.length === 0 && !loading ? (
                            <div className="p-8 text-center">
                                <p className="text-[var(--text-muted)]">No results found for "{query}"</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {results.map((result, index) => (
                                    <motion.button
                                        key={result.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={() => handleSelect(result)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                                            selectedIndex === index
                                                ? "bg-[var(--primary-500)]/20 border border-[var(--primary-500)]/30"
                                                : "hover:bg-[var(--bg-tertiary)]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            result.type === "section" && "bg-blue-500/20 text-blue-400",
                                            result.type === "paragraph" && "bg-purple-500/20 text-purple-400",
                                            result.type === "comment" && "bg-amber-500/20 text-amber-400"
                                        )}>
                                            {getTypeIcon(result.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{result.title}</span>
                                                {result.section_id && (
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        in {result.section_id}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[var(--text-muted)] truncate">
                                                {result.snippet}
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">↑↓</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">↵</kbd>
                                Select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">esc</kbd>
                                Close
                            </span>
                        </div>
                        <span className="flex items-center gap-1">
                            <Command className="w-3 h-3" />K to search
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
