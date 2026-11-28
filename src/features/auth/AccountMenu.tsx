"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { announceSessionChange, authCall } from "./client";
import { CheckoutLogoutDialog } from "./CheckoutLogoutDialog";

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { enabled, session, busy } = useAuth();
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
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
  const name = session.user?.nombreCompleto?.trim();
  const firstName = name?.split(/\s+/u)[0] || "Mi cuenta";

  if (busy) return <span className="marketplace-account-loading" role="status">Comprobando sesión…</span>;
  if (!enabled || !session.authenticated) return (
    <div className="marketplace-guest">
      <img src="/figma/user-24.svg" alt="" width="20" height="20" />
      <Link href="/login" onClick={onNavigate}>Ingresar</Link>
      <span aria-hidden="true">/</span>
      <Link href="/registro" onClick={onNavigate}>Registrarse</Link>
    </div>
  );

  function closeMenu() {
    if (details.current) details.current.open = false;
  }

  return (
    <details ref={details} className="marketplace-account"
      onBlur={event => { if (!confirming && !event.currentTarget.contains(event.relatedTarget)) closeMenu(); }}
      onKeyDown={event => {
        if (event.key !== "Escape" || event.defaultPrevented || confirming || !details.current?.open) return;
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        summary.current?.focus();
      }}>
      <summary ref={summary} className="marketplace-account-trigger">
        <img src="/figma/user-24.svg" alt="" width="22" height="22" />
        <span>{firstName}</span>
        <img className="marketplace-account-chevron" src="/figma/favorite-chevron-12.svg" alt="" width="12" height="12" />
      </summary>
      <div className="marketplace-account-panel">
        <details className="marketplace-account-profile">
          <summary>Mi cuenta</summary>
          <p>{name || "Sesión activa"}</p>
        </details>
        <Link href="/mis-pedidos" onClick={onNavigate}>Mis pedidos</Link>
        <Link href="/favoritos" onClick={onNavigate}>Favoritos</Link>
        <button ref={trigger} type="button" disabled={closing} onClick={() => {
          if (window.location.pathname === "/checkout") setConfirming(true); else void logout();
        }}>{closing ? "Cerrando sesión…" : "Cerrar sesión"}</button>
        {message && !confirming && <p role="alert">{message}</p>}
      </div>
      {confirming && <CheckoutLogoutDialog opened busy={closing} error={message} onConfirm={() => void logout()}
        onCancel={() => { setConfirming(false); window.requestAnimationFrame(() => trigger.current?.focus()); }} />}
    </details>
  );
}
