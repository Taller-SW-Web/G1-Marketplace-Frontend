"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductMediaDTO } from "../types/product-detail.types";
import { GalleryThumbnails } from "./ProductGallery";

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
  const mediaRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  // El nivel de zoom guardado sólo vale para su índice (sin efectos de reset).
  const [zoomState, setZoomState] = useState({ index, level: 0 });
  const level = zoomState.index === index ? zoomState.level : 0;
  const zoom = ZOOM_LEVELS[level];
  const total = media.length;
  const current = media[Math.min(Math.max(index, 0), Math.max(total - 1, 0))];

  const changeZoom = useCallback((step: number) => {
    setZoomState((previous) => {
      const level = previous.index === index ? previous.level : 0;
      return { index, level: Math.max(0, Math.min(level + step, ZOOM_LEVELS.length - 1)) };
    });
  }, [index]);

  const selectPhoto = useCallback((next: number) => {
    if (next === index) return;
    setZoomState({ index: next, level: 0 });
    onIndexChange(next);
  }, [index, onIndexChange]);

  const close = useCallback(() => {
    setZoomState({ index, level: 0 });
    onClose();
  }, [index, onClose]);

  useEffect(() => {
    const image = mediaRef.current;
    if (!opened || !image) return;
    let lastZoom = -Infinity;
    function onWheel(event: WheelEvent) {
      if (!event.deltaY || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      if (event.timeStamp - lastZoom < 100) return;
      lastZoom = event.timeStamp;
      changeZoom(event.deltaY < 0 ? 1 : -1);
    }
    image.addEventListener("wheel", onWheel, { passive: false });
    return () => image.removeEventListener("wheel", onWheel);
  }, [opened, changeZoom, current?.mediaId]);

  function markFailed(mediaId: string) {
    setFailed((previous) => previous.has(mediaId) ? previous : new Set(previous).add(mediaId));
  }

  // Al abrir: guardar el foco previo y enfocar Cerrar. Al cerrar: restaurarlo.
  useEffect(() => {
    if (!opened) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
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
          changeZoom(1);
          return;
        }
        if (event.key === "-" || event.key === "_") {
          event.preventDefault();
          changeZoom(-1);
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          setZoomState({ index, level: 0 });
          return;
        }
        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          selectPhoto(index - 1);
          return;
        }
        if (event.key === "ArrowRight" && index < total - 1) {
          event.preventDefault();
          selectPhoto(index + 1);
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
  }, [opened, close, selectPhoto, index, total, changeZoom]);

  if (!opened || !current) return null;

  return (
    <div
      className="viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
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
            onClick={close}
          >
            Cerrar
          </button>
        </div>

        <div className="viewer-gallery">
          <div className="viewer-media" data-zoom={zoom} key={current.mediaId} ref={mediaRef}
            role="region" aria-label="Foto ampliada" tabIndex={zoom > 1 ? 0 : undefined}>
            {failed.has(current.mediaId) ? (
              <div className="gallery-fallback" role="img" aria-label={`${current.alt} — imagen no disponible`}>
                <span>Imagen no disponible</span>
              </div>
            ) : (
              <img src={current.url} alt={current.alt} width="960" height="640"
                style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
                onError={() => markFailed(current.mediaId)} />
            )}
          </div>
          {total > 1 && (
            <GalleryThumbnails media={media} selectedIndex={index} failed={failed}
              onSelect={selectPhoto} onError={markFailed} />
          )}
        </div>

        <div className="viewer-controls" role="group" aria-label="Controles del visor">
          <button
            type="button"
            aria-label="Imagen anterior"
            disabled={index <= 0}
            onClick={() => selectPhoto(index - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            disabled={index >= total - 1}
            onClick={() => selectPhoto(index + 1)}
          >
            Siguiente
          </button>
          <button
            type="button"
            aria-label="Alejar imagen"
            disabled={level <= 0}
            onClick={() => changeZoom(-1)}
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
            onClick={() => changeZoom(1)}
          >
            +
          </button>
        </div>
        <p className="viewer-hint">
          Usa la rueda sobre la foto o +, − y 0 para el zoom. Usa las flechas para cambiar de imagen y Escape para cerrar.
        </p>
      </div>
    </div>
  );
}
