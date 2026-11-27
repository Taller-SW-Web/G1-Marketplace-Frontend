"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";
import { ProductCard } from "./ProductCard";
import { CategoryArtwork } from "./CategoryArtwork";
import { ErrorState, MockNotice, ProductSkeletons } from "@/shared/ui/Feedback";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";

export function Home({ intro }: { intro?: ReactNode }) {
  const { state, retry } = useCatalog("home", isHome);
  if(state.status === "loading") return (
    <div className="container home-content home-state">
      {intro}
      <h2>Preparando tu inicio</h2>
      <p>Estamos cargando categorías y productos. Puedes seguir usando la búsqueda.</p>
      <LoadingState label="Cargando categorías" className="category-grid">
        {[0, 1, 2, 3].map((i) => <Skeleton className="category-skeleton" key={i} />)}
      </LoadingState>
      <ProductSkeletons />
    </div>
  );
  if(state.status === "error") return (
    <div className="container home-content home-error">
      {intro}
      <ErrorState message={state.message} onRetry={retry} home />
    </div>
  );
  const empty = state.data.categories.length === 0 && state.data.featuredProducts.length === 0;
  return (
    <div className={`container home-content${empty ? " home-state" : ""}`}>
      {intro}
      {empty ? (
        <EmptyState className="home-empty" title="Encuentra tu próximo favorito"
          description="Por ahora no hay categorías ni productos destacados para mostrar. Puedes seguir explorando el catálogo."
          actions={<Link className="button" href="/catalogo">Explorar catálogo</Link>} />
      ) : (
        <>
          {state.data.categories.length > 0 && (
            <section className="categories-section" aria-labelledby="categorias-title">
              <h2 id="categorias-title">Encuentra lo tuyo</h2>
              <div className="category-grid">
                {state.data.categories.map((category) => (
                  <Link className="category-card" key={category.categoryId}
                    href={`/catalogo?categoryIds=${encodeURIComponent(category.categoryId)}`}>
                    <CategoryArtwork category={category} />
                    <h3>{category.name}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {state.data.featuredProducts.length > 0 && (
            <section className="featured-section" aria-labelledby="destacados-title">
              <div className="section-heading">
                <h2 id="destacados-title">Destacados para ti</h2>
                <Link className="text-link" href="/catalogo">Ver todo el catálogo</Link>
              </div>
              <div className="product-grid">
                {state.data.featuredProducts.map((product, index) => (
                  <ProductCard key={product.productId} product={product} returnPath="/" priority={index < 3} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {state.source === "MOCK" && <MockNotice />}
    </div>
  );
}
