"use client";

import { useEffect } from "react";

export function LegacyResetNotice() {
  useEffect(() => {
    if (window.location.search || window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  return null;
}
