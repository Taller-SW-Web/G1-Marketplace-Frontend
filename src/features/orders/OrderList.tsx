import Link from "next/link";
import type { OrderSummary } from "./types";

const statusLabels: Record<string, string> = {
  PAGADO: "Pagado", CREADO: "Creado", EN_PREPARACION: "En preparación", DESPACHADO: "Despachado",
  PREPARANDO: "Preparando", EN_TRANSITO: "En tránsito", ENTREGADO: "Entregado", ANULADO: "Cancelado",
};

function statusTone(state: string) {
  switch (state) {
    case "PAGADO": return "paid";
    case "CREADO": case "PREPARANDO": case "EN_PREPARACION": return "preparing";
    case "EN_TRANSITO": case "DESPACHADO": return "transit";
    case "ENTREGADO": return "delivered";
    case "ANULADO": return "cancelled";
    default: return "neutral";
  }
}

function displayStatus(state: string) {
  return statusLabels[state] || state.replaceAll("_", " ").toLocaleLowerCase("es-PE");
}

function formatDate(value: string) {
  const parts = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima",
  }).formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value.replace(".", "");
  const year = parts.find((part) => part.type === "year")?.value;
  return `${day} ${month} ${year}`;
}

function formatMoney(order: OrderSummary) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: order.total.currency }).format(order.total.amount);
}

function StatusBadge({ state }: { state: string }) {
  return <span className={`order-status order-status--${statusTone(state)}`}>
    <span className="order-status__dot" aria-hidden="true" />{displayStatus(state)}
  </span>;
}

function OrderCard({ order }: { order: OrderSummary }) {
  return <article className="order-card">
    <div className="order-card__top"><h2 className="order-card__id">{order.orderId}</h2><StatusBadge state={order.state} /></div>
    <div className="order-card__summary"><span>Fecha: {formatDate(order.createdAt)}</span><strong>{formatMoney(order)}</strong></div>
    <div className="order-card__actions"><Link className="button button--secondary button--sm" href={`/mis-pedidos/${encodeURIComponent(order.orderId)}`}>Ver detalle</Link></div>
  </article>;
}

function DesktopOrdersTable({ orders }: { orders: OrderSummary[] }) {
  return <div className="orders-table-wrap"><table className="orders-table">
    <caption className="sr-only">Historial de pedidos</caption>
    <thead><tr><th scope="col">Código</th><th scope="col">Fecha</th><th scope="col">Total</th><th scope="col">Estado</th><th scope="col">Detalle</th></tr></thead>
    <tbody>{orders.map((order) => <tr key={order.orderId}>
      <th scope="row">{order.orderId}</th><td>{formatDate(order.createdAt)}</td><td>{formatMoney(order)}</td><td><StatusBadge state={order.state} /></td>
      <td><Link href={`/mis-pedidos/${encodeURIComponent(order.orderId)}`} aria-label={`Ver detalle del pedido ${order.orderId}`}>Ver detalle</Link></td>
    </tr>)}</tbody>
  </table></div>;
}

/** Responsive presentation of the current page of the customer's orders. */
export function OrderList({ orders }: { orders: OrderSummary[] }) {
  return <>
    <DesktopOrdersTable orders={orders} />
    <div className="orders-cards" aria-label="Tus pedidos">{orders.map((order) => <OrderCard order={order} key={order.orderId} />)}</div>
  </>;
}
