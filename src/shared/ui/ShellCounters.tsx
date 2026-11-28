"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { getCartApi } from "@/features/cart/api";
import { httpFavorites } from "@/features/wishlist/transport";
import { useWishlist } from "@/features/wishlist/WishlistProvider";

const refreshCartEveryMs = 30_000;

export function ShellCounters() {
  const { session, busy } = useAuth();
  const { session: wishlist, revision } = useWishlist();
  const scope = session.scope;
  const identity = wishlist.identity;
  const [cart, setCart] = useState<{ scope: string; count: number } | null>(null);
  const [favorites, setFavorites] = useState<{ identity: string; count: number } | null>(null);

  useEffect(() => {
    if (busy) return;
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending || document.visibilityState === "hidden" || !active) return;
      pending = true;
      try {
        const snapshot = await getCartApi(false);
        if (active) setCart({ scope, count: snapshot.items.reduce((total, item) => total + item.quantity, 0) });
      } catch {
        if (active) setCart(null);
      } finally {
        pending = false;
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, refreshCartEveryMs);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, [busy, scope]);

  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    void httpFavorites.list(controller.signal).then(items => {
      if (!controller.signal.aborted) setFavorites({ identity, count: items.length });
    }).catch(() => {
      if (!controller.signal.aborted) setFavorites(null);
    });
    return () => controller.abort();
  }, [identity, revision, wishlist.scope]);

  return <>
    <CountLink href="/favoritos" label="Favoritos" icon="/figma/heart-24.svg"
      count={identity && favorites?.identity === identity ? favorites.count : null} />
    <CountLink href="/carrito" label="Carrito de compras" icon="/figma/bag-24.svg"
      count={!busy && cart?.scope === scope ? cart.count : null} />
  </>;
}

function CountLink({ href, label, icon, count }: { href: string; label: string; icon: string; count: number | null }) {
  return <Link href={href} className="marketplace-icon-button marketplace-count-link"
    aria-label={count === null ? label : `${label} (${count})`}>
    <img src={icon} alt="" width="24" height="24" />
    {count !== null && <span className="marketplace-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
  </Link>;
}
