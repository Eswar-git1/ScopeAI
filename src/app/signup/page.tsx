"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    CheckCircle,
    Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const passwordRequirements = [
        { label: "At least 8 characters", met: password.length >= 8 },
        { label: "Contains a number", met: /\d/.test(password) },
        { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
        { label: "Passwords match", met: password === confirmPassword && password.length > 0 },
    ];

    const allRequirementsMet = passwordRequirements.every((req) => req.met);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!allRequirementsMet) {
            setError("Please meet all password requirements");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) {
                setError(error.message);
                return;
            }

            if (data.user) {
                setSuccess(true);
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg-primary)]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-4">Check your email</h2>
                    <p className="text-[var(--text-muted)] mb-8">
                        We&apos;ve sent a confirmation link to <strong>{email}</strong>.
                        Please check your inbox and click the link to activate your account.
                    </p>
                    <Link href="/login" className="btn btn-primary">
                        Back to login
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-primary)]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center">
                            <span className="text-white font-bold text-xl">S</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gradient">ScopeAI</h1>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">Create your account</h2>
                        <p className="text-[var(--text-muted)]">Join ScopeAI to collaborate on scope documents</p>
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

                        {/* Full Name Field */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Full name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="input pl-12"
                                    required
                                />
                            </div>
                        </div>

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
                                    placeholder="Create a strong password"
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

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className="input pl-12"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] space-y-2">
                            {passwordRequirements.map((req, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center gap-2 text-sm transition-colors ${req.met ? "text-emerald-400" : "text-[var(--text-muted)]"
                                        }`}
                                >
                                    <CheckCircle className={`w-4 h-4 ${req.met ? "opacity-100" : "opacity-30"}`} />
                                    {req.label}
                                </div>
                            ))}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !allRequirementsMet}
                            className="btn btn-primary w-full py-3"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create account
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
                                Already have an account?
                            </span>
                        </div>
                    </div>

                    {/* Sign In Link */}
                    <Link href="/login" className="btn btn-secondary w-full py-3">
                        Sign in instead
                    </Link>
                </motion.div>
            </div>

            {/* Right Panel - Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--primary-900)] to-[var(--bg-primary)]" />

                {/* Animated Elements */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]"
                >
                    <div className="absolute inset-0 border border-[var(--primary-500)]/20 rounded-full" />
                    <div className="absolute inset-8 border border-[var(--primary-500)]/15 rounded-full" />
                    <div className="absolute inset-16 border border-[var(--primary-500)]/10 rounded-full" />
                </motion.div>

                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-[var(--primary-500)]/30 blur-3xl"
                />

                <div className="relative z-10 flex flex-col items-center justify-center h-full px-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center"
                    >
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[var(--primary-500)]/30">
                            <Sparkles className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">
                            Intelligent Scope Collaboration
                        </h2>
                        <p className="text-lg text-[var(--text-muted)] max-w-sm">
                            Transform how teams review and discuss technical scope documents
                            with AI-powered insights and full audit trails.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
