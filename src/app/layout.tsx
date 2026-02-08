import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "ScopeAI - Intelligent Scope Collaboration Platform",
  description: "A production-grade collaborative platform for multi-stakeholder review and discussion of technical scope documents, powered by RAG-based AI intelligence.",
  keywords: ["scope management", "RAG", "AI assistant", "document collaboration", "enterprise"],
  authors: [{ name: "ScopeAI Team" }],
  openGraph: {
    title: "ScopeAI - Intelligent Scope Collaboration Platform",
    description: "Review and discuss technical scope documents with AI-powered intelligence",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen overflow-hidden antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
