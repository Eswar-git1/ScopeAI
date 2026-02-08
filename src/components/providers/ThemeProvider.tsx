"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useUIStore();

    useEffect(() => {
        const root = document.documentElement;

        // Remove both classes first
        root.classList.remove("light", "dark");

        // Add the current theme class
        root.classList.add(theme);

        // Store preference in localStorage
        localStorage.setItem("theme", theme);
    }, [theme]);

    // Load theme from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("theme");
        if (stored && (stored === "light" || stored === "dark")) {
            useUIStore.getState().setTheme(stored);
        }
    }, []);

    return <>{children}</>;
}
