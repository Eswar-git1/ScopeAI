"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header, Sidebar, SearchDialog } from "@/components/layout";
import { ContentPane } from "@/components/scope";
import { ChatPanel } from "@/components/chat";
import { DiscussionPanel } from "@/components/discussion/DiscussionPanel";
import { useUIStore, useAuthStore, useDocumentStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  const [initializing, setInitializing] = useState(true);

  const { chatPanelOpen, discussionPanelOpen, searchOpen } = useUIStore();
  const { user, setUser, setProfile } = useAuthStore();
  const { setCurrentDocument, setDocuments } = useDocumentStore();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    initializeApp();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeApp = async () => {
    try {
      // Check auth status
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfile(profile);
      }

      // Fetch documents
      const { data: documents } = await supabase
        .from("documents")
        .select(`
          id,
          title,
          description,
          status,
          current_version_id,
          created_by,
          created_at,
          updated_at
        `)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (documents && documents.length > 0) {
        setDocuments(documents);
        setCurrentDocument(documents[0]);
      }
    } catch (error) {
      console.error("Error initializing app:", error);
    } finally {
      setInitializing(false);
    }
  };

  if (initializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          {/* Animated Logo */}
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center mb-6 shadow-2xl shadow-[var(--primary-500)]/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gradient mb-2">ScopeAI</h1>
          <p className="text-[var(--text-muted)]">Loading your workspace...</p>

          {/* Loading Bar */}
          <div className="mt-6 w-48 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "linear",
              }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-[var(--primary-500)] to-transparent"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <Header />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Content Pane */}
          <ContentPane />

          {/* Right Panel - Chat */}
          {chatPanelOpen && <ChatPanel />}
        </div>
      </div>

      {/* Floating Chat Button when panel is closed */}
      {!chatPanelOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => useUIStore.getState().toggleChatPanel()}
          className="fixed right-6 bottom-6 p-4 bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] rounded-full shadow-2xl shadow-[var(--primary-500)]/40 hover:shadow-[var(--primary-500)]/60 transition-shadow z-50"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Search Dialog */}
      <SearchDialog />

      {/* Discussion Panel */}
      <DiscussionPanel
        isOpen={discussionPanelOpen}
        onClose={() => useUIStore.getState().toggleDiscussionPanel()}
      />
    </div>
  );
}
