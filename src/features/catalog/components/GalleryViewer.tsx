"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

/** Niveles de zoom del visor. El índice 0 equivale al tamaño natural. */
const ZOOM_LEVELS = [1, 1.5, 2, 2.5] as const;

/**
 * Visor ampliado de la galería (O-002): diálogo modal con foco devuelto al
 * elemento que lo abrió, cierre con Escape y controles finitos.
 *
 * V-007 / FE #146: el zoom es operable con teclado (`+`, `-` y `0`) además de
 * los botones, y las flechas cambian de imagen. El zoom se reinicia al cambiar
 * de imagen para no ampliar una foto distinta a la que se venía observando.
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
  // El nivel de zoom guardado sólo vale para su índice (sin efectos de reset).
  const [zoomState, setZoomState] = useState({ index, level: 0 });
  const level = zoomState.index === index ? zoomState.level : 0;
  const zoom = ZOOM_LEVELS[level];

  const setLevel = useCallback(
    (next: number) =>
      setZoomState({
        index,
        level: Math.min(Math.max(next, 0), ZOOM_LEVELS.length - 1),
      }),
    [index],
  );

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
      if (event.key !== "Tab") {
        // Atajos del visor: no se disparan mientras se escribe en un campo.
        const target = event.target as HTMLElement | null;
        if (
          typeof target?.closest === "function" &&
          target.closest("input, textarea, select, [contenteditable='true']")
        ) {
          return;
        }
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          setLevel(level + 1);
          return;
        }
        if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          setLevel(level - 1);
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          setLevel(0);
          return;
        }
        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          onIndexChange(index - 1);
          return;
        }
        if (event.key === "ArrowRight" && index < media.length - 1) {
          event.preventDefault();
          onIndexChange(index + 1);
          return;
        }
        return;
      }
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
  }, [opened, onClose, onIndexChange, index, level, media.length, setLevel]);

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

        <div
          className="viewer-media"
          data-zoom={zoom}
          style={{ overflow: zoom > 1 ? "auto" : undefined }}
        >
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
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              onError={() => setFailedAt(index)}
            />
          )}
        </div>

        <div className="viewer-controls" role="group" aria-label="Controles del visor">
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
          <button
            type="button"
            aria-label="Alejar imagen"
            disabled={level <= 0}
            onClick={() => setLevel(level - 1)}
          >
            −
          </button>
          <span className="viewer-zoom" role="status" aria-live="polite">
            {Math.round(zoom * 100)} % de zoom
          </span>
          <button
            type="button"
            aria-label="Acercar imagen"
            disabled={level >= ZOOM_LEVELS.length - 1}
            onClick={() => setLevel(level + 1)}
          >
            +
          </button>
        </div>
        <p className="viewer-hint">
          Usa +, − y 0 para el zoom, las flechas para cambiar de imagen y Escape
          para cerrar.
        </p>
      </div>
    </div>
  );
}
