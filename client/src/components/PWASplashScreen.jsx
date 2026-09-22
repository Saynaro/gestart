import React, { useEffect } from "react";

export default function PWASplashScreen() {
  useEffect(() => {
    const nativeSplash = document.getElementById("native-pwa-splash");
    if (!nativeSplash) return;

    const isPwa =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
    const isNoSplash = document.documentElement.classList.contains("no-splash");

    // If website or already shown in this session, remove immediately without any delay
    if (!isPwa || isNoSplash) {
      nativeSplash.remove();
      return;
    }

    // On cold PWA start, smoothly fade splash out as React takes over
    const timer = setTimeout(() => {
      nativeSplash.style.opacity = "0";
      nativeSplash.style.pointerEvents = "none";
      const removeTimer = setTimeout(() => {
        if (nativeSplash && nativeSplash.parentNode) {
          nativeSplash.remove();
        }
      }, 300);
      return () => clearTimeout(removeTimer);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  return null;
}

