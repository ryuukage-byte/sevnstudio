"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds only (a cached dev server causes stale-page confusion). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is optional; the app still works online */
    });
  }, []);
  return null;
}
