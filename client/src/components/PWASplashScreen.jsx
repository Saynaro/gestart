import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getEffectiveTheme } from "../utils/theme";
import "./PWASplashScreen.css";

// In-memory module-level flag to avoid duplicate execution in React StrictMode or re-renders
let splashAlreadyTriggeredInSession = false;

// How long the static splash stays visible before fading out
const STATIC_LOGO_DURATION_MS = 900;

function checkIsStandalonePWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    (typeof document !== "undefined" && document.referrer && document.referrer.includes("android-app://"))
  );
}

function checkShouldShowSplash() {
  if (typeof window === "undefined") return false;
  if (!checkIsStandalonePWA()) return false;
  if (splashAlreadyTriggeredInSession) return false;

  try {
    if (sessionStorage.getItem("gestart_pwa_splash_shown")) {
      return false;
    }
  } catch (_) {}

  return true;
}

export default function PWASplashScreen() {
  const [shouldRender, setShouldRender] = useState(() => checkShouldShowSplash());
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Remove the native HTML splash (#native-pwa-splash from index.html) as soon as React mounts.
  // It was shown instantly before JS loaded; now React takes over rendering.
  useEffect(() => {
    const nativeSplash = document.getElementById("native-pwa-splash");
    if (nativeSplash) {
      nativeSplash.remove();
    }
  }, []); // runs once on mount, no dependencies needed

  // Determine current theme
  const [isDark] = useState(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return true;
    }
    const mode = typeof localStorage !== "undefined"
      ? (localStorage.getItem("theme_mode") || (localStorage.getItem("theme") === "dark" ? "dark" : "light"))
      : "light";
    return getEffectiveTheme(mode) === "dark";
  });

  // Use public/splash images — same files used by native HTML splash and apple-touch-startup-image
  const launchImg = isDark ? "/splash/dark_1179x2556.png" : "/splash/light_1179x2556.png";
  const bgColor = isDark ? "#0a0a0a" : "#F2F0EB";

  const finishSplash = useCallback(() => {
    try {
      sessionStorage.setItem("gestart_pwa_splash_shown", "1");
    } catch (_) {}

    splashAlreadyTriggeredInSession = true;
    setIsFadingOut(true);

    const fadeTimer = setTimeout(() => {
      setShouldRender(false);
    }, 220);

    return () => clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    // Show static logo for STATIC_LOGO_DURATION_MS, then fade out
    const dismissTimer = setTimeout(() => {
      finishSplash();
    }, STATIC_LOGO_DURATION_MS);

    return () => clearTimeout(dismissTimer);
  }, [shouldRender, finishSplash]);

  if (!shouldRender) return null;

  const content = (
    <div
      className={`pwa-splash-overlay ${isFadingOut ? "fade-out" : ""}`}
      style={{ backgroundColor: bgColor }}
      aria-hidden="true"
    >
      <img
        src={launchImg}
        alt=""
        className="pwa-splash-img"
      />
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
