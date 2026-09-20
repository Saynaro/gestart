import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getEffectiveTheme } from "../utils/theme";
import launchDarkPng from "../assets/GestArt_launch_dark.png";
import launchLightPng from "../assets/GestArt_launch_light.png";
import departureDarkMp4 from "../assets/GestArt_departure_dark.mp4";
import departureLightMp4 from "../assets/GestArt_departure_light.mp4";
import "./PWASplashScreen.css";

// In-memory module-level flag to avoid duplicate execution in React StrictMode or re-renders
let splashAlreadyTriggeredInSession = false;

// Display time for the initial static logo before starting the departure animation
const STATIC_LOGO_DURATION_MS = 750;

function checkIsStandalonePWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    (typeof document !== "undefined" && document.referrer && document.referrer.includes("android-app://"))
  );
}

function checkPrefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function checkShouldShowSplash() {
  if (typeof window === "undefined") return false;
  if (!checkIsStandalonePWA()) return false;
  if (checkPrefersReducedMotion()) return false;
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const isFinishedRef = useRef(false);

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

  const launchImg = isDark ? launchDarkPng : launchLightPng;
  const departureVideo = isDark ? departureDarkMp4 : departureLightMp4;
  const bgColor = isDark ? "#0a0a0a" : "#F2F0EB";

  const finishSplash = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    try {
      sessionStorage.setItem("gestart_pwa_splash_shown", "1");
    } catch (_) {}

    setIsFadingOut(true);
    const fadeTimer = setTimeout(() => {
      setShouldRender(false);
    }, 180);

    return () => clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    splashAlreadyTriggeredInSession = true;

    // Safety timeout (max 2.8s) to guarantee splash screen never hangs the UI
    const safetyTimer = setTimeout(() => {
      finishSplash();
    }, 2800);

    // Ensure iOS WebKit playsinline properties
    if (videoRef.current) {
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.setAttribute("webkit-playsinline", "true");
      videoRef.current.setAttribute("x5-playsinline", "true");
    }

    // Give the user a clear, crisp view of the static logo before starting the departure video
    const videoStartTimer = setTimeout(() => {
      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Autoplay successfully initiated
            })
            .catch((err) => {
              console.warn("PWA splash autoplay prevented or failed:", err);
              // If video playback fails, dismiss splash smoothly
              setTimeout(() => {
                finishSplash();
              }, 400);
            });
        }
      }
    }, STATIC_LOGO_DURATION_MS);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(videoStartTimer);
    };
  }, [shouldRender, finishSplash]);

  if (!shouldRender) return null;

  const content = (
    <div
      className={`pwa-splash-overlay ${isFadingOut ? "fade-out" : ""}`}
      style={{ backgroundColor: bgColor }}
      aria-hidden="true"
    >
      <div className="pwa-splash-media-wrap">
        {/* Video component */}
        <video
          ref={videoRef}
          className="pwa-splash-video"
          src={departureVideo}
          poster={launchImg}
          playsInline
          muted
          preload="auto"
          onPlaying={() => setIsVideoPlaying(true)}
          onTimeUpdate={() => {
            if (videoRef.current && videoRef.current.currentTime > 0.04 && !isVideoPlaying) {
              setIsVideoPlaying(true);
            }
          }}
          onEnded={finishSplash}
          onError={finishSplash}
        />

        {/* Static PNG shown until video is actively playing frames */}
        <img
          src={launchImg}
          alt=""
          className={`pwa-splash-img ${isVideoPlaying ? "hidden" : ""}`}
        />
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
