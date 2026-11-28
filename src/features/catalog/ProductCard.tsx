import Link from "next/link";
import type { ProductCardDTO } from "./types";
import { FavoriteControl } from "@/features/wishlist/FavoriteControl";
export function ProductCard({
  product,
  returnPath,
  listing,
}: {
  product: ProductCardDTO;
  returnPath: string;
  listing?: { brand?: string };
}) {
  return (
    <article className="product-card">
      <Link
        href={`/productos/${encodeURIComponent(product.slug)}?returnTo=${encodeURIComponent(returnPath)}`}
        className="product-card-link"
      >
        <div className="product-image">
          <img
            src={product.image?.url ?? "/images/product-placeholder.svg"}
            alt={product.image?.alt ?? `Imagen no disponible para ${product.name}`}
            loading="lazy"
            width="280"
            height="187"
          />
        </div>
        <div className="product-info">
          {listing ? (listing.brand && <p className="product-category">{listing.brand}</p>) : <p className="product-category">Catálogo</p>}
          <h2>{product.name}</h2>
          {listing && <p className="commerce-badge commerce-badge--pending">Precio por confirmar</p>}
          <span className="product-detail-label">
            Ver producto <span aria-hidden="true">↗</span>
          </span>
        </div>
      </Link>
      <FavoriteControl productId={product.productId} compact={Boolean(listing)} />
    </article>
  );
}
