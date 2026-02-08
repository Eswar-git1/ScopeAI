"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    Sparkles,
    Shield,
    Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            if (data.user) {
                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-900)] via-[var(--bg-primary)] to-[var(--bg-secondary)]" />

                {/* Animated Orbs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-20 left-20 w-72 h-72 rounded-full bg-[var(--primary-600)]/20 blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl"
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center shadow-2xl shadow-[var(--primary-500)]/30">
                            <span className="text-white font-bold text-2xl">S</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gradient">ScopeAI</h1>
                            <p className="text-[var(--text-muted)] text-sm">Intelligence Platform</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-4 leading-tight">
                        Collaborate on scope documents with{" "}
                        <span className="text-gradient">AI-powered</span> intelligence
                    </h2>
                    <p className="text-lg text-[var(--text-muted)] mb-12 max-w-lg">
                        Review, discuss, and make decisions on technical scope documents with
                        full traceability and zero hallucination.
                    </p>

                    {/* Features */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--primary-600)]/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[var(--primary-400)]" />
                            </div>
                            <div>
                                <h3 className="font-semibold">RAG-Powered Chatbot</h3>
                                <p className="text-sm text-[var(--text-muted)]">Ask questions, get cited answers</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Zero Hallucination</h3>
                                <p className="text-sm text-[var(--text-muted)]">Answers strictly from scope content</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Real-time Collaboration</h3>
                                <p className="text-sm text-[var(--text-muted)]">Comments, decisions, audit trails</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-primary)]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center">
                            <span className="text-white font-bold text-xl">S</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gradient">ScopeAI</h1>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                        <p className="text-[var(--text-muted)]">Sign in to continue to ScopeAI</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="input pl-12"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="input pl-12 pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password */}
                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-[var(--primary-400)] hover:text-[var(--primary-300)]"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full py-3"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--border-subtle)]" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[var(--bg-primary)] text-[var(--text-muted)]">
                                New to ScopeAI?
                            </span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <Link
                        href="/signup"
                        className="btn btn-secondary w-full py-3"
                    >
                        Create an account
                    </Link>

                    {/* Terms */}
                    <p className="text-xs text-[var(--text-muted)] text-center mt-6">
                        By signing in, you agree to our{" "}
                        <Link href="/terms" className="text-[var(--primary-400)] hover:underline">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-[var(--primary-400)] hover:underline">
                            Privacy Policy
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
