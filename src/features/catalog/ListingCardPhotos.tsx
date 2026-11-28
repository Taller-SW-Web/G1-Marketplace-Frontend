"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { getProductDetail } from "./services/product-detail.adapter";
import type { ProductCardDTO } from "./types";

type Photo = NonNullable<ProductCardDTO["image"]>;
const PLACEHOLDER = "/images/product-placeholder.svg";
const cache = new Map<string, { photos: Promise<Photo[]>; expiresAt: number }>();

function loadPhotos({ slug, productId }: ProductCardDTO) {
  const key = JSON.stringify([slug, productId]);
  const now = Date.now();
  const saved = cache.get(key);
  if (saved && saved.expiresAt > now) return saved.photos;

  cache.delete(key);
  const photos = getProductDetail(slug, AbortSignal.timeout(8_000))
    .then(({ data }) => data.productId === productId
      ? [...data.media].sort((a, b) => a.displayOrder - b.displayOrder)
      : []);
  const entry = { photos, expiresAt: now + 120_000 };
  cache.set(key, entry);
  if (cache.size > 96) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  void photos.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return photos;
}

function visiblePhotos(cover: Photo | null, additional: Photo[], failed: ReadonlySet<string>) {
  return [...new Map([...(cover ? [cover] : []), ...additional]
    .filter(photo => !failed.has(photo.url))
    .map(photo => [photo.url, photo])).values()];
}

function photoAt(fraction: number, count: number) {
  return Math.max(0, Math.min(count - 1, Math.floor(fraction * count)));
}

export function ListingCardPhotos({ product, href, children }: {
  product: ProductCardDTO;
  href: string;
  children: ReactNode;
}) {
  const [details, setDetails] = useState<Photo[]>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const detailsLink = useRef<HTMLAnchorElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  const focusAfterLoading = useRef(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const pending = useRef(false);
  const cursorPosition = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const cover = product.image;
  const photos = visiblePhotos(cover, details ?? [], failed);
  const active = Math.min(selected, Math.max(photos.length - 1, 0));
  const photo = photos[active];

  useEffect(() => {
    if (details === undefined || !focusAfterLoading.current) return;
    focusAfterLoading.current = false;
    const target = dots.current?.querySelector<HTMLButtonElement>("button") ?? detailsLink.current;
    target?.focus({ preventScroll: true });
  }, [details]);

  function requestPhotos() {
    if (details || pending.current) return;
    pending.current = true;
    setLoading(true);
    void loadPhotos(product).then(found => {
      setDetails(found);
      if (cursorPosition.current !== null) {
        setSelected(photoAt(cursorPosition.current, visiblePhotos(cover, found, failed).length));
      }
    }).catch(() => undefined).finally(() => {
      pending.current = false;
      setLoading(false);
    });
  }

  return (
    <div className="listing-card-content">
      <Link href={href} prefetch={false} ref={detailsLink} className="product-card-link"
        onFocus={event => {
          if (event.currentTarget.matches(":focus-visible")) requestPhotos();
        }}
        onKeyDown={event => {
          if (photos.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          const step = event.key === "ArrowLeft" ? -1 : 1;
          setSelected(Math.max(0, Math.min(active + step, photos.length - 1)));
        }}>
        <div className="product-image"
          onPointerEnter={event => {
            if (event.pointerType !== "mouse") return;
            hoverTimer.current = window.setTimeout(requestPhotos, 160);
          }}
          onPointerMove={event => {
            if (event.pointerType !== "mouse") return;
            const area = event.currentTarget.getBoundingClientRect();
            const fraction = (event.clientX - area.left) / area.width;
            cursorPosition.current = fraction;
            setSelected(photoAt(fraction, photos.length));
          }}
          onPointerLeave={event => {
            if (event.pointerType !== "mouse") return;
            window.clearTimeout(hoverTimer.current);
            cursorPosition.current = null;
            setSelected(0);
          }}>
          <img
            src={photo?.url ?? PLACEHOLDER}
            alt={photo?.alt ?? `Imagen no disponible para ${product.name}`}
            loading="lazy"
            width="280"
            height="187"
            onError={() => { if (photo) setFailed(previous => new Set(previous).add(photo.url)); }}
          />
          <span className="listing-image-detail" aria-hidden="true">
            Ver detalle <span>↗</span>
          </span>
        </div>
        {children}
      </Link>
      {photos.length > 1 && (
        <div ref={dots} className="listing-photo-dots" role="group" aria-label={`Fotos de ${product.name}`}>
          {photos.map((item, index) => (
            <button key={item.url} type="button" aria-pressed={active === index}
              aria-label={`Ver foto ${index + 1} de ${photos.length}`} onClick={() => setSelected(index)} />
          ))}
        </div>
      )}
      {details === undefined && (
        <button type="button" className="listing-photo-discover" onClick={event => {
          if (loading) return;
          focusAfterLoading.current = event.currentTarget === document.activeElement;
          requestPhotos();
        }}
          onBlur={() => { focusAfterLoading.current = false; }}
          aria-label={`Buscar más fotos de ${product.name}`} aria-disabled={loading}>
          {loading ? "Cargando…" : "Fotos"}
        </button>
      )}
    </div>
  );
}
