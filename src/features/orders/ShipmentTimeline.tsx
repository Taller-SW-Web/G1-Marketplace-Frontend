import type { OrderTracking } from "./types";
import { OrderProgress, orderStateCode, orderStateTone } from "./OrderProgress";

function formatEstimated(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value
    : new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" }).format(date);
}

/** Public shipment timeline only; no driver contact or precise location. */
export function ShipmentTimeline({ state, milestones, estimatedDelivery }: Pick<OrderTracking, "state" | "milestones" | "estimatedDelivery">) {
  const ordered = [...milestones].reverse();
  return <section className="order-detail-section shipment-tracking" aria-labelledby="tracking-title">
    <p className="shipment-tracking__eyebrow">Estado actual</p>
    <h2 id="tracking-title" className={`shipment-tracking__state shipment-tracking__state--${orderStateTone(state)}`}>{orderStateCode(state)}</h2>
    {estimatedDelivery && <p className="shipment-tracking__eta">Entrega estimada: <time dateTime={estimatedDelivery}>{formatEstimated(estimatedDelivery)}</time></p>}
    <OrderProgress state={state} />
    <h3 className="shipment-tracking__subtitle">Historial del envío</h3>
    <ol className="order-detail-timeline">{ordered.map((event, index) => <li key={`${event.state}-${event.at}-${index}`} className={index === 0 ? "is-latest" : undefined}>
      <span className="order-detail-timeline__dot" aria-hidden="true" />
      <strong>{orderStateCode(event.state)}</strong>
      <time dateTime={event.at}>{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(event.at))}</time>
    </li>)}</ol>
  </section>;
}
