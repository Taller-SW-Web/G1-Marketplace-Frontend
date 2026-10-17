"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton, LoadingState } from "@/shared/ui/Skeleton";
import { OrdersRequestError, readOrders } from "./api";
import type {
  OrdersHistoryResponse,
  OrdersHistoryState,
  OrdersSource,
  OrderSummary,
} from "./types";

const statusLabels: Record<string, string> = {
  PAGADO: "Pagado",
  CREADO: "Creado",
  PREPARANDO: "Preparando",
  EN_TRANSITO: "En tránsito",
  ENTREGADO: "Entregado",
  ANULADO: "Cancelado",
};

// F-030 (detalle de pedido) está fuera de esta entrega: no se enlaza a una ruta inexistente.
const DETAIL_PENDING_LABEL = "Detalle próximamente";
const DETAIL_PENDING_HINT = "El detalle del pedido estará disponible en una próxima entrega.";

function statusTone(state: string) {
  switch (state) {
    case "PAGADO":
      return "paid";
    case "CREADO":
    case "PREPARANDO":
      return "preparing";
    case "EN_TRANSITO":
      return "transit";
    case "ENTREGADO":
      return "delivered";
    case "ANULADO":
      return "cancelled";
    default:
      return "neutral";
  }
}

function displayStatus(state: string) {
  return statusLabels[state] || state.replaceAll("_", " ").toLocaleLowerCase("es-PE");
}

function formatDate(value: string) {
  const parts = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value.replace(".", "");
  const year = parts.find((part) => part.type === "year")?.value;
  return `${day} ${month} ${year}`;
}

function formatMoney(order: OrderSummary) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: order.total.currency,
  }).format(order.total.amount);
}

function StatusBadge({ state }: { state: string }) {
  return (
    <span className={`order-status order-status--${statusTone(state)}`}>
      <span className="order-status__dot" aria-hidden="true" />
      {displayStatus(state)}
    </span>
  );
}

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

function OrderCard({ order }: { order: OrderSummary }) {
  return (
    <article className="order-card">
      <div className="order-card__top">
        <h2 className="order-card__id">{order.orderId}</h2>
        <StatusBadge state={order.state} />
      </div>
      <div className="order-card__summary">
        <span>Fecha: {formatDate(order.createdAt)}</span>
        <strong>{formatMoney(order)}</strong>
      </div>
      <div className="order-card__actions">
        <Button
          variant="secondary"
          size="sm"
          disabled
          title={DETAIL_PENDING_HINT}
          aria-label={`Detalle del pedido ${order.orderId}: ${DETAIL_PENDING_LABEL.toLowerCase()}`}
        >
          {DETAIL_PENDING_LABEL}
        </Button>
      </div>
    </article>
  );
}

function DesktopOrdersTable({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="orders-table-wrap">
      <table className="orders-table">
        <caption className="sr-only">Historial de pedidos</caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Fecha</th>
            <th scope="col">Total</th>
            <th scope="col">Estado</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId}>
              <th scope="row">{order.orderId}</th>
              <td>{formatDate(order.createdAt)}</td>
              <td>{formatMoney(order)}</td>
              <td><StatusBadge state={order.state} /></td>
              <td>
                <span
                  className="orders-table__detail orders-table__detail--pending"
                  title={DETAIL_PENDING_HINT}
                  aria-label={`Detalle del pedido ${order.orderId}: ${DETAIL_PENDING_LABEL.toLowerCase()}`}
                >
                  {DETAIL_PENDING_LABEL}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersResults({ data, source }: { data: OrdersHistoryResponse; source: OrdersSource }) {
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
          title="Aún no has realizado pedidos"
          description="Cuando hagas una compra, podrás consultar aquí su estado y fecha."
          actions={
            <Link className="button button--primary button--md" href="/catalogo">
              Explorar catálogo
            </Link>
          }
        />
      ) : (
        <>
          <DesktopOrdersTable orders={data.data} />
          <div className="orders-cards" aria-label="Tus pedidos">
            {data.data.map((order) => <OrderCard order={order} key={order.orderId} />)}
          </div>
          <p className="orders-count" aria-live="polite">
            Mostrando {from}–{to} de {page.totalElements} {page.totalElements === 1 ? "pedido" : "pedidos"}
          </p>
          {page.totalPages > 1 && <Pagination page={page.number} totalPages={page.totalPages} />}
        </>
      )}
    </>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const goTo = (nextPage: number) => router.push(`/mis-pedidos?page=${nextPage}`);
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

export function OrdersHistory({ initialPage }: { initialPage: number }) {
  const router = useRouter();
  const [result, setResult] = useState<{
    key: string;
    state: OrdersHistoryState;
  }>({ key: "", state: { status: "loading" } });
  const [attempt, setAttempt] = useState(0);
  const key = `${initialPage}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    readOrders(initialPage, controller.signal)
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
  }, [initialPage, key]);

  const state = result.key === key ? result.state : { status: "loading" as const };

  useEffect(() => {
    if (state.status !== "ready") return;
    const pages = state.data.page.totalPages;
    if (pages > 0 && initialPage >= pages) router.replace(`/mis-pedidos?page=${pages - 1}`);
  }, [initialPage, router, state]);

  return (
    <section className="orders-page" aria-labelledby="orders-title">
      <nav className="orders-breadcrumb" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link><span aria-hidden="true">›</span><span aria-current="page">Mis pedidos</span>
      </nav>
      <header className="orders-heading">
        <h1 id="orders-title">Mis pedidos</h1>
        <p>Consulta el historial de tus compras</p>
      </header>
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
      {state.status === "ready" && <OrdersResults data={state.data} source={state.source} />}
    </section>
  );
}
