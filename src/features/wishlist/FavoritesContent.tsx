"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { FavoritesExperience, FavoritesLoading } from "./FavoritesExperience";
import { FavoritesHeading } from "./FavoritesHeading";
import { useFavoritesController } from "./useFavoritesController";
import { httpFavorites } from "./transport";
import { useWishlist } from "./WishlistProvider";

function ConnectedFavorites() {
  const { confirm, confirmList, expireSession, revision } = useWishlist();
  const { controller, state } = useFavoritesController(httpFavorites, { confirmed: confirm, listed: confirmList, expired: expireSession, revision });
  return <FavoritesExperience state={state} controller={controller} />;
}
export function FavoritesContent() {
  const { session, sessionBusy, sessionMessage } = useWishlist();
  if (sessionBusy && !session.identity) return <FavoritesLoading />;
  if (session.identity) return <ConnectedFavorites key={session.scope} />;
  return <FavoritesGuest message={sessionMessage} />;
}
function FavoritesGuest({ message }: { message: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (message && !dismissed && !dialog.current?.open) dialog.current?.showModal();
  }, [message, dismissed]);
  return <div className="favorites-list">
    <FavoritesHeading description="Encuentra aquí los productos que te gustan." />
    <section className="favorites-sign-in" aria-labelledby="favorites-sign-in-title">
      <span className="favorites-sign-in-icon" aria-hidden="true"><img src="/figma/favorite-heart-32.svg" alt="" width="32" height="32" /></span>
      <h2 id="favorites-sign-in-title" tabIndex={-1} ref={title}>Tus favoritos te esperan</h2>
      <p>Inicia sesión para ver tu lista de favoritos.</p>
      <p>Guarda los productos que te gustan y encuéntralos aquí.</p>
      <Button className="favorites-sign-in-button" disabled title="Próximamente">Iniciar sesión</Button>
    </section>
    <dialog ref={dialog} className="wishlist-dialog" aria-labelledby="favorites-auth-title" aria-describedby="favorites-auth-message"
      onCancel={() => setDismissed(true)} onClose={() => { setDismissed(true); title.current?.focus(); }}>
      <h2 id="favorites-auth-title">Vuelve a iniciar sesión</h2>
      <p id="favorites-auth-message">{message} Tus productos privados ya no están visibles.</p>
      <Button disabled title="Próximamente">Iniciar sesión</Button>
      <Button variant="secondary" onClick={() => dialog.current?.close()}>Ahora no</Button>
    </dialog>
  </div>;
}
