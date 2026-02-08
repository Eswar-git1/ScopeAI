"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Users,
  Trash2,
  Eye,
  Calendar,
  FileText,
  MoreVertical,
  FileSearch,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CollaboratorsDialog } from "./CollaboratorsDialog";
import { DocumentPreview } from "./DocumentPreview";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string;
    email: string;
  };
  collaborators_count?: number;
}

interface DocumentsManagementProps {
  onRefresh: () => void;
}

export function DocumentsManagement({ onRefresh }: DocumentsManagementProps) {
  const supabase = createClient();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Get documents with creator info
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select(`
          *,
          creator:profiles!documents_created_by_fkey(full_name, email)
        `)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (docsError) throw docsError;

      // Get collaborator counts for each document
      const docsWithCounts = await Promise.all(
        (docs || []).map(async (doc) => {
          const { count } = await supabase
            .from("document_permissions")
            .select("*", { count: "exact", head: true })
            .eq("document_id", doc.id);

          return {
            ...doc,
            collaborators_count: count || 0,
          };
        })
      );

      setDocuments(docsWithCounts as any);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", documentId);

      if (!error) {
        await loadDocuments();
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleViewDocument = (documentId: string) => {
    router.push(`/?document=${documentId}`);
  };

  const handleManageCollaborators = (document: Document) => {
    setSelectedDocument(document);
    setShowCollaborators(true);
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.creator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    review: "bg-amber-500/20 text-amber-400",
    approved: "bg-green-500/20 text-green-400",
    archived: "bg-red-500/20 text-red-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Documents Management
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage all documents and their collaborators
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title, description, or creator..."
            className="w-full pl-14 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDocuments.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--primary-500)]/30 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-[var(--primary-400)]" />
                  <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
                    {doc.title}
                  </h3>
                </div>
                {doc.description && (
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                    {doc.description}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || statusColors.draft
                  }`}
              >
                {doc.status}
              </span>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 mb-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(doc.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {doc.collaborators_count || 0} collaborators
              </div>
            </div>

            {/* Creator */}
            {doc.creator && (
              <div className="mb-3 pb-3 border-b border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)]">
                  Created by{" "}
                  <span className="text-[var(--text-primary)] font-medium">
                    {doc.creator.full_name}
                  </span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleViewDocument(doc.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                Open
              </button>
              <button
                onClick={() => setPreviewDocumentId(doc.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm"
                title="Preview Document"
              >
                <FileSearch className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => handleManageCollaborators(doc)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-primary)] rounded-lg transition-colors text-sm"
              >
                <Users className="w-4 h-4" />
                Collaborators
              </button>
              <button
                onClick={() => handleDeleteDocument(doc.id)}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-muted)]">
            {searchQuery ? "No documents found" : "No documents yet. Upload one to get started!"}
          </p>
        </div>
      )}

      {/* Collaborators Dialog */}
      {selectedDocument && (
        <CollaboratorsDialog
          isOpen={showCollaborators}
          onClose={() => {
            setShowCollaborators(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          onUpdate={() => {
            loadDocuments();
            onRefresh();
          }}
        />
      )}

      {/* Document Preview */}
      {previewDocumentId && (
        <DocumentPreview
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}
    </div>
  );
}
