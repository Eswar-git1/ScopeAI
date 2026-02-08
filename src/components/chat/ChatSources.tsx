"use client";

import { motion } from "framer-motion";
import { ExternalLink, FileText } from "lucide-react";

interface ChatSourcesProps {
  sources: Array<{
    paragraph_id: string;
    section_id?: string;
    section_title: string;
    similarity?: number;
    preview: string;
  }>;
}

export function ChatSources({ sources }: ChatSourcesProps) {
  const handleJumpTo = (paragraphId: string) => {
    // Scroll to paragraph in document
    const element = document.getElementById(paragraphId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlight-flash");
      setTimeout(() => element.classList.remove("highlight-flash"), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50"
    >
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Sources ({sources.length})
      </h4>
      <div className="space-y-1.5">
        {sources.slice(0, 3).map((source, idx) => (
          <button
            key={idx}
            onClick={() => handleJumpTo(source.paragraph_id)}
            className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {source.section_title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                  {source.preview}
                </p>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
