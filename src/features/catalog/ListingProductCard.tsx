"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AddedToCartFeedback } from "@/features/cart/AddedToCartFeedback";
import { useAddCartItem } from "@/features/cart/useAddCartItem";
import { FavoriteControl } from "@/features/wishlist/FavoriteControl";
import { Button } from "@/shared/ui/Button";
import { CardPrice } from "./components/CardPrice";
import { useProductPrice } from "./hooks/useProductPrice";
import { fetchProductAvailability } from "./services/product-availability.service";
import type { ProductCardDTO } from "./types";
import "./listing-product-card.css";

export function ListingProductCard({ product, href, categoryName }: {
  product: ProductCardDTO;
  href: string;
  categoryName?: string;
}) {
  const card = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [available, setAvailable] = useState<{ slug: string; productId: string; sku: string } | null>(null);
  const { slug, productId, name, image } = product;
  const { state: priceState } = useProductPrice(nearViewport ? slug : "", undefined, false);
  const priced = (priceState.kind === "regular" || priceState.kind === "sale") && priceState.data.productId === productId
    ? priceState.data : null;
  const sku = priced?.sku;
  const canAdd = sku && available?.slug === slug && available.productId === productId && available.sku === sku;
  const { isBusy, lastResult, feedbackOpen, addItem, closeFeedback } = useAddCartItem({
    useMock: false,
    onError: (result) => {
      if (result.code === "SKU_NOT_AVAILABLE" || result.code === "STOCK_LIMIT_REACHED") setAvailable(null);
    },
  });

  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sku) return;
    const abort = new AbortController();
    // The SKU-less lookup also requires the BFF to resolve inventory without selecting a variant.
    void fetchProductAvailability(slug, undefined, abort.signal).then(({ data }) => {
      if (abort.signal.aborted) return;
      const sellable = data.productId === productId && data.sku === sku &&
        (data.availability === "AVAILABLE" || data.availability === "STOCK_LOW");
      setAvailable(sellable ? { slug, productId, sku } : null);
    }).catch(() => {
      if (!abort.signal.aborted) setAvailable(null);
    });
    return () => abort.abort();
  }, [productId, sku, slug]);

  return <article ref={card} className="product-card product-card--listing">
    <Link href={href} className="product-card-link">
      <div className="product-image">
        <img src={image?.url ?? "/images/product-placeholder.svg"}
          alt={image?.alt ?? `Imagen no disponible para ${name}`} width="280" height="187" loading="lazy" />
      </div>
      <div className="product-info">
        <p className="product-category">{categoryName ?? "Catálogo"}</p>
        <h2>{name}</h2>
      </div>
    </Link>
    <div className="listing-card-favorite"><FavoriteControl productId={productId} /></div>
    <div className="listing-card-commerce">
      {priced ? <CardPrice price={priced.price} className="listing-card-price" />
        : <p className="listing-card-price">{!nearViewport || priceState.kind === "loading" ? "Consultando precio…" : "Precio por confirmar"}</p>}
      {canAdd ? (
        <Button variant="secondary" size="sm" className="listing-card-action" loading={isBusy}
          loadingLabel="Agregando al carrito…" preserveFocusWhileLoading
          onClick={() => void addItem({ productId, sku, quantity: 1 })}>Agregar al carrito</Button>
      ) : <Link href={href} className="button button--secondary button--sm listing-card-action"
        aria-label={`Ver opciones de ${name}`}>Ver opciones</Link>}
      {lastResult && !lastResult.success && <p className="listing-card-error" role="alert">
        {lastResult.code === "SKU_NOT_AVAILABLE" || lastResult.code === "STOCK_LIMIT_REACHED"
          ? "La disponibilidad cambió. Consulta la ficha del producto."
          : "No pudimos confirmar que el producto se agregó. Revisa tu carrito."}
      </p>}
    </div>
    <AddedToCartFeedback result={lastResult} opened={feedbackOpen} onClose={closeFeedback}
      onContinue={closeFeedback} onViewCart={() => { window.location.assign("/carrito"); }} />
  </article>;
}
