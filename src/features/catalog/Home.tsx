"use client";
import Link from "next/link";
import Image from "next/image";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";
import { CategoryArtwork } from "./CategoryArtwork";
import { FeaturedRail } from "./FeaturedRail";
import { ErrorState, MockNotice, ProductSkeletons } from "@/shared/ui/Feedback";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";
import "./home-h5.css";

export function Home() {
  const { state, retry } = useCatalog("home", isHome);
  if(state.status === "loading") return (
    <div className="container home-content h5-home home-state">
      <h1>Preparando tu inicio</h1>
      <p>Estamos cargando categorías y productos. Puedes seguir usando la búsqueda.</p>
      <LoadingState label="Cargando categorías" className="category-grid">
        {[0, 1, 2, 3].map((i) => <Skeleton className="category-skeleton" key={i} />)}
      </LoadingState>
      <ProductSkeletons />
    </div>
  );
  if(state.status === "error") return (
    <div className="container home-content h5-home home-error">
      <h1 className="sr-only">Inicio</h1>
      <ErrorState message={state.message} onRetry={retry} home />
    </div>
  );
  const empty = state.data.categories.length === 0 && state.data.featuredProducts.length === 0;
  return (
    <div className={`container home-content h5-home${empty ? " home-state" : ""}`}>
      {empty ? (
        <>
          <h1 className="sr-only">Inicio</h1>
          <EmptyState className="home-empty" title="Encuentra tu próximo favorito"
            description="Por ahora no hay categorías ni productos destacados para mostrar. Puedes seguir explorando el catálogo."
            actions={<Link className="button" href="/catalogo">Explorar catálogo</Link>} />
        </>
      ) : (
        <>
          <section className="home-intro" aria-labelledby="inicio-title">
            <div className="intro-copy">
              <p className="eyebrow">Calzado, ropa y equipamiento</p>
              <h1 id="inicio-title">Equípate para<br />moverte</h1>
              <p className="intro-description">Encuentra lo que necesitas para entrenar, correr o salir al aire libre.</p>
              <Link className="button" href="/catalogo">Explorar catálogo</Link>
            </div>
            <div className="intro-art">
              <Image src="/figma/hero-shoe.png" alt="Zapatilla deportiva negra y blanca" fill
                sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1440px) 48vw, 645px" fetchPriority="high" />
            </div>
          </section>
          {state.data.categories.length > 0 && (
            <section className="categories-section" aria-labelledby="categorias-title">
              <h2 id="categorias-title">Compra por categoría</h2>
              <div className="category-grid">
                {state.data.categories.map((category) => (
                  <Link className="category-card" key={category.categoryId}
                    href={`/catalogo?categoryIds=${encodeURIComponent(category.categoryId)}`}>
                    <CategoryArtwork category={category} />
                    <div className="h5-home-category-label">
                      <h3>{category.name}</h3>
                      <img src="/figma/h5-shell/arrow.svg" alt="" width="22" height="22" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {state.data.featuredProducts.length > 0 &&
            <FeaturedRail products={state.data.featuredProducts} categories={state.data.categories} />}
        </>
      )}
      <section className="home-ranking" aria-labelledby="home-ranking-title">
        <h2 id="home-ranking-title">Más vendidos</h2>
        <p>Pronto podrás consultar el ranking.</p>
      </section>
      {state.source === "MOCK" && <MockNotice />}
    </div>
  );
}
