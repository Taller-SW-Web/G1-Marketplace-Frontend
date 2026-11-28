"use client";

import { Button } from "@/shared/ui/Button";
import type { Confirmed } from "./types";

export type FavoriteToggleProps = {
  productId: string; confirmed: Confirmed; busy: boolean; authenticated: boolean; uncertain?: boolean; iconOnly?: boolean;
  onSave: (id: string) => void; onRemove: (id: string) => void; onRequireAuth: () => void;
};

export function FavoriteHeart({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      <path d="M20.8 8.6c0 4.2-5.3 7.6-8.8 10.4C8.5 16.2 3.2 12.8 3.2 8.6a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
    </svg>
  );
}

export function FavoriteToggle({ productId, confirmed, busy, authenticated, uncertain = false, iconOnly = false, onSave, onRemove, onRequireAuth }: FavoriteToggleProps) {
  const saved = confirmed === "saved";
  const label = saved ? "Quitar de favoritos" : "Guardar en favoritos";
  return <Button variant="secondary" className="favorite-toggle" loading={busy}
    aria-label={iconOnly ? label : undefined}
    loadingLabel={saved ? "Quitando…" : "Guardando…"}
    aria-pressed={confirmed === "unknown" || uncertain ? undefined : saved}
    onClick={() => { if (!authenticated) onRequireAuth(); else if (saved) onRemove(productId); else onSave(productId); }}>
    <FavoriteHeart filled={saved} />{!iconOnly && <> {label}</>}
  </Button>;
}
