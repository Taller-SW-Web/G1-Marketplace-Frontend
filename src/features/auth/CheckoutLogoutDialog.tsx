"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/shared/ui/Button";

export function CheckoutLogoutDialog({ opened, busy, error, onConfirm, onCancel }: {
  opened: boolean; busy: boolean; error?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (opened && element && !element.open) { element.showModal(); continueButton.current?.focus(); }
    else if (!opened && element?.open) element.close();
  }, [opened]);
  return <dialog ref={dialog} className="checkout-logout-dialog" aria-labelledby="logout-dialog-title"
    aria-describedby="logout-dialog-message" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="logout-dialog-top">
      <span className="logout-dialog-icon"><img src="/figma/auth/logout-lock.svg" width="24" height="24" alt="" /></span>
      <button type="button" className="logout-dialog-close" aria-label="Cerrar diálogo" disabled={busy} onClick={onCancel}>
        <img src="/figma/auth/close.svg" width="20" height="20" alt="" />
      </button>
    </div>
    <h2 id="logout-dialog-title">¿Cerrar sesión?</h2>
    <p id="logout-dialog-message" className="logout-dialog-warning">La selección de envío y la cotización pueden perder vigencia. El carrito de tu cuenta se conservará. Si ya enviaste un pedido, cerrar sesión no lo cancela.</p>
    {error && <p role="alert">{error}</p>}
    <div className="logout-dialog-actions">
      <Button ref={continueButton} fullWidth disabled={busy} onClick={onCancel}>Continuar checkout</Button>
      <button className="auth-text-link logout-dialog-confirm" type="button" disabled={busy} onClick={onConfirm}>{busy ? "Cerrando sesión…" : "Cerrar sesión"}</button>
      {busy && <span role="status">Cerrando sesión…</span>}
    </div>
  </dialog>;
}
