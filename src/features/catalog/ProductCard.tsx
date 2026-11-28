import Link from "next/link";
import type { ProductCardDTO } from "./types";
import { FavoriteControl } from "@/features/wishlist/FavoriteControl";
import { useProductPrice } from "./hooks/useProductPrice";
import { formatMoney } from "./money";

function FeaturedPrice({ product }: { product: ProductCardDTO }) {
  const { state } = useProductPrice(product.slug, undefined, false);
  if (state.kind === "loading") return <p className="h5-featured-price" role="status">Consultando precio…</p>;
  if ((state.kind !== "regular" && state.kind !== "sale") || state.data.productId !== product.productId) {
    return <p className="h5-featured-price">Precio por confirmar</p>;
  }
  const { currency, regularAmount, saleAmount } = state.data.price;
  return <p className="h5-featured-price">
    <span><span className="sr-only">Precio actual: </span>{formatMoney(saleAmount ?? regularAmount, currency)}</span>
    {saleAmount !== null && <s><span className="sr-only">Precio regular: </span>{formatMoney(regularAmount, currency)}</s>}
  </p>;
}

export function ProductCard({
  product,
  returnPath,
  featured,
}: {
  product: ProductCardDTO;
  returnPath: string;
  featured?: { categoryName?: string };
}) {
  const href = `/productos/${encodeURIComponent(product.slug)}?returnTo=${encodeURIComponent(returnPath)}`;
  if (featured) return (
    <article className="product-card product-card--featured">
      <div className="product-image">
        {product.image ? <img src={product.image.url} alt={product.image.alt} loading="lazy" width="280" height="164" />
          : <span className="h5-featured-placeholder">Sin imagen</span>}
      </div>
      <div className="product-info">
        <div className="h5-featured-meta">
          <p className="product-category">{featured.categoryName ?? "Catálogo"}</p>
          <FavoriteControl productId={product.productId} />
        </div>
        <h3>{product.name}</h3>
        <FeaturedPrice product={product} />
        <Link href={href} className="button button--secondary h5-featured-action"
          aria-label={`Ver opciones de ${product.name}`}>Ver opciones</Link>
      </div>
    </article>
  );
  return (
    <article className="product-card">
      <Link
        href={href}
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
          <p className="product-category">Catálogo</p>
          <h2>{product.name}</h2>
          <span className="product-detail-label">
            Ver producto <span aria-hidden="true">↗</span>
          </span>
        </div>
      </Link>
      <FavoriteControl productId={product.productId} />
    </article>
  );
}
