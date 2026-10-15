"use client";
import Link from "next/link";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";
import { ProductCard } from "./ProductCard";
import { CategoryArtwork } from "./CategoryArtwork";
import { ErrorState, MockNotice, ProductSkeletons } from "@/shared/ui/Feedback";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";

export function Home() {
  const { state, retry } = useCatalog("home", isHome);
  if(state.status === "loading") return (
    <div className="container home-content home-state">
      <h1>Preparando tu inicio</h1>
      <p>Estamos cargando categorías y productos. Puedes seguir usando la búsqueda.</p>
      <LoadingState label="Cargando categorías" className="category-grid">
        {[0, 1, 2, 3].map((i) => <Skeleton className="category-skeleton" key={i} />)}
      </LoadingState>
      <ProductSkeletons />
    </div>
  );
  if(state.status === "error") return (
    <div className="container home-content home-error">
      <h1 className="sr-only">Inicio</h1>
      <ErrorState message={state.message} onRetry={retry} home />
    </div>
  );
  const empty = state.data.categories.length === 0 && state.data.featuredProducts.length === 0;
  return (
    <div className={`container home-content${empty ? " home-state" : ""}`}>
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
              <p className="eyebrow">ENCUENTRA TU PRÓXIMA META</p>
              <h1 id="inicio-title">EL MOVIMIENTO<br />EMPIEZA CONTIGO.</h1>
              <p className="intro-description">Ropa, calzado y accesorios para acompañarte en cada entrenamiento.</p>
              <Link className="button" href="/catalogo">Explorar catálogo</Link>
            </div>
            <div className="intro-art">
              <img src="/figma/hero-shoe.png" alt="Zapatilla deportiva negra y blanca" width="580" height="387" fetchPriority="high" />
            </div>
          </section>
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
                {state.data.featuredProducts.map((product) => (
                  <ProductCard key={product.productId} product={product} returnPath="/" />
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
