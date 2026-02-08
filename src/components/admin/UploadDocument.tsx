"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";

interface UploadDocumentProps {
  onSuccess: () => void;
}

type ParseStep = "idle" | "uploading" | "parsing" | "sections" | "paragraphs" | "embeddings" | "complete" | "error";

export function UploadDocument({ onSuccess }: UploadDocumentProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parseStep, setParseStep] = useState<ParseStep>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "text/plain",
        "text/markdown",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!validTypes.includes(selectedFile.type) &&
          !selectedFile.name.endsWith(".md") &&
          !selectedFile.name.endsWith(".txt")) {
        setError("Invalid file type. Please upload PDF, DOCX, TXT, or MD files.");
        return;
      }

      // Validate file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File too large. Maximum size is 50MB.");
        return;
      }

      setFile(selectedFile);
      setError("");
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const parseDocument = async (text: string) => {
    // Split by lines first to process line by line
    const lines = text.split("\n");

    const sections: Array<{
      section_id: string;
      title: string;
      level: number;
      paragraphs: Array<{ paragraph_id: string; content: string }>;
    }> = [];

    let currentSection: any = null;
    let currentParagraph: string[] = [];
    let sectionCounter = 1;
    let paragraphCounter = 1;

    const flushParagraph = () => {
      if (currentParagraph.length > 0 && currentSection) {
        const content = currentParagraph.join(" ").trim();
        if (content.length > 10) {
          currentSection.paragraphs.push({
            paragraph_id: `PARA-${paragraphCounter.toString().padStart(4, "0")}`,
            content: content,
          });
          paragraphCounter++;
        }
        currentParagraph = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        flushParagraph();
        continue;
      }

      // Check for MAIN SECTION headers (## followed by number)
      // Examples: ## 1. Objective, ## 2. Core Problem, ## PART I
      const mainSectionMatch = line.match(/^##\s+(\d+\.|PART\s+[IVX]+)\s+(.+)$/);
      if (mainSectionMatch) {
        flushParagraph();
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          section_id: `SEC-${sectionCounter.toString().padStart(3, "0")}`,
          title: line.replace(/^##\s+/, ""),
          level: 2,
          paragraphs: [],
        };
        sectionCounter++;
        continue;
      }

      // Check for TITLE headers (single #)
      const titleMatch = line.match(/^#\s+(.+)$/);
      if (titleMatch) {
        flushParagraph();
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          section_id: `SEC-${sectionCounter.toString().padStart(3, "0")}`,
          title: titleMatch[1],
          level: 1,
          paragraphs: [],
        };
        sectionCounter++;
        continue;
      }

      // Check for SUBSECTION headers (### or ####)
      // These become PARAGRAPHS with subheadings, NOT sections
      const subSectionMatch = line.match(/^(###|####)\s+(.+)$/);
      if (subSectionMatch) {
        flushParagraph();

        // Subsection header becomes the START of a new paragraph
        // Add the subheading as bold text
        const subheading = subSectionMatch[2];
        currentParagraph.push(`**${subheading}**`);
        continue;
      }

      // Regular content line
      if (!currentSection) {
        // Create default section if none exists
        currentSection = {
          section_id: `SEC-${sectionCounter.toString().padStart(3, "0")}`,
          title: "Document Content",
          level: 1,
          paragraphs: [],
        };
        sectionCounter++;
      }

      currentParagraph.push(line);
    }

    // Flush any remaining paragraph
    flushParagraph();

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    // Ensure we have at least one section
    if (sections.length === 0 && text.trim().length > 0) {
      sections.push({
        section_id: "SEC-001",
        title: "Document Content",
        level: 1,
        paragraphs: [{
          paragraph_id: "PARA-0001",
          content: text.trim(),
        }],
      });
    }

    return sections;
  };

  const handleUpload = async () => {
    if (!file || !title || !user?.id) {
      setError("Please provide a title and select a file");
      return;
    }

    try {
      setParseStep("uploading");
      setProgress(10);

      // Read file content based on file type
      let text = "";
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".docx")) {
        // Handle DOCX files using API endpoint
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-docx", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to parse DOCX file");
        }

        const data = await response.json();
        text = data.text;
      } else {
        // Handle plain text files (TXT, MD)
        text = await file.text();
      }

      setProgress(30);

      // Create document
      setParseStep("parsing");
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          title,
          description: description || null,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;
      setProgress(40);

      // Create document version
      const { data: version, error: versionError } = await supabase
        .from("document_versions")
        .insert({
          document_id: document.id,
          version_number: "1.0.0",
          content_hash: "",
          is_major_version: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Update document with current version
      await supabase
        .from("documents")
        .update({ current_version_id: version.id })
        .eq("id", document.id);

      setProgress(50);

      // Parse document into sections and paragraphs
      setParseStep("sections");
      const sections = await parseDocument(text);
      setProgress(60);

      // Insert sections and paragraphs
      setParseStep("paragraphs");
      const allParagraphs: Array<{ id: string; content: string; sectionTitle: string }> = [];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        // Insert section
        const { data: sectionData, error: sectionError } = await supabase
          .from("sections")
          .insert({
            document_version_id: version.id,
            section_id: section.section_id,
            title: section.title,
            level: section.level,
            order_index: i,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert paragraphs
        for (let j = 0; j < section.paragraphs.length; j++) {
          const para = section.paragraphs[j];

          const { data: paraData, error: paraError } = await supabase
            .from("paragraphs")
            .insert({
              section_id: sectionData.id,
              paragraph_id: para.paragraph_id,
              content: para.content,
              order_index: j,
              status: "draft",
              created_by: user.id,
            })
            .select()
            .single();

          if (!paraError && paraData) {
            allParagraphs.push({
              id: paraData.id,
              content: para.content,
              sectionTitle: section.title,
            });
          }
        }

        setProgress(60 + (i / sections.length) * 25);
      }

      // Generate embeddings
      setParseStep("embeddings");
      setProgress(90);

      // Generate embeddings for each paragraph
      for (let i = 0; i < allParagraphs.length; i++) {
        const para = allParagraphs[i];
        try {
          await fetch("/api/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paragraphId: para.id,
              text: para.content,
              sectionContext: para.sectionTitle,
            }),
          });
        } catch (embErr) {
          console.error("Error generating embedding for paragraph:", para.id, embErr);
          // Continue with other paragraphs even if one fails
        }
        setProgress(90 + (i / allParagraphs.length) * 10);
      }

      setProgress(100);
      setParseStep("complete");

      // Reset form after success
      setTimeout(() => {
        setTitle("");
        setDescription("");
        setFile(null);
        setParseStep("idle");
        setProgress(0);
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload document");
      setParseStep("error");
    }
  };

  const stepLabels: Record<ParseStep, string> = {
    idle: "Ready to upload",
    uploading: "Uploading file...",
    parsing: "Creating document...",
    sections: "Detecting sections...",
    paragraphs: "Extracting paragraphs...",
    embeddings: "Generating embeddings...",
    complete: "Upload complete!",
    error: "Upload failed",
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Upload Document
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Upload a document to create a new project. Supported formats: PDF, DOCX, TXT, MD
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Document Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Project Requirements Document"
            className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-[var(--text-primary)]"
            disabled={parseStep !== "idle"}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the document..."
            rows={3}
            className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-[var(--text-primary)] resize-none"
            disabled={parseStep !== "idle"}
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Document File <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-lg p-8 text-center hover:border-[var(--primary-500)]/50 transition-colors">
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-[var(--primary-400)]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {parseStep === "idle" && (
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-sm text-[var(--text-primary)] mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Supported: PDF, DOCX, TXT, MD (Max 50MB)
                </p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  id="file-upload"
                  disabled={parseStep !== "idle"}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block mt-3 px-4 py-2 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white rounded-lg cursor-pointer transition-colors text-sm"
                >
                  Select File
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {parseStep !== "idle" && parseStep !== "error" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-primary)]">
                {stepLabels[parseStep]}
              </span>
              <span className="text-[var(--text-muted)]">{progress}%</span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)]"
              />
            </div>
            {parseStep === "complete" && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Document uploaded successfully!</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setTitle("");
              setDescription("");
              setFile(null);
              setError("");
            }}
            disabled={parseStep !== "idle" && parseStep !== "error"}
            className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-primary)] rounded-lg transition-colors disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !title || (parseStep !== "idle" && parseStep !== "error")}
            className="flex-1 px-4 py-2 bg-[var(--primary-500)] hover:bg-[var(--primary-600)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {parseStep !== "idle" && parseStep !== "error" && parseStep !== "complete" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">How it works</h3>
        <ul className="text-xs text-blue-300/70 space-y-1">
          <li>• Documents are automatically parsed into sections and paragraphs</li>
          <li>• Section headers are detected from # markers or numbered headings</li>
          <li>• Paragraphs are split by empty lines</li>
          <li>• You can assign collaborators after upload</li>
          <li>• Embeddings are generated for AI-powered search</li>
        </ul>
      </div>
    </div>
  );
}
