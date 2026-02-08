"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  FileText,
  Upload,
  BarChart3,
  Shield,
  LayoutDashboard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { DocumentsManagement } from "@/components/admin/DocumentsManagement";
import { UploadDocument } from "@/components/admin/UploadDocument";
import { Analytics } from "@/components/admin/Analytics";

type Tab = "dashboard" | "users" | "documents" | "upload";

export default function AdminPage() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    activeProjects: 0,
    pendingReviews: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    // Check if user is admin
    if (profile && profile.role !== "admin") {
      router.push("/");
      return;
    }

    if (profile?.role === "admin") {
      loadStats();
      setLoading(false);
    }
  }, [profile, router]);

  const loadStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get total documents
      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      // Get active projects (documents in review)
      const { count: activeCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "review")
        .is("deleted_at", null);

      // Get pending reviews (paragraphs escalated)
      const { count: pendingCount } = await supabase
        .from("paragraphs")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated");

      setStats({
        totalUsers: usersCount || 0,
        totalDocuments: docsCount || 0,
        activeProjects: activeCount || 0,
        pendingReviews: pendingCount || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-500)]"></div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return null;
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "users", label: "Users", icon: Users },
    { id: "upload", label: "Upload", icon: Upload },
  ];

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[var(--border-subtle)]">
          <div className="p-1.5 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg shadow-red-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">Admin Console</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${isActive
                    ? "bg-[var(--primary-500)]/10 text-[var(--primary-400)] font-medium"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? "text-[var(--primary-400)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`} />
                  <span>{tab.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)]/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center text-white text-xs font-bold">
              {profile?.full_name?.[0] || "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile?.full_name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <h1 className="text-xl font-bold text-[var(--text-primary)] capitalize">
            {activeTab}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Exit Admin
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm hover:border-[var(--primary-500)]/30 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">+12%</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalUsers}</span>
                        <p className="text-sm text-[var(--text-muted)]">Total Users</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm hover:border-[var(--primary-500)]/30 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalDocuments}</span>
                        <p className="text-sm text-[var(--text-muted)]">Total Documents</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm hover:border-[var(--primary-500)]/30 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.activeProjects}</span>
                        <p className="text-sm text-[var(--text-muted)]">Active Projects</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm hover:border-[var(--primary-500)]/30 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                          <Shield className="w-5 h-5" />
                        </div>
                        {stats.pendingReviews > 0 && (
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Action Needed</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.pendingReviews}</span>
                        <p className="text-sm text-[var(--text-muted)]">Pending Reviews</p>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Components */}
                  <Analytics stats={stats} />
                </motion.div>
              )}

              {activeTab === "documents" && (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <DocumentsManagement onRefresh={loadStats} />
                </motion.div>
              )}

              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <UsersManagement />
                </motion.div>
              )}

              {activeTab === "upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <UploadDocument onSuccess={loadStats} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
