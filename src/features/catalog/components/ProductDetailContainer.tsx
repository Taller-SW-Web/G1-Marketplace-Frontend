"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";
import { useProductDetail } from "../hooks/useProductDetail";
import { sanitizeCatalogReturnTo, sanitizeReturnTo } from "../returnTo";
import { GalleryViewer } from "./GalleryViewer";
import { ProductGallery } from "./ProductGallery";
import { TechnicalSpecifications } from "./TechnicalSpecifications";

interface Props {
  slug: string;
  /** Ruta de contexto del handoff ProductCard (`?returnTo=...`); se valida
   * como InternalPath antes de usarse (ELEMENTOS-COMPARTIDOS §4). */
  returnTo?: string;
}

/**
 * Ficha de producto F-011 (corte H3 MOCK). Región descriptiva únicamente:
 * sin precio, stock, variantes ni controles de carrito no disponibles (UI-F011-09).
 */
export function ProductDetailContainer({ slug, returnTo }: Props) {
  // Retorno validado: ruta interna o /catalogo por defecto (F-011 UI §97).
  const backHref = sanitizeReturnTo(returnTo);
  // Migra "Catálogo": criterios previos si existen, si no general (V-007).
  const catalogCrumbHref = sanitizeCatalogReturnTo(returnTo);
  const { state, retry } = useProductDetail(slug);
  // El visor se resetea al cambiar de slug (spec de componentes §5) sin
  // recurrir a efectos: el estado guardado sólo vale para su slug.
  const [viewerState, setViewerState] = useState<{
    slug: string;
    open: boolean;
    index: number;
  }>({ slug, open: false, index: 0 });
  const viewer =
    viewerState.slug === slug
      ? viewerState
      : { slug, open: false, index: 0 };

  if (state.kind === "loading") {
    return (
      <div className="container product-page detail-skeleton" aria-busy="true">
        <LoadingState label="Cargando la ficha del producto" className="detail-skeleton-grid">
          <Skeleton className="skeleton-image" />
          <div className="detail-skeleton-copy">
            <Skeleton variant="line" className="skeleton-line short" />
            <Skeleton variant="line" className="skeleton-line" />
            <Skeleton variant="line" className="skeleton-line" />
            <Skeleton variant="line" className="skeleton-line short" />
          </div>
        </LoadingState>
      </div>
    );
  }

  if (state.kind === "not_available") {
    return (
      <div className="container product-page">
        <div className="detail-message">
          <h1>Producto no disponible</h1>
          <p>Vuelve al catálogo para seguir explorando.</p>
          <Link className="button" href={backHref}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="container product-page">
        <div className="detail-message" data-error-code={state.code}>
          <h1>No pudimos cargar este producto</h1>
          <p role="alert">
            Ocurrió un problema al consultar la ficha. Inténtalo nuevamente.
          </p>
          <div className="actions">
            <Button onClick={retry}>Reintentar</Button>
            <Link className="text-link" href={backHref}>
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const product = state.data;

  return (
    <div className="container product-page">
      <nav aria-label="Migas de navegación" className="breadcrumbs">
        <Link href="/">Inicio</Link>
        <span aria-hidden="true">/</span>
        <Link href={catalogCrumbHref}>Catálogo</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      {/* Aviso data-driven: el BFF declara meta.source (MOCK en H3, REAL
          post I-01); no depende de variables de entorno de build. */}
      {state.source === "MOCK" && (
        <p className="demo-notice" role="note">
          Ficha de demostración · Datos de prueba [MOCK]
        </p>
      )}

      <div className="detail-layout">
        <ProductGallery
          media={product.media}
          onOpenViewer={(index) => setViewerState({ slug, open: true, index })}
        />
        <div className="detail-summary">
          <p className="detail-brand">Marca: {product.brand.name}</p>
          <h1>{product.name}</h1>
          <TechnicalSpecifications
            specs={product.technicalSpecifications}
            description={product.description}
          />
        </div>
      </div>

      <GalleryViewer
        opened={viewer.open}
        media={product.media}
        index={viewer.index}
        label={product.name}
        onClose={() => setViewerState({ slug, open: false, index: 0 })}
        onIndexChange={(index) => setViewerState({ slug, open: true, index })}
      />
    </div>
  );
}
