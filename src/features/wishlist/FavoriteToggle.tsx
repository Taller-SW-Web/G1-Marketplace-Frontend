"use client";

import { Button } from "@/shared/ui/Button";
import type { Confirmed } from "./types";

export type FavoriteToggleProps = {
  productId: string; confirmed: Confirmed; busy: boolean; authenticated: boolean; uncertain?: boolean;
  onSave: (id: string) => void; onRemove: (id: string) => void; onRequireAuth: () => void;
};

export function FavoriteToggle({ productId, confirmed, busy, authenticated, uncertain = false, onSave, onRemove, onRequireAuth }: FavoriteToggleProps) {
  const saved = confirmed === "saved";
  return <Button variant="secondary" className="favorite-toggle" loading={busy}
    loadingLabel={saved ? "Quitando…" : "Guardando…"}
    aria-pressed={confirmed === "unknown" || uncertain ? undefined : saved}
    onClick={() => { if (!authenticated) onRequireAuth(); else if (saved) onRemove(productId); else onSave(productId); }}>
    <span aria-hidden="true">{saved ? "♥" : "♡"} </span>{saved ? "Quitar de favoritos" : "Guardar en favoritos"}
  </Button>;
}
