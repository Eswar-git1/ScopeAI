"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Send,
    Sparkles,
    X,
    ThumbsUp,
    ThumbsDown,
    Copy,
    Loader2,
    BookOpen,
    Zap,
    ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUIStore, useChatStore, useDocumentStore, useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

interface Citation {
    paragraph_id: string;
    section_title: string;
    content_snippet: string;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
    model_used?: string;
    latency_ms?: number;
    feedback?: "thumbs_up" | "thumbs_down" | null;
    created_at: string;
}

const suggestedQuestions = [
    "What are the main objectives of this project?",
    "Explain the system architecture",
    "What security requirements are defined?",
    "Summarize the key deliverables",
];

export function ChatPanel() {
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { chatPanelOpen, toggleChatPanel } = useUIStore();
    const { contextParagraphId, setContextParagraph } = useChatStore();
    const { currentDocument } = useDocumentStore();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    }, [inputValue]);

    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const { user } = useAuthStore();

    const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
        console.log('🚀 HANDLE SUBMIT CALLED');
        e?.preventDefault();
        const query = customQuery || inputValue;
        if (!query.trim() || isLoading) return;
        if (!user || !currentDocument) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: query,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);
        setError(null);

        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, initialAssistantMessage]);

        try {
            console.log('📡 Fetching /api/chat...');
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: query,
                    documentId: currentDocument.id,
                    userId: user.id,
                    sessionId,
                }),
            });

            console.log('✅ Response received:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to get response");
            }

            // Parse JSON response (non-streaming)
            const data = await response.json();
            console.log('📦 Data received:', data);

            // Update session ID
            if (data.sessionId) {
                setSessionId(data.sessionId);
            }

            // Update message with content and citations
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: data.content,
                            citations: data.sources?.map((s: any) => ({
                                paragraph_id: s.paragraph_id,
                                section_title: s.section_title,
                                content_snippet: s.preview,
                            })),
                        }
                        : msg
                )
            );

            console.log('✅ Message updated successfully');
            setContextParagraph(null);
        } catch (err: any) {
            console.error("Chat error:", err);
            setError(err.message || "An error occurred");

            const errorMessage: ChatMessage = {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: `I apologize, but I encountered an error: ${err.message}. Please try again.`,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeedback = async (messageId: string, feedback: "thumbs_up" | "thumbs_down") => {
        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
        );
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!chatPanelOpen) {
        return (
            <button
                onClick={toggleChatPanel}
                className="fixed right-4 bottom-4 p-4 bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] rounded-full shadow-lg shadow-[var(--primary-500)]/30 hover:shadow-[var(--primary-500)]/50 transition-all z-50"
            >
                <Sparkles className="w-6 h-6 text-white" />
            </button>
        );
    }

    return (
        <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? "100%" : 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "h-full border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col",
                isMobile && "fixed inset-0 z-50 border-l-0"
            )}
        >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="font-semibold text-lg">AI Assistant</div>
                        <p className="text-xs text-[var(--text-muted)]">Hybrid RAG • Zero Hallucination</p>
                    </div>
                </div>
                <button
                    onClick={toggleChatPanel}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Context Indicator */}
            {contextParagraphId && (
                <div className="mx-4 mt-3 p-2 bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[var(--primary-400)]">
                        <BookOpen className="w-4 h-4" />
                        <span>Focused on paragraph context</span>
                    </div>
                    <button
                        onClick={() => setContextParagraph(null)}
                        className="p-1 hover:bg-[var(--primary-500)]/20 rounded"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--primary-700)]/20 flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-[var(--primary-400)]" />
                        </div>
                        <h3 className="font-semibold mb-2">Ask about the document</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs">
                            Get answers with source citations using hybrid search combining vector + keyword matching.
                        </p>

                        {/* Suggested Questions */}
                        <div className="space-y-2 w-full">
                            {suggestedQuestions.map((question, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSubmit(undefined, question)}
                                    className="w-full text-left p-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 rounded-xl text-sm transition-all border border-[var(--border-subtle)] group flex items-center gap-3"
                                >
                                    <div className="p-1.5 rounded-lg bg-[var(--primary-500)]/10 text-[var(--primary-400)] group-hover:bg-[var(--primary-500)]/20 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[var(--text-primary)]">{question}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex",
                                    message.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[90%] rounded-2xl p-4",
                                        message.role === "user"
                                            ? "bg-[var(--primary-600)] text-white rounded-br-md"
                                            : "bg-[var(--bg-tertiary)] rounded-bl-md"
                                    )}
                                >
                                    {message.role === "assistant" ? (
                                        <>
                                            <div className="prose prose-invert prose-sm max-w-none">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                        strong: ({ children }) => <strong className="text-[var(--primary-400)]">{children}</strong>,
                                                        code: ({ children }) => (
                                                            <code className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--primary-400)] text-xs font-mono">
                                                                {children}
                                                            </code>
                                                        ),
                                                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                                                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Citations */}
                                            {message.citations && message.citations.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                                    <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-1">
                                                        <BookOpen className="w-3 h-3" />
                                                        Sources
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {message.citations.map((citation, i) => (
                                                            <button
                                                                key={i}
                                                                className="px-2 py-1 text-xs bg-[var(--primary-500)]/20 text-[var(--primary-400)] rounded-md hover:bg-[var(--primary-500)]/30 transition-colors"
                                                                title={citation.content_snippet}
                                                            >
                                                                {citation.section_title}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Message Footer */}
                                            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        Hybrid Search
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => copyToClipboard(message.content)}
                                                        className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                                                        title="Copy"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(message.id, "thumbs_up")}
                                                        className={cn(
                                                            "p-1 hover:bg-[var(--bg-secondary)] rounded",
                                                            message.feedback === "thumbs_up" && "text-emerald-400"
                                                        )}
                                                    >
                                                        <ThumbsUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(message.id, "thumbs_down")}
                                                        className={cn(
                                                            "p-1 hover:bg-[var(--bg-secondary)] rounded",
                                                            message.feedback === "thumbs_down" && "text-red-400"
                                                        )}
                                                    >
                                                        <ThumbsDown className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p>{message.content}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                            >
                                <div className="bg-[var(--bg-tertiary)] rounded-2xl rounded-bl-md p-4 flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-[var(--primary-400)]" />
                                    <span className="text-sm text-[var(--text-muted)]">Searching document...</span>
                                </div>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--border-subtle)]">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about the document..."
                        rows={1}
                        className="w-full resize-none bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/50 focus:border-[var(--primary-500)] transition-all"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                            inputValue.trim() && !isLoading
                                ? "bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)]"
                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
                <p className="text-xs text-center text-[var(--text-muted)] mt-2">
                    Answers with citations • Vector + Keyword search
                </p>
            </div>
        </motion.aside>
    );
}
