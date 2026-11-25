"use client";

import { Button } from "@/shared/ui/Button";
import type { Confirmed } from "./types";

export type FavoriteToggleProps = {
  productId: string; confirmed: Confirmed; busy: boolean; authenticated: boolean; uncertain?: boolean; compact?: boolean;
  onSave: (id: string) => void; onRemove: (id: string) => void; onRequireAuth: () => void;
};

export function FavoriteToggle({ productId, confirmed, busy, authenticated, uncertain = false, compact = false, onSave, onRemove, onRequireAuth }: FavoriteToggleProps) {
  const saved = confirmed === "saved";
  const label = saved ? "Quitar de favoritos" : "Guardar en favoritos";
  return <Button variant="secondary" className={compact ? "favorite-toggle favorite-toggle--compact" : "favorite-toggle"} loading={busy}
    loadingLabel={saved ? "Quitando…" : "Guardando…"}
    aria-pressed={confirmed === "unknown" || uncertain ? undefined : saved}
    onClick={() => { if (!authenticated) onRequireAuth(); else if (saved) onRemove(productId); else onSave(productId); }}>
    {!busy && <span aria-hidden="true">
      {compact && !saved ? <img src="/figma/h5-shell/heart.svg" width="22" height="22" alt="" /> : saved ? "♥" : "♡"}
    </span>}
    <span className={compact ? "sr-only" : undefined}>{label}</span>
  </Button>;
}
