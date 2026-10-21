"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { announceSessionChange, authCall } from "./client";

export function AccountMenu() {
  const { enabled, session, busy } = useAuth();
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState("");
  async function logout() {
    if (closing || (window.location.pathname.startsWith("/checkout") && !window.confirm("¿Cerrar sesión y salir de la compra?"))) return;
    setClosing(true); setMessage("");
    try {
      const result = await authCall("logout", {});
      if (result.authenticated !== false) throw new Error("Invalid logout");
      announceSessionChange();
      // A full navigation also drops all in-memory private views and pending requests.
      window.location.assign(result.remoteRevocationPending ? "/?sesion=cierre-local" : "/");
    } catch { setMessage("No pudimos confirmar el cierre de sesión. Inténtalo nuevamente."); setClosing(false); }
  }
  if (!enabled || !session.authenticated) return <Link className="header-action account-action" href="/login" aria-label="Iniciar sesión">
    <img className="mobile-icon" src="/figma/user-24.svg" alt="" width="24" height="24" /><span>{busy ? "Comprobando sesión…" : "Iniciar sesión"}</span>
  </Link>;
  return <div className="account-menu">
    <span>{session.user?.nombreCompleto}</span>
    <button className="auth-text-link" type="button" disabled={closing} onClick={() => void logout()}>{closing ? "Cerrando sesión…" : "Cerrar sesión"}</button>
    {message && <p role="alert">{message}</p>}
  </div>;
}
