"use client";
import { useEffect, useState } from "react";
import { accountCall } from "./account-client";
export function useAccountCapabilities() {
  const [capabilities, setCapabilities] = useState({ loading: true, registro: false, recuperacion: false });
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const value = await accountCall("auth/capabilities", undefined, controller.signal);
        if (!controller.signal.aborted) setCapabilities({ loading: false, registro: value?.registro === true, recuperacion: value?.recuperacion === true });
      } catch { if (!controller.signal.aborted) setCapabilities({ loading: false, registro: false, recuperacion: false }); }
    };
    void load(); return () => controller.abort();
  }, []);
  return capabilities;
}
