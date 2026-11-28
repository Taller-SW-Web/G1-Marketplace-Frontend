"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { FavoriteToggle } from "./FavoriteToggle";
import { useWishlist } from "./WishlistProvider";
import { getItemState } from "./types";

export function FavoriteControl({ productId, announce = true }: { productId: string; announce?: boolean }) {
  const { session, sessionBusy, items, mutate } = useWishlist();
  const state = getItemState(items, productId);
  const [authOpen, setAuthOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const invoker = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (authOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [authOpen]);
  if (!session.enabled) return null;
  return <div className="favorite-control">
    <FavoriteToggle productId={productId} confirmed={state.confirmed} uncertain={state.uncertain}
      busy={sessionBusy || !!state.pending} authenticated={!!session.identity}
      onSave={id => { void mutate(id, "save"); }} onRemove={id => { void mutate(id, "remove"); }}
      onRequireAuth={() => { invoker.current = document.activeElement as HTMLElement; setAuthOpen(true); }} />
    {state.confirmed === "unknown" && !state.message && <p className="wishlist-hint">Estado aún no consultable; guardar es una acción idempotente.</p>}
    {state.message && <p {...(announce ? { role: state.error ? "alert" : "status" } : {})} className="wishlist-message">{state.message}</p>}
    {state.retry && <Button variant="tertiary" disabled={sessionBusy || !!state.pending}
      onClick={() => { void mutate(productId, state.retry!); }}>Reintentar {state.retry === "save" ? "guardado" : "eliminación"}</Button>}
    <dialog ref={dialog} className="wishlist-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onKeyDown={event => {
        if (event.key === "Tab") {
          // This local decision dialog has exactly one interactive action.
          event.preventDefault(); dialog.current?.querySelector("button")?.focus();
        }
      }}
      onCancel={() => setAuthOpen(false)} onClose={() => { setAuthOpen(false); invoker.current?.focus(); }}>
      <h2 id={titleId}>Se requiere una sesión</h2>
      <p id={descriptionId}>Para guardar este producto necesitas una sesión. El acceso real aún no está integrado. En la demo H3 puedes seleccionar un cliente de prueba; después vuelve a pulsar Guardar.</p>
      <Button onClick={() => setAuthOpen(false)}>Ahora no</Button>
    </dialog>
  </div>;
}
