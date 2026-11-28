"use client";

import { useState } from "react";

export function PromotionBar({ message }: { message?: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !message?.trim()) return null;
  return (
    <div className="h5-shell-promotion">
      <p>{message}</p>
      <button type="button" aria-label="Cerrar promociones" onClick={event => {
        event.currentTarget.closest("header")?.querySelector<HTMLElement>(".brand")?.focus();
        setDismissed(true);
      }}>
        <img src="/figma/favorite-close-15.svg" alt="" width="15" height="15" />
      </button>
    </div>
  );
}
