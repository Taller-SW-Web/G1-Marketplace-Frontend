"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
const CENTER = { x: 0.5, y: 0.5 };

function pointerPosition(viewport: HTMLDivElement, { clientX, clientY }: MouseEvent) {
  const bounds = viewport.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return CENTER;
  return {
    x: Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)),
  };
}

function panPhoto(viewport: HTMLDivElement, position: typeof CENTER) {
  const image = viewport.querySelector("img");
  if (!image?.naturalWidth || !image.naturalHeight) return;

  // object-fit centra la foto dentro de la caja ampliada. Limita el recorrido
  // a la foto para que una imagen vertical no se pierda en los márgenes.
  const ratio = image.naturalWidth / image.naturalHeight;
  const photoWidth = Math.min(image.clientWidth, image.clientHeight * ratio);
  const photoHeight = Math.min(image.clientHeight, image.clientWidth / ratio);
  const extraWidth = Math.max(0, photoWidth - viewport.clientWidth);
  const extraHeight = Math.max(0, photoHeight - viewport.clientHeight);
  viewport.scrollLeft = (image.clientWidth - viewport.clientWidth - extraWidth) / 2 + position.x * extraWidth;
  viewport.scrollTop = (image.clientHeight - viewport.clientHeight - extraHeight) / 2 + position.y * extraHeight;
}

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
  const panPosition = useRef(CENTER);
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
    panPosition.current = CENTER;
    setZoomState({ index: next, level: 0 });
    onIndexChange(next);
  }, [index, onIndexChange]);

  const close = useCallback(() => {
    panPosition.current = CENTER;
    setZoomState({ index, level: 0 });
    onClose();
  }, [index, onClose]);

  useEffect(() => {
    const viewport = mediaRef.current;
    if (!opened || !viewport) return;
    let lastZoom = -Infinity;
    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      if (event.timeStamp - lastZoom < 100) return;
      lastZoom = event.timeStamp;
      panPosition.current = pointerPosition(viewport, event);
      changeZoom(event.deltaY < 0 ? 1 : -1);
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [opened, changeZoom, current?.mediaId]);

  useLayoutEffect(() => {
    const viewport = mediaRef.current;
    if (opened && zoom > 1 && viewport) panPhoto(viewport, panPosition.current);
  }, [opened, zoom]);

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
          <div className="viewer-header-actions">
            <div className="viewer-controls" role="group" aria-label="Zoom de la imagen">
              <button type="button" aria-label="Alejar imagen" disabled={level <= 0} onClick={() => changeZoom(-1)}>−</button>
              <span className="sr-only" role="status" aria-live="polite">{Math.round(zoom * 100)} % de zoom</span>
              <button type="button" aria-label="Acercar imagen" disabled={level >= ZOOM_LEVELS.length - 1} onClick={() => changeZoom(1)}>+</button>
            </div>
            <button type="button" className="viewer-close" aria-label="Cerrar visor" ref={closeRef} onClick={close}>Cerrar</button>
          </div>
        </div>

        <div className="viewer-gallery">
          <div className="viewer-stage" onPointerMove={event => {
            const viewport = mediaRef.current;
            if (event.pointerType !== "mouse" || !viewport) return;
            panPosition.current = pointerPosition(viewport, event.nativeEvent);
            if (zoom > 1) panPhoto(viewport, panPosition.current);
          }}>
            <div className="viewer-media" data-zoom={zoom} key={current.mediaId} ref={mediaRef}
              role="region" aria-label="Foto ampliada" tabIndex={zoom > 1 ? 0 : undefined}>
              {failed.has(current.mediaId) ? (
                <div className="gallery-fallback" role="img" aria-label={`${current.alt} — imagen no disponible`}>
                  <span>Imagen no disponible</span>
                </div>
              ) : (
                <img src={current.url} alt={current.alt} width="960" height="640" draggable={false}
                  style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
                  onLoad={() => {
                    if (zoom > 1 && mediaRef.current) panPhoto(mediaRef.current, panPosition.current);
                  }}
                  onError={() => markFailed(current.mediaId)} />
              )}
            </div>
            {total > 1 && (
              <>
                <button type="button" className="viewer-nav viewer-nav--previous" aria-label="Imagen anterior"
                  disabled={index <= 0} onClick={() => selectPhoto(index - 1)}>‹</button>
                <button type="button" className="viewer-nav viewer-nav--next" aria-label="Imagen siguiente"
                  disabled={index >= total - 1} onClick={() => selectPhoto(index + 1)}>›</button>
              </>
            )}
          </div>
          {total > 1 && (
            <GalleryThumbnails media={media} selectedIndex={index} failed={failed}
              onSelect={selectPhoto} onError={markFailed} />
          )}
        </div>

      </div>
    </div>
  );
}
