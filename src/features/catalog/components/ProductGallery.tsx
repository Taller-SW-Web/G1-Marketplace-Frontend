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
      <div className="gallery-main">
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
            src={item.url}
            alt={item.alt}
            width="600"
            height="400"
            onError={() => markFailed(item.mediaId)}
          />
        )}
      </div>

      <div className="gallery-toolbar">
        <button
          type="button"
          className="gallery-zoom"
          aria-label="Ampliar imagen"
          onClick={() => onOpenViewer(selectedIndex)}
        >
          Ampliar imagen
        </button>
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

      <ul className="gallery-thumbs">
        {media.map((mediaItem, index) => {
          const thumbFailed = current.failed.has(mediaItem.mediaId);
          return (
            <li key={mediaItem.mediaId}>
              <button
                type="button"
                className="gallery-thumb"
                aria-pressed={index === selectedIndex}
                aria-label={
                  thumbFailed
                    ? `Imagen ${index + 1} de ${total}, no disponible`
                    : `Imagen ${index + 1} de ${total}`
                }
                onClick={() => selectIndex(index)}
              >
                {thumbFailed ? (
                  <span className="thumb-fallback">Imagen no disponible</span>
                ) : (
                  <img
                    src={mediaItem.url}
                    alt=""
                    width="72"
                    height="48"
                    loading="lazy"
                    onError={() => markFailed(mediaItem.mediaId)}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
