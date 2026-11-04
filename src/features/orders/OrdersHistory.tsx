"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton, LoadingState } from "@/shared/ui/Skeleton";
import { OrdersRequestError, readOrders } from "./api";
import { OrderList } from "./OrderList";
import { OrdersFilterForm } from "./OrdersFilterForm";
import { OrdersFilterSummary } from "./OrdersFilterSummary";
import { hasOrderFilters, validateOrderFilters, type OrderFilterErrors, type OrderFilters } from "./filters";
import type {
  OrdersHistoryResponse,
  OrdersHistoryState,
  OrdersSource,
  OrderSummary,
} from "./types";

function OrderLoading() {
  return (
    <LoadingState label="Cargando tus pedidos" className="orders-skeleton-list">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="orders-skeleton-card" key={index}>
          <Skeleton variant="line" style={{ width: "34%", height: 22 }} />
          <Skeleton variant="line" style={{ width: "60%", height: 18 }} />
          <Skeleton variant="line" style={{ width: "100%", height: 1 }} />
        </div>
      ))}
    </LoadingState>
  );
}

function OrdersResults({ data, source, filters, onClearFilters }: {
  data: OrdersHistoryResponse;
  source: OrdersSource;
  filters: OrderFilters;
  onClearFilters: () => void;
}) {
  const { page } = data;
  const from = page.totalElements === 0 ? 0 : page.number * page.size + 1;
  const to = Math.min((page.number + 1) * page.size, page.totalElements);

  return (
    <>
      {source === "MOCK" && (
        <p className="orders-source" role="status">Datos sintéticos de prueba (MOCK)</p>
      )}
      {data.data.length === 0 ? (
        <EmptyState
          className="orders-empty"
          title={hasOrderFilters(filters) ? "No hay pedidos con estos filtros" : "Aún no has realizado pedidos"}
          description={hasOrderFilters(filters)
            ? "Prueba con otros criterios o limpia los filtros para volver a consultar tus pedidos."
            : "Cuando hagas una compra, podrás consultar aquí su estado y fecha."}
          actions={hasOrderFilters(filters)
            ? <Button variant="primary" onClick={onClearFilters}>Limpiar filtros</Button>
            : (
            <Link className="button button--primary button--md" href="/catalogo">
              Explorar catálogo
            </Link>
            )}
        />
      ) : (
        <>
          <OrderList orders={data.data} />
          <p className="orders-count" aria-live="polite">
            Mostrando {from}–{to} de {page.totalElements} {page.totalElements === 1 ? "pedido" : "pedidos"}
          </p>
          {page.totalPages > 1 && <Pagination page={page.number} totalPages={page.totalPages} filters={filters} />}
        </>
      )}
    </>
  );
}

function ordersHref(page: number, filters: OrderFilters): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.state) params.set("state", filters.state);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return `/mis-pedidos?${params.toString()}`;
}

function Pagination({ page, totalPages, filters }: { page: number; totalPages: number; filters: OrderFilters }) {
  const router = useRouter();
  const goTo = (nextPage: number) => router.push(ordersHref(nextPage, filters));
  const first = Math.max(0, page - 1);
  const last = Math.min(totalPages - 1, page + 1);
  return (
    <nav className="orders-pagination" aria-label="Paginación de pedidos">
      <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => goTo(first)}>
        Anterior
      </Button>
      <span aria-current="page">Página {page + 1} de {totalPages}</span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => goTo(last)}>
        Siguiente
      </Button>
    </nav>
  );
}

export function OrdersHistoryContainer({ initialPage, initialFilters = {} }: { initialPage: number; initialFilters?: OrderFilters }) {
  const router = useRouter();
  const stateFilter = initialFilters.state ?? "";
  const fromFilter = initialFilters.from ?? "";
  const toFilter = initialFilters.to ?? "";
  const filtersKey = `${stateFilter}|${fromFilter}|${toFilter}`;
  const [draft, setDraft] = useState<OrderFilters>(initialFilters);
  const [filterErrors, setFilterErrors] = useState<OrderFilterErrors>({});
  const [result, setResult] = useState<{
    key: string;
    state: OrdersHistoryState;
  }>({ key: "", state: { status: "loading" } });
  const [attempt, setAttempt] = useState(0);
  const key = `${initialPage}:${filtersKey}:${attempt}`;

  useEffect(() => {
    setDraft({
      ...(stateFilter ? { state: stateFilter as NonNullable<OrderFilters["state"]> } : {}),
      ...(fromFilter ? { from: fromFilter } : {}),
      ...(toFilter ? { to: toFilter } : {}),
    });
    setFilterErrors({});
  }, [stateFilter, fromFilter, toFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const appliedFilters: OrderFilters = {
      ...(stateFilter ? { state: stateFilter as NonNullable<OrderFilters["state"]> } : {}),
      ...(fromFilter ? { from: fromFilter } : {}),
      ...(toFilter ? { to: toFilter } : {}),
    };
    readOrders(initialPage, controller.signal, appliedFilters)
      .then(({ data, source }) => {
        if (!controller.signal.aborted) {
          setResult({ key, state: { status: "ready", data, source } });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state: {
            status: "error",
            code: error instanceof OrdersRequestError ? error.code : "ORDERS_UNAVAILABLE",
            message: error instanceof OrdersRequestError
              ? error.message
              : "No pudimos cargar tus pedidos. Inténtalo nuevamente.",
          },
        });
      });
    return () => controller.abort();
  }, [initialPage, stateFilter, fromFilter, toFilter, key]);

  const state = useMemo(
    () => (result.key === key ? result.state : { status: "loading" as const }),
    [result.key, key, result.state]
  );

  useEffect(() => {
    if (state.status !== "ready") return;
    const pages = state.data.page.totalPages;
    if (pages > 0 && initialPage >= pages) {
      router.replace(ordersHref(pages - 1, {
        ...(stateFilter ? { state: stateFilter as NonNullable<OrderFilters["state"]> } : {}),
        ...(fromFilter ? { from: fromFilter } : {}),
        ...(toFilter ? { to: toFilter } : {}),
      }));
    }
  }, [initialPage, router, state, stateFilter, fromFilter, toFilter]);

  const applyFilters = () => {
    const errors = validateOrderFilters(draft);
    setFilterErrors(errors);
    if (Object.keys(errors).length) return;
    router.push(ordersHref(0, draft));
  };
  const clearFilters = () => {
    setDraft({});
    setFilterErrors({});
    router.push("/mis-pedidos?page=0");
  };
  const removeFilter = (keyToRemove: keyof OrderFilters) => {
    const next: OrderFilters = {
      ...(stateFilter ? { state: stateFilter as NonNullable<OrderFilters["state"]> } : {}),
      ...(fromFilter ? { from: fromFilter } : {}),
      ...(toFilter ? { to: toFilter } : {}),
    };
    delete next[keyToRemove];
    setDraft(next);
    router.push(ordersHref(0, next));
  };

  return (
    <section className="orders-page" aria-labelledby="orders-title">
      <nav className="orders-breadcrumb" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link><span aria-hidden="true">›</span><span aria-current="page">Mis pedidos</span>
      </nav>
      <header className="orders-heading">
        <h1 id="orders-title">Mis pedidos</h1>
        <p>Consulta el historial de tus compras</p>
      </header>
      <OrdersFilterForm
        draft={draft}
        errors={filterErrors}
        onChange={(next) => { setDraft(next); setFilterErrors({}); }}
        onApply={applyFilters}
        onClear={clearFilters}
      />
      <OrdersFilterSummary
        filters={{
          ...(stateFilter ? { state: stateFilter as NonNullable<OrderFilters["state"]> } : {}),
          ...(fromFilter ? { from: fromFilter } : {}),
          ...(toFilter ? { to: toFilter } : {}),
        }}
        onRemove={removeFilter}
      />
      {state.status === "loading" && <OrderLoading />}
      {state.status === "error" && (
        <EmptyState
          className="orders-error"
          title={state.code === "UNAUTHENTICATED" ? "Inicia sesión para ver tus pedidos" : "No pudimos cargar tus pedidos"}
          description={state.message}
          actions={
            <Button variant="primary" onClick={() => setAttempt((current) => current + 1)}>
              Reintentar
            </Button>
          }
        />
      )}
      {state.status === "ready" && <OrdersResults data={state.data} source={state.source} onClearFilters={clearFilters} filters={{
        ...(stateFilter ? { state: stateFilter as NonNullable<OrderFilters["state"]> } : {}),
        ...(fromFilter ? { from: fromFilter } : {}),
        ...(toFilter ? { to: toFilter } : {}),
      }} />}
    </section>
  );
}

/** Backward-compatible name kept for existing route/tests. */
export const OrdersHistory = OrdersHistoryContainer;
