"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AddedToCartFeedback } from "@/features/cart/AddedToCartFeedback";
import { useAddCartItem } from "@/features/cart/useAddCartItem";
import { Button } from "@/shared/ui/Button";
import { FavoriteControl } from "@/features/wishlist/FavoriteControl";
import { useListingPrice } from "./hooks/useListingPrice";
import { ListingCardPhotos } from "./ListingCardPhotos";
import { ListingPrice } from "./ListingPrice";
import type { ProductCardDTO } from "./types";
import "./product-card.css";

export function ProductCard({
  product, returnPath, listing,
}: {
  product: ProductCardDTO;
  returnPath: string;
  listing?: { brand?: string };
}) {
  const href = `/productos/${encodeURIComponent(product.slug)}?returnTo=${encodeURIComponent(returnPath)}`;
  if (listing) return <ListingCard product={product} href={href} brand={listing.brand} />;

  return (
    <article className="product-card">
      <CardLink product={product} href={href} brand="Catálogo">
        <span className="product-detail-label">
          Ver producto <span aria-hidden="true">↗</span>
        </span>
      </CardLink>
      <FavoriteControl productId={product.productId} />
    </article>
  );
}

function ListingCard({ product, href, brand }: { product: ProductCardDTO; href: string; brand?: string }) {
  const { ref, state } = useListingPrice(product.slug, product.productId);
  const sku = state.kind === "ready" ? state.onlySku : undefined;
  const { isBusy, lastResult, feedbackOpen, addItem, closeFeedback } = useAddCartItem({ useMock: false });

  return (
    <>
      <article className="product-card product-card--listing">
        <CardLink product={product} href={href} brand={brand} previewPhotos>
          <ListingPrice priceRef={ref} state={state} />
        </CardLink>
        <div className="listing-card-actions">
          {sku ? (
            <Button className="listing-card-primary" loading={isBusy} loadingLabel="Agregando al carrito…"
              onClick={() => void addItem({ productId: product.productId, sku, quantity: 1 }, { name: product.name, imageUrl: product.image?.url })}>
              Agregar al carrito
            </Button>
          ) : (
            <Link href={href} prefetch={false} className="button button--primary listing-card-primary">Elegir opciones</Link>
          )}
          <FavoriteControl productId={product.productId} compact />
          {!isBusy && lastResult && !lastResult.success && (
            <p className="listing-cart-error" role="alert">{lastResult.message || "No pudimos agregar el producto al carrito."}</p>
          )}
        </div>
      </article>
      <AddedToCartFeedback result={lastResult} opened={feedbackOpen} cartHref="/carrito"
        onContinue={closeFeedback} onClose={closeFeedback} />
    </>
  );
}

function CardLink({ product, href, brand, children, previewPhotos }: {
  product: ProductCardDTO;
  href: string;
  brand?: string;
  children: ReactNode;
  previewPhotos?: boolean;
}) {
  const info = (
    <div className="product-info">
      {brand && <p className="product-category">{brand}</p>}
      <h2>{product.name}</h2>
      {children}
    </div>
  );
  if (previewPhotos) {
    return <ListingCardPhotos key={product.slug} product={product} href={href}>{info}</ListingCardPhotos>;
  }

  return (
    <Link href={href} className="product-card-link">
      <div className="product-image">
        <img
          src={product.image?.url ?? "/images/product-placeholder.svg"}
          alt={product.image?.alt ?? `Imagen no disponible para ${product.name}`}
          loading="lazy"
          width="280"
          height="187"
        />
      </div>
      {info}
    </Link>
  );
}
