"use client";
import { useEffect, useRef, useState } from "react";
import type { ProductMediaDTO } from "../types/product-detail.types";

interface Props {
  opened: boolean;
  media: ProductMediaDTO[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Nombre accesible del diálogo; el contenedor envía el nombre del producto. */
  label?: string;
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Visor ampliado de la galería (O-002): diálogo modal con foco devuelto al
 * elemento que lo abrió, cierre con Escape y controles finitos.
 */
export function GalleryViewer({
  opened,
  media,
  index,
  onClose,
  onIndexChange,
  label = "Galería del producto",
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // El fallo se registra por índice: cambiar de imagen no arrastra el anterior.
  const [failedAt, setFailedAt] = useState<number | null>(null);

  // Al abrir: guardar el foco previo y enfocar Cerrar. Al cerrar: restaurarlo.
  useEffect(() => {
    if (!opened) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
        : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!active || !dialog?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [opened, onClose]);

  if (!opened) return null;

  const imageFailed = failedAt === index;
  const total = media.length;
  const current = media[Math.min(Math.max(index, 0), Math.max(total - 1, 0))];

  if (!current) return null;

  return (
    <div
      className="viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="viewer-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={dialogRef}
      >
        <div className="viewer-header">
          <p className="viewer-position" aria-live="polite">
            Imagen {index + 1} de {total}
          </p>
          <button
            type="button"
            className="viewer-close"
            aria-label="Cerrar visor"
            ref={closeRef}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="viewer-media">
          {imageFailed ? (
            <div
              className="gallery-fallback"
              role="img"
              aria-label={`${current.alt} — imagen no disponible`}
            >
              <span>Imagen no disponible</span>
            </div>
          ) : (
            <img
              src={current.url}
              alt={current.alt}
              width="960"
              height="640"
              onError={() => setFailedAt(index)}
            />
          )}
        </div>

        <div className="viewer-controls">
          <button
            type="button"
            aria-label="Imagen anterior"
            disabled={index <= 0}
            onClick={() => onIndexChange(Math.max(0, index - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            disabled={index >= total - 1}
            onClick={() => onIndexChange(Math.min(total - 1, index + 1))}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
