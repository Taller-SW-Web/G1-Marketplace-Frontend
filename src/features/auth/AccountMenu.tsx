"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { announceSessionChange, authCall } from "./client";
import { CheckoutLogoutDialog } from "./CheckoutLogoutDialog";

export function AccountMenu() {
  const { enabled, session, busy } = useAuth();
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  async function logout() {
    if (closing) return;
    setClosing(true); setMessage("");
    try {
      const result = await authCall("logout", {});
      if (result.authenticated !== false) throw new Error("Invalid logout");
      announceSessionChange();
      // A full navigation also drops all in-memory private views and pending requests.
      window.location.assign(result.remoteRevocationPending ? "/?sesion=cierre-local" : "/?sesion=cerrada");
    } catch { setMessage("No pudimos confirmar el cierre de sesión. Inténtalo nuevamente."); setClosing(false); }
  }
  if (!enabled || !session.authenticated) return <Link className="header-action account-action" href="/login" aria-label="Iniciar sesión">
    <img className="mobile-icon" src="/figma/user-24.svg" alt="" width="24" height="24" /><span>{busy ? "Comprobando sesión…" : "Iniciar sesión"}</span>
  </Link>;
  return <div className="account-menu">
    <span>{session.user?.nombreCompleto}</span>
    <button ref={trigger} className="auth-text-link" type="button" disabled={closing} onClick={() => {
      if (window.location.pathname === "/checkout") setConfirming(true); else void logout();
    }}>{closing ? "Cerrando sesión…" : "Cerrar sesión"}</button>
    {message && !confirming && <p role="alert">{message}</p>}
    <CheckoutLogoutDialog opened={confirming} busy={closing} error={message} onConfirm={() => void logout()}
      onCancel={() => { setConfirming(false); window.requestAnimationFrame(() => trigger.current?.focus()); }} />
  </div>;
}
