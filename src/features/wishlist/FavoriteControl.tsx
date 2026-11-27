"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { safeReturn } from "@/features/auth/client";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/shared/ui/Button";
import { FavoriteToggle } from "./FavoriteToggle";
import { useWishlist } from "./WishlistProvider";
import { getItemState } from "./types";

export function FavoriteControl({ productId, announce = true, compact = false }: {
  productId: string;
  announce?: boolean;
  compact?: boolean;
}) {
  const { session, sessionBusy, items, mutate } = useWishlist();
  const { enabled: realAuth } = useAuth();
  const state = getItemState(items, productId);
  const [authPrompt, setAuthPrompt] = useState<{ expired: boolean; returnTo: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const invoker = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (authPrompt) dialog.current?.showModal();
    else dialog.current?.close();
  }, [authPrompt]);

  function openAuth(expired: boolean) {
    setAuthPrompt({ expired, returnTo: safeReturn(location.pathname + location.search) });
  }

  async function changeFavorite(operation: "save" | "remove") {
    const trigger = document.activeElement;
    if (await mutate(productId, operation) === "expired" && realAuth) {
      invoker.current = trigger instanceof HTMLElement ? trigger : null;
      openAuth(true);
    }
  }

  if (!session.enabled) return null;
  return <div className="favorite-control">
    <FavoriteToggle productId={productId} confirmed={state.confirmed} uncertain={state.uncertain}
      busy={sessionBusy || !!state.pending} authenticated={!!session.identity} compact={compact}
      onSave={() => { void changeFavorite("save"); }} onRemove={() => { void changeFavorite("remove"); }}
      onRequireAuth={() => { invoker.current = document.activeElement as HTMLElement; openAuth(false); }} />
    {state.confirmed === "unknown" && !state.message && (!compact || session.identity) &&
      <p className="wishlist-hint">{compact ? "No pudimos confirmar si está en tus favoritos."
        : "Estado aún no consultable; guardar es una acción idempotente."}</p>}
    {state.message && <p {...(announce ? { role: state.error ? "alert" : "status" } : {})} className="wishlist-message">{state.message}</p>}
    {state.retry && <Button variant="tertiary" disabled={sessionBusy || !!state.pending}
      onClick={() => { if (state.retry) void changeFavorite(state.retry); }}>Reintentar {state.retry === "save" ? "guardado" : "eliminación"}</Button>}
    <dialog ref={dialog} className="wishlist-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const actions = dialog.current?.querySelectorAll<HTMLElement>("a[href], button");
        if (!actions?.length) return;
        const first = actions[0];
        const last = actions[actions.length - 1];
        if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }}
      onCancel={() => setAuthPrompt(null)} onClose={() => {
        setAuthPrompt(null);
        const previous = invoker.current;
        if (previous?.isConnected) previous.focus();
      }}>
      <h2 id={titleId}>{authPrompt?.expired ? "Tu sesión terminó" : "Se requiere una sesión"}</h2>
      <p id={descriptionId}>{realAuth
        ? "Inicia sesión y vuelve a elegir qué quieres hacer con este favorito."
        : "Para guardar este producto necesitas una sesión. En la demo H3 puedes seleccionar un cliente de prueba y volver a pulsar Guardar."}</p>
      {realAuth && authPrompt && <Link className="button button--primary button--md"
        href={`/login?returnTo=${encodeURIComponent(authPrompt.returnTo)}`}>Iniciar sesión</Link>}
      <Button variant={realAuth ? "secondary" : "primary"} onClick={() => setAuthPrompt(null)}>Ahora no</Button>
    </dialog>
  </div>;
}
