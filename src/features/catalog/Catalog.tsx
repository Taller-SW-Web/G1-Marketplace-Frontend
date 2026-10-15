"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { isCatalogPage } from "./api";
import { useCatalog } from "./useCatalog";
import { ProductCard } from "./ProductCard";
import { CategoryChip } from "./CategoryChip";
import { ErrorState, MockNotice, ProductSkeletons } from "@/shared/ui/Feedback";

export function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  const q = (params.get("q") || "").trim().replace(/\s+/gu, " ");
  const invalidQuery = Boolean(
    q && (Array.from(q).length < 2 || Array.from(q).length > 120),
  );
  // Invalid q never triggers a request, including when arriving through a shared URL.
  return invalidQuery ? (
    <div className="container catalog-page">
      <Link className="breadcrumb" href="/">
        Inicio /
      </Link>
      <h1>Revisa tu búsqueda</h1>
      <p role="alert">Escribe entre 2 y 120 caracteres para buscar.</p>
      <Link className="button" href="/catalogo">
        Limpiar búsqueda
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
  const category = params.get("categoryIds");
  const returnPath = `/catalogo${query ? `?${query}` : ""}`;
  useEffect(() => {
    if (state.status === "ready" && focusAfterPage.current) {
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
    params.delete("q");
    params.delete("page");
    navigate(`/catalogo${params.size ? `?${params}` : ""}`);
  }
  function clearCategory() {
    params.delete("categoryIds");
    params.delete("page");
    navigate(`/catalogo${params.size ? `?${params}` : ""}`);
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
          <p className="eyebrow">EQUÍPATE PARA TU PRÓXIMA META</p>
          <h1 ref={heading} tabIndex={-1}>
            {q ? (
              <>
                Resultados para <span>“{q}”</span>
              </>
            ) : (
              "Explora el catálogo"
            )}
          </h1>
          <p className="result-count" role="status" aria-live="polite">
            {state.status === "ready"
              ? `${state.data.page.totalElements} productos`
              : state.status === "loading"
                ? "Buscando productos…"
                : ""}
          </p>
        </div>
        <Link className="text-link" href="/">
          Volver al inicio <span aria-hidden="true">↗</span>
        </Link>
      </div>
      {(q || category) && (
        <div className="active-criteria" aria-label="Criterios aplicados">
          {q && (
            <button onClick={clearSearch} aria-label={`Quitar búsqueda ${q}`}>
              Búsqueda: {q} <span aria-hidden="true">×</span>
            </button>
          )}
          {category && (
            <CategoryChip categoryId={category} onRemove={clearCategory} />
          )}
        </div>
      )}
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
            <div className="empty-state">
              <span className="empty-symbol" aria-hidden="true">
                ↗
              </span>
              <h2>
                {state.data.page.number >= state.data.page.totalPages &&
                state.data.page.number > 0
                  ? "Esta página ya no tiene productos"
                  : "No encontramos productos con estos criterios"}
              </h2>
              <p>
                {q
                  ? "Prueba con otras palabras o elimina un criterio para seguir explorando."
                  : "Vuelve al catálogo para explorar otras opciones."}
              </p>
              <div className="actions">
                {q && (
                  <button className="button" onClick={clearSearch}>
                    Limpiar búsqueda
                  </button>
                )}
                <Link className="text-link" href="/catalogo">
                  Ver catálogo completo
                </Link>
              </div>
            </div>
          )}
          {state.data.page.totalPages > 1 && (
            <nav className="pagination" aria-label="Paginación de productos">
              <button
                onClick={() => changePage(state.data.page.number - 1)}
                disabled={state.data.page.number === 0}
              >
                ← Anterior
              </button>
              <span>
                Página <strong>{state.data.page.number + 1}</strong> de{" "}
                {state.data.page.totalPages}
              </span>
              <button
                onClick={() => changePage(state.data.page.number + 1)}
                disabled={
                  state.data.page.number >= state.data.page.totalPages - 1
                }
              >
                Siguiente →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
