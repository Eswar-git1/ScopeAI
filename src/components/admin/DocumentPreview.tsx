"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DocumentPreviewProps {
  documentId: string;
  onClose: () => void;
}

interface Section {
  section_id: string;
  title: string;
  level: number;
  order_index: number;
}

interface Paragraph {
  paragraph_id: string;
  content: string;
  order_index: number;
}

export function DocumentPreview({ documentId, onClose }: DocumentPreviewProps) {
  const supabase = createClient();
  const [sections, setSections] = useState<Section[]>([]);
  const [paragraphs, setParagraphs] = useState<Record<string, Paragraph[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*")
        .eq("document_id", documentId)
        .order("order_index");

      if (sectionsError) throw sectionsError;

      // Load all paragraphs
      const { data: paragraphsData, error: paragraphsError } = await supabase
        .from("paragraphs")
        .select("*")
        .eq("document_id", documentId)
        .order("order_index");

      if (paragraphsError) throw paragraphsError;

      // Group paragraphs by section
      const groupedParagraphs: Record<string, Paragraph[]> = {};
      paragraphsData?.forEach((para) => {
        if (!groupedParagraphs[para.section_id]) {
          groupedParagraphs[para.section_id] = [];
        }
        groupedParagraphs[para.section_id].push(para);
      });

      setSections(sectionsData || []);
      setParagraphs(groupedParagraphs);

      // Auto-expand first few sections
      if (sectionsData && sectionsData.length > 0) {
        setExpandedSections(new Set([
          sectionsData[0].section_id,
          sectionsData[1]?.section_id,
          sectionsData[2]?.section_id,
        ].filter(Boolean)));
      }
    } catch (error) {
      console.error("Error loading document:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.section_id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const filteredSections = sections.filter(section => {
    if (!searchQuery) return true;

    const matchesTitle = section.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesParagraphs = paragraphs[section.section_id]?.some(p =>
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return matchesTitle || matchesParagraphs;
  });

  const renderContent = (content: string) => {
    // Convert **text** to bold
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="text-purple-600 dark:text-purple-400 font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Document Preview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sections.length} sections • {Object.values(paragraphs).flat().length} paragraphs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-500">Loading document...</p>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No sections match your search</p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div
                key={section.section_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.section_id)}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  style={{
                    paddingLeft: `${(section.level - 1) * 1 + 1}rem`,
                  }}
                >
                  <ChevronRight
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedSections.has(section.section_id) ? "rotate-90" : ""
                    }`}
                  />
                  <h3
                    className="flex-1 text-left font-semibold text-gray-900 dark:text-white"
                    style={{
                      fontSize: section.level === 1 ? "1.125rem" : "1rem",
                    }}
                  >
                    {section.title}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {paragraphs[section.section_id]?.length || 0} paragraphs
                  </span>
                </button>

                {/* Section Paragraphs */}
                <AnimatePresence>
                  {expandedSections.has(section.section_id) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
                        {paragraphs[section.section_id]?.length > 0 ? (
                          paragraphs[section.section_id].map((para, idx) => (
                            <div
                              key={para.paragraph_id}
                              className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded">
                                  {idx + 1}
                                </span>
                                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {renderContent(para.content)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            No paragraphs in this section
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
