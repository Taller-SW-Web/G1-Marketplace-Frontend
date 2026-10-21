"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { anonymous, authCall, type PublicSession } from "./client";

const Context = createContext<{ enabled: boolean; session: PublicSession; busy: boolean; sync: () => Promise<void> }>({
  enabled: false, session: anonymous, busy: false, sync: async () => {},
});
export function AuthProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [session, setSession] = useState(anonymous);
  const [busy, setBusy] = useState(enabled);
  const active = useRef<AbortController | null>(null);
  const [notice, setNotice] = useState(false);
  const sync = useCallback(async () => {
    if (!enabled) return;
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    try {
      const result = await authCall("session", undefined, controller.signal);
      if (controller.signal.aborted) return;
      setSession(result.authenticated === true ? result as PublicSession : anonymous);
    } catch { if (!controller.signal.aborted) setSession(anonymous); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const noticeTimer = window.setTimeout(() => setNotice(new URLSearchParams(window.location.search).get("sesion") === "cierre-local"), 0);
    const update = () => { void sync(); };
    update();
    window.addEventListener("focus", update);
    window.addEventListener("g1:session-changed", update);
    const timer = window.setInterval(update, 60000);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("g1-session") : null;
    if (channel) channel.onmessage = update;
    return () => {
      window.removeEventListener("focus", update); window.removeEventListener("g1:session-changed", update);
      window.clearInterval(timer); channel?.close();
      window.clearTimeout(noticeTimer);
      active.current?.abort();
    };
  }, [enabled, sync]);
  return <Context.Provider value={{ enabled, session, busy, sync }}>
    {notice && <p className="auth-session-notice" role="status">Tu sesión en Marketplace se cerró. No pudimos confirmar la revocación remota en Seguridad.</p>}
    {children}
  </Context.Provider>;
}
export const useAuth = () => useContext(Context);
