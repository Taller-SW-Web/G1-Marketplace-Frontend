import type { OrderTracking } from "./types";

/** Public shipment timeline only; no driver contact or precise location. */
export function ShipmentTimeline({ state, milestones, estimatedDelivery }: Pick<OrderTracking, "state" | "milestones" | "estimatedDelivery">) {
  return <section className="order-detail-section" aria-labelledby="tracking-title">
    <h2 id="tracking-title">{state.replaceAll("_", " ")}</h2>
    {estimatedDelivery && <p>Entrega estimada: <time>{estimatedDelivery}</time></p>}
    <ol className="order-detail-timeline">{milestones.map((event, index) => <li key={`${event.state}-${event.at}-${index}`}>
      <strong>{event.state.replaceAll("_", " ")}</strong>
      <time dateTime={event.at}>{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(event.at))}</time>
    </li>)}</ol>
  </section>;
}
