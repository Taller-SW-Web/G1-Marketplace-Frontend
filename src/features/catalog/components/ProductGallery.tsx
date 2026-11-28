"use client";
import { useState } from "react";
import type { ProductMediaDTO } from "../types/product-detail.types";

interface Props {
  media: ProductMediaDTO[];
  onOpenViewer: (index: number) => void;
}

type Selection = {
  media: ProductMediaDTO[];
  index: number;
  failed: ReadonlySet<string>;
};

const NO_FAILURES: ReadonlySet<string> = new Set();

/**
 * Galería principal de la ficha (F-011): controles finitos, sin carrusel
 * infinito. No muestra precio, stock ni variantes.
 */
export function ProductGallery({ media, onOpenViewer }: Props) {
  const [selection, setSelection] = useState<Selection>(() => ({
    media,
    index: 0,
    failed: NO_FAILURES,
  }));

  // Un conjunto de medios distinto reinicia índice y respaldos (reset al
  // cambiar de producto) sin necesidad de efectos.
  const current: Selection =
    selection.media === media
      ? selection
      : { media, index: 0, failed: NO_FAILURES };

  if (!media.length) return null;

  const total = media.length;
  const selectedIndex = Math.min(current.index, total - 1);
  const item = media[selectedIndex];
  const isFailed = current.failed.has(item.mediaId);
  const selectIndex = (index: number) =>
    setSelection({ media, index, failed: current.failed });
  const markFailed = (mediaId: string) => {
    if (current.failed.has(mediaId)) return;
    const next = new Set(current.failed);
    next.add(mediaId);
    setSelection({ media, index: selectedIndex, failed: next });
  };

  return (
    <section className="product-gallery" aria-label="Galería del producto">
      <button type="button" className="gallery-main" aria-label="Ampliar imagen"
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          onOpenViewer(selectedIndex);
        }}>
        {isFailed ? (
          <div
            className="gallery-fallback"
            role="img"
            aria-label={`${item.alt} — imagen no disponible`}
          >
            <span>Imagen no disponible</span>
          </div>
        ) : (
          <img
            key={item.mediaId}
            src={item.url}
            alt={item.alt}
            width="600"
            height="400"
            fetchPriority="high"
            onError={() => markFailed(item.mediaId)}
          />
        )}
        <span className="gallery-expand-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6M20 4l-6 6M10 20H4v-6M4 20l6-6" />
          </svg>
        </span>
      </button>

      {total > 1 && (
        <GalleryThumbnails media={media} selectedIndex={selectedIndex} failed={current.failed}
          onSelect={selectIndex} onError={markFailed} />
      )}

      <div className="gallery-toolbar">
        <span className="gallery-position" role="status">
          Imagen {selectedIndex + 1} de {total}
        </span>
        <button
          type="button"
          className="gallery-step"
          aria-label="Imagen anterior"
          disabled={selectedIndex === 0}
          onClick={() => selectIndex(Math.max(0, selectedIndex - 1))}
        >
          Anterior
        </button>
        <button
          type="button"
          className="gallery-step"
          aria-label="Imagen siguiente"
          disabled={selectedIndex >= total - 1}
          onClick={() => selectIndex(Math.min(total - 1, selectedIndex + 1))}
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}

export function GalleryThumbnails({ media, selectedIndex, failed, onSelect, onError }: {
  media: ProductMediaDTO[];
  selectedIndex: number;
  failed: ReadonlySet<string>;
  onSelect: (index: number) => void;
  onError: (mediaId: string) => void;
}) {
  return (
    <ul className="gallery-thumbs" aria-label="Miniaturas del producto">
      {media.map((item, index) => {
        const unavailable = failed.has(item.mediaId);
        return (
          <li key={item.mediaId}>
            <button type="button" className="gallery-thumb" aria-pressed={index === selectedIndex}
              aria-label={`Imagen ${index + 1} de ${media.length}${unavailable ? ", no disponible" : ""}`}
              onClick={() => onSelect(index)}>
              {unavailable ? <span className="thumb-fallback">Imagen no disponible</span> : (
                <img src={item.url} alt="" width="72" height="48" loading="lazy"
                  onError={() => onError(item.mediaId)} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
