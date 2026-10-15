"use client";
import Link from "next/link";
import { isHome } from "./api";
import { useCatalog } from "./useCatalog";
import { ProductCard } from "./ProductCard";
import { ErrorState, MockNotice } from "@/shared/ui/Feedback";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";

export function Home() {
  const { state, retry } = useCatalog("home", isHome);
  const showCategories =
    state.status !== "ready" || state.data.categories.length > 0;
  return (
    <>
      <section className="home-intro container">
        <div className="intro-copy">
          <p className="eyebrow">
            <span /> ENCUENTRA TU MOVIMIENTO
          </p>
          <h1>
            Tu siguiente
            <br />
            meta empieza <em>aquí.</em>
          </h1>
          <p className="intro-description">
            Explora equipamiento, ropa y accesorios para acompañarte en cada
            paso.
          </p>
          <Link className="button" href="/catalogo">
            Explorar catálogo <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="intro-art" aria-hidden="true">
          <span className="motion-line line-one" />
          <span className="motion-line line-two" />
          <span className="motion-line line-three" />
          <span className="art-word">
            EN
            <br />
            MOVIMIENTO.
          </span>
          <span className="art-caption">CADA PASO CUENTA.</span>
          <span className="art-number">01 /</span>
        </div>
      </section>
      <section
        className="categories-section container"
        aria-labelledby={showCategories ? "categorias-title" : undefined}
        aria-label={!showCategories ? "Exploración del catálogo" : undefined}
      >
        {showCategories && (
          <div className="section-heading">
            <div>
              <p className="eyebrow">A TU RITMO</p>
              <h2 id="categorias-title">Explora por categoría</h2>
            </div>
            <Link className="text-link" href="/catalogo">
              Ver todo <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
        {state.status === "loading" && (
          <LoadingState label="Cargando categorías" className="category-grid">
            {[0, 1, 2].map((i) => (
              <Skeleton className="category-skeleton" key={i} />
            ))}
          </LoadingState>
        )}
        {state.status === "error" && (
          <ErrorState message={state.message} onRetry={retry} />
        )}
        {state.status === "ready" && (
          <>
            {state.source === "MOCK" && <MockNotice />}
            {state.data.categories.length ? (
              <div className="category-grid">
                {state.data.categories.map((category, index) => (
                  <Link
                    className="category-card"
                    key={category.categoryId}
                    href={`/catalogo?categoryIds=${encodeURIComponent(category.categoryId)}`}
                  >
                    <span className="category-index">0{index + 1}</span>
                    <h3>{category.name}</h3>
                    <span className="category-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                ))}
              </div>
            ) : state.data.featuredProducts.length === 0 ? (
              <EmptyState
                title="Encuentra tu próxima elección"
                description="Explora el catálogo o busca el producto que tienes en mente."
                actions={
                  <Link className="button" href="/catalogo">
                    Explorar catálogo
                  </Link>
                }
              />
            ) : null}
            {state.data.featuredProducts.length > 0 && (
              <section
                className="featured-section"
                aria-labelledby="destacados-title"
              >
                <h2 id="destacados-title">Destacados</h2>
                <div className="product-grid">
                  {state.data.featuredProducts.map((product) => (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      returnPath="/"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>
      <div className="movement-band">
        <div className="container">
          <p>UNA META. MUCHAS FORMAS DE LLEGAR.</p>
          <Link href="/catalogo">
            Encuentra la tuya <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </>
  );
}
