import type { OrderDetail } from "./types";

/** Published order milestones, formatted in Peru local time. */
export function OrderStateTimeline({ milestones }: { milestones: OrderDetail["milestones"] }) {
  return <section className="order-detail-section" aria-labelledby="order-timeline-title">
    <h2 id="order-timeline-title">Historial del pedido</h2>
    <ol className="order-detail-timeline">{milestones.map((event, index) => <li key={`${event.state}-${event.at}-${index}`}>
      <strong>{event.state.replaceAll("_", " ")}</strong>
      <time dateTime={event.at}>{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(event.at))}</time>
    </li>)}</ol>
  </section>;
}
