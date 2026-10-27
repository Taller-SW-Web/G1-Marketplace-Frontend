"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { isCatalogPage, isCatalogFilters, isHome } from "./api";
import { CatalogFilters, ActiveFilterChips } from "./CatalogFilters";
import { CatalogSortSelect } from "./CatalogSortSelect";
import { CatalogPagination } from "./CatalogPagination";
import { catalogHref, criteriaError } from "./criteria";
import { useCatalog } from "./useCatalog";
import { ProductCard } from "./ProductCard";
import { ErrorState, MockNotice, ProductSkeletons } from "@/shared/ui/Feedback";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

export function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  const q = (params.get("q") || "").trim().replace(/\s+/gu, " ");
  const invalidQuery = Boolean(
    q && (Array.from(q).length < 2 || Array.from(q).length > 120),
  );
  const invalidCriteria = criteriaError(query);
  // Invalid URL input never requests products.
  return invalidQuery || invalidCriteria ? (
    <div className="container catalog-page empty-state">
      <Link className="breadcrumb" href="/">
        Inicio /
      </Link>
      <h1>{invalidQuery ? "Revisa tu búsqueda" : "Revisa los criterios del catálogo"}</h1>
      <p role="alert">{invalidQuery ? "Escribe entre 2 y 120 caracteres para buscar." : invalidCriteria}</p>
      <Link className="button" href="/catalogo">
        {invalidQuery ? "Limpiar búsqueda" : "Volver al catálogo"}
      </Link>
    </div>
  ) : (
    <CatalogResults
      query={query}
      q={q}
      navigate={(path) => router.push(path, { scroll: false })}
    />
  );
}

function CatalogResults({
  query,
  q,
  navigate,
}: {
  query: string;
  q: string;
  navigate: (path: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterPage = useRef(false);
  const { state, retry } = useCatalog(
    `products${query ? `?${query}` : ""}`,
    isCatalogPage,
  );
  const params = new URLSearchParams(query);
  const filters = useCatalog("filters", isCatalogFilters);
  const categories = useCatalog(filters.state.status === "error" ? "home" : null, isHome);
  const returnPath = `/catalogo${query ? `?${query}` : ""}`;
  useEffect(() => {
    if(state.status !== "loading" && focusAfterPage.current) {
      heading.current?.focus();
      focusAfterPage.current = false;
    }
  }, [state, heading, focusAfterPage]);
  function changePage(page: number) {
    params.set("page", String(page));
    focusAfterPage.current = true;
    navigate(`/catalogo?${params}`);
  }
  function clearSearch() {
    applyCriteria(catalogHref(query, { q: undefined }));
  }
  function applyCriteria(url: string) {
    if (url === returnPath && state.status !== "loading") {
      focusAfterPage.current = false;
      heading.current?.focus();
      return;
    }
    focusAfterPage.current = true;
    navigate(url);
  }
  return (
    <div className="container catalog-page">
      <nav aria-label="Migas de navegación" className="breadcrumbs">
        <Link href="/">Inicio</Link>
        <span aria-hidden="true">/</span>
        <span>Catálogo</span>
      </nav>
      <div className="catalog-heading">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {q ? (
              <>
                Resultados para <span>“{q}”</span>
              </>
            ) : (
              "Catálogo"
            )}
          </h1>
          <p className="catalog-description">
            {q ? "Explora los productos que coinciden con tu búsqueda." : "Todo para moverte a tu ritmo."}
          </p>
        </div>
      </div>
      {q && (
        <div className="active-criteria" aria-label="Criterios aplicados">
          {q && (
            <button onClick={clearSearch} aria-label={`Quitar búsqueda ${q}`}>
              Búsqueda: {q} <span aria-hidden="true">×</span>
            </button>
          )}

        </div>
      )}
      <ActiveFilterChips query={query} options={filters.state} fallbackCategories={categories.state} onChange={applyCriteria} />
      <div className="catalog-layout">
        <CatalogFilters query={query} options={filters.state} fallbackCategories={categories.state} retryCategories={categories.retry} retry={filters.retry} onApply={applyCriteria} />
        <section className="catalog-results" aria-label="Productos del catálogo">
          <div className="catalog-result-toolbar">
          <p className="result-count" role="status" aria-live="polite">
            {state.status === "ready"
              ? `${state.data.page.totalElements} productos`
              : state.status === "loading"
                ? "Buscando productos…"
                : ""}
          </p>
          <CatalogSortSelect value={params.get("sort") ?? ""} onChange={sort => applyCriteria(catalogHref(query, { sort }))} />
          </div>
          {state.status === "loading" && <ProductSkeletons />}
          {state.status === "error" && (
            <ErrorState message={state.message} onRetry={retry} />
          )}
          {state.status === "ready" && (
            <>
              {state.source === "MOCK" && <MockNotice />}
              {state.data.data.length ? (
                <div className="product-grid">
                  {state.data.data.map((product) => (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      returnPath={returnPath}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<img src="/figma/search-32.svg" alt="" width="32" height="32" />}
                  title={
                    state.data.page.number >= state.data.page.totalPages &&
                      state.data.page.number > 0
                      ? "Esta página ya no tiene productos"
                      : "No encontramos productos con estos criterios"
                  }
                  description={
                    q
                      ? "Prueba con otras palabras o elimina un criterio para seguir explorando."
                      : "Vuelve al catálogo para explorar otras opciones."
                  }
                  actions={
                    <>
                      {state.data.page.number > 0 && <Button onClick={() => changePage(0)}>Volver a la primera página</Button>}
                      {q && <Button onClick={clearSearch}>Limpiar búsqueda</Button>}
                      <Link className="text-link" href="/catalogo">
                        Ver catálogo completo
                      </Link>
                    </>
                  }
                />
              )}
              {state.data.data.length > 0 && (
                <p className="result-range">
                  Mostrando {state.data.page.number * state.data.page.size + 1}–{state.data.page.number * state.data.page.size + state.data.data.length} de {state.data.page.totalElements} productos
                </p>
              )}
              <CatalogPagination page={state.data.page} onChange={changePage} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
