import Link from "next/link";
import type { ProductCardDTO } from "./types";
import { FavoriteControl } from "@/features/wishlist/FavoriteControl";
import { useProductPrice } from "./hooks/useProductPrice";
import { ListingProductCard } from "./ListingProductCard";
import { CardPrice } from "./components/CardPrice";

function FeaturedPrice({ product }: { product: ProductCardDTO }) {
  const { state } = useProductPrice(product.slug, undefined, false);
  if (state.kind === "loading") return <p className="h5-featured-price" role="status">Consultando precio…</p>;
  if ((state.kind !== "regular" && state.kind !== "sale") || state.data.productId !== product.productId) {
    return <p className="h5-featured-price">Precio por confirmar</p>;
  }
  return <CardPrice price={state.data.price} className="h5-featured-price" />;
}

export function ProductCard({
  product,
  returnPath,
  featured,
  categoryName,
}: {
  product: ProductCardDTO;
  returnPath: string;
  featured?: { categoryName?: string };
  categoryName?: string;
}) {
  const href = `/productos/${encodeURIComponent(product.slug)}?returnTo=${encodeURIComponent(returnPath)}`;
  if (featured) return (
    <article className="product-card product-card--featured">
      <div className="product-image">
        <img src={product.image?.url ?? "/images/product-placeholder.svg"}
          alt={product.image?.alt ?? `Imagen no disponible para ${product.name}`} loading="lazy" width="280" height="164" />
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
  return <ListingProductCard product={product} href={href} categoryName={categoryName} />;
}
