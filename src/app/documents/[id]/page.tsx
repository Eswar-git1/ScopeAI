"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { FloatingChatPanel } from "@/components/chat/FloatingChatPanel";
import { TestChatButton } from "@/components/chat/TestChatButton";

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [document, setDocument] = useState<any>(null);
    const supabase = createClient();

    // Ensure we have the ID from params
    const id = params?.id as string;

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);
            fetchDocument(id);
        };

        if (id) {
            checkAuth();
        }
    }, [id, router, setUser]);

    const fetchDocument = async (docId: string) => {
        try {
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("id", docId)
                .single();

            if (error) throw error;
            setDocument(data);
        } catch (error) {
            console.error("Error fetching document:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-500)]"></div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4">
                <h1 className="text-2xl font-bold mb-2">Document Not Found</h1>
                <p className="text-[var(--text-muted)]">The document you are looking for does not exist or you don't have permission to view it.</p>
                <button
                    onClick={() => router.push("/")}
                    className="mt-4 px-4 py-2 bg-[var(--primary-500)] text-white rounded-lg hover:bg-[var(--primary-600)] transition-colors"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 border-b border-[var(--border-subtle)] pb-4">
                    <button
                        onClick={() => router.push("/")}
                        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 flex items-center gap-1"
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold">{document.title}</h1>
                    {document.description && (
                        <p className="text-[var(--text-muted)] mt-2">{document.description}</p>
                    )}
                </header>

                <div className="prose dark:prose-invert max-w-none">
                    <p className="italic text-[var(--text-muted)]">
                        Document content preview would be rendered here.
                        In a full implementation, this would show sections and paragraphs.
                    </p>
                </div>
            </div>

        </div>

        {/* ULTRA VISIBLE DEBUG - Should show no matter what */}
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: 'red',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                zIndex: 99999,
                fontSize: '12px'
            }}
        >
            🔴 DEBUG: Component Rendering
        </div>

        {/* Chat Panel - OUTSIDE main div to avoid any layout issues */}
        <TestChatButton />
        {/* Uncomment when test works: <FloatingChatPanel documentId={id} /> */}
        </>
    );
}
