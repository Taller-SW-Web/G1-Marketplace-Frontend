"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { ReactNode } from "react";
import type { FavoriteProduct } from "./contract";
import type { ItemOperation } from "./FavoritesController";
import { FavoritesHeading } from "./FavoritesHeading";
export type { FavoriteProduct } from "./contract";

export function FavoritesList({ products, onRemove, removingProductId, returnPath = "/favoritos", showAssurances = false,
  pending = {}, feedback }: {
  products: FavoriteProduct[];
  onRemove?: (product: FavoriteProduct) => void;
  removingProductId?: string;
  returnPath?: string;
  showAssurances?: boolean;
  pending?: Record<string, ItemOperation>;
  feedback?: ReactNode;
}) {
  const available = products.filter(product => product.availability === "in_stock");
  const unavailable = products.filter(product => product.availability === "out_of_stock");
  const retired = products.filter(product => product.availability === "unavailable");
  const confirmingRemoval = Object.values(pending).some(value => value === "removing" || value === "remove-uncertain");

  function cards(items: FavoriteProduct[]) {
    return <ul className="favorites-grid">{items.map(product => {
      const outOfStock = product.availability !== "in_stock";
      const operation = Object.hasOwn(pending, product.productId) ? pending[product.productId] : undefined;
      const busy = !!operation || removingProductId === product.productId;
      const content = <>
          <div className="favorites-card-image">
            {product.image ? <img src={product.image.url} alt={product.image.alt} width="154" height="144" loading="lazy" />
              : <span className="favorites-image-placeholder">Imagen no disponible</span>}
          </div>
          <div className="favorites-card-info">
            {(product.brandLabel || product.categoryLabel) && <p className="favorites-card-category">{product.brandLabel || product.categoryLabel}</p>}
            <h3 tabIndex={-1}>{product.name}</h3>
            {product.color && <p className="favorites-card-variant">{product.color}</p>}
            {product.description && <p className="favorites-card-description">{product.description}</p>}
          </div>
        </>;
      return <li key={product.productId}><article data-favorite-id={product.productId}
        className={`favorites-card${outOfStock ? " favorites-card--unavailable" : ""}`}>
        {product.slug && product.availability !== "unavailable" ? <Link className="favorites-card-link" href={`/productos/${encodeURIComponent(product.slug)}?returnTo=${encodeURIComponent(returnPath)}`}>{content}</Link>
          : <div className="favorites-card-link">{content}</div>}
        <img className="favorites-card-heart" src="/figma/favorite-heart-19.svg" width="19" height="19" alt="" aria-hidden="true" />
        {product.price && <p className="favorites-card-price">{new Intl.NumberFormat("es-PE", {
          style: "currency", currency: product.price.currency,
        }).format(product.price.amount)}</p>}
        <div className="favorites-stock-block"><p className="favorites-stock">{product.availability === "unavailable" ? "Producto no disponible" : outOfStock ? "Sin existencias" : "Disponible"}</p></div>
        <Button variant="tertiary" className="favorites-remove" disabled={!onRemove || busy}
          title={!onRemove ? "Próximamente" : undefined} loading={removingProductId === product.productId}
          aria-label={`Eliminar de favoritos: ${product.name}`} onClick={() => onRemove?.(product)}>
          <span className="favorites-remove-label">Eliminar de favoritos</span>
          <img className="favorites-remove-icon" src="/figma/favorite-trash-17.svg" width="17" height="17" alt="" />
          <span className="favorites-remove-short">Quitar</span>
        </Button>
      </article></li>;
    })}</ul>;
  }

  return <div className="favorites-list">
    <FavoritesHeading count={products.length + Object.values(pending).filter(value => value === "removing" || value === "remove-uncertain").length}
      description={products.length || confirmingRemoval ? "Guarda los productos que te gustan y encuéntralos aquí." : "Aquí aparecerán los productos que marques con el corazón."} />
    {feedback}
    {!products.length && confirmingRemoval ? <p role="status">Confirmando la eliminación. Tu lista se actualizará al recibir el resultado.</p> : !products.length ? <EmptyState className="favorites-empty" title="Aún no tienes favoritos"
      description="Explora el catálogo y guarda zapatillas, ropa o accesorios para encontrarlos fácilmente después."
      icon={<img src="/figma/favorite-heart-32.svg" width="32" height="32" alt="" />}
      actions={<Link href="/catalogo" className="button">Explorar productos</Link>} /> : <>
      <section aria-labelledby="favorites-available-title">
        <h2 id="favorites-available-title" className={unavailable.length || retired.length ? "favorites-section-title" : "sr-only"}>Disponibles ({available.length})</h2>
        {available.length ? cards(available) : <p className="favorites-no-stock">Por ahora, tus productos favoritos están sin existencias.</p>}
      </section>
      {unavailable.length > 0 && <section className="favorites-unavailable" aria-labelledby="favorites-unavailable-title">
        <h2 id="favorites-unavailable-title" className="favorites-section-title">Sin existencias ({unavailable.length})</h2>
        <p>Los conservamos en tus favoritos para que puedas volver a consultarlos.</p>
        {cards(unavailable)}
      </section>}
      {retired.length > 0 && <section className="favorites-unavailable" aria-labelledby="favorites-retired-title">
        <h2 id="favorites-retired-title" className="favorites-section-title">Productos no disponibles ({retired.length})</h2>
        <p>Estos productos ya no están activos. Puedes conservarlos en tu lista o quitarlos.</p>
        {cards(retired)}
      </section>}
      {showAssurances && <div className="favorites-assurances">
        <span><img src="/figma/favorite-truck.svg" width="15" height="15" alt="" />Envío gratis desde S/ 299</span>
        <span><img src="/figma/favorite-refresh.svg" width="15" height="15" alt="" />Cambios hasta 30 días</span>
        <span><img src="/figma/favorite-shield.svg" width="15" height="15" alt="" />Compra 100% segura</span>
      </div>}
    </>}
  </div>;
}
