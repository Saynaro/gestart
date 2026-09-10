/**
 * Theme Management Utility
 * Supports: "light" | "dark" | "system"
 * Handles real-time OS preference detection, persistence across reloads, and seamless switching.
 */

export function getEffectiveTheme(mode) {
    if (mode === "system") {
        return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }
    return mode === "dark" ? "dark" : "light";
}

export function applyThemeMode(mode, options = {}) {
    const { save = true } = options;
    if (save && typeof window !== "undefined") {
        localStorage.setItem("theme_mode", mode);
    }

    const effective = getEffectiveTheme(mode);
    const isDark = effective === "dark";

    if (typeof document !== "undefined") {
        if (isDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("themeChanged", {
                detail: { mode, effective, isDark }
            })
        );
    }

    return effective;
}

let isOSListenerAttached = false;

export function initTheme() {
    if (typeof window === "undefined") return;

    const savedMode = localStorage.getItem("theme_mode") || (localStorage.getItem("theme") === "dark" ? "dark" : "light");
    applyThemeMode(savedMode, { save: false });

    // Listen for real-time OS theme switch (Mac, Windows, iOS, Android)
    if (!isOSListenerAttached && window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleOSThemeChange = (e) => {
            const currentMode = localStorage.getItem("theme_mode") || "light";
            if (currentMode === "system") {
                const isDark = e.matches;
                if (isDark) {
                    document.documentElement.classList.add("dark");
                    localStorage.setItem("theme", "dark");
                } else {
                    document.documentElement.classList.remove("dark");
                    localStorage.setItem("theme", "light");
                }
                window.dispatchEvent(
                    new CustomEvent("themeChanged", {
                        detail: { mode: "system", effective: isDark ? "dark" : "light", isDark }
                    })
                );
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", handleOSThemeChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleOSThemeChange);
        }
        isOSListenerAttached = true;
    }
}
