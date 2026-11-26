import type { OrderDetail } from "./types";

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" }).format(date);
}

export function OrderDeliverySummary({ shipping }: { shipping: NonNullable<OrderDetail["shipping"]> }) {
  const hasSummary = Boolean(shipping.locationSummary || shipping.emailMasked || shipping.phoneMasked || shipping.estimatedDelivery);
  if (!hasSummary) return null;

  return <section className="order-detail-section" aria-labelledby="order-delivery-title">
    <h2 id="order-delivery-title">Datos de entrega</h2>
    <dl className="order-detail-summary">
      {shipping.locationSummary && <div><dt>Zona de entrega</dt><dd>{shipping.locationSummary}</dd></div>}
      {shipping.emailMasked && <div><dt>Correo</dt><dd>{shipping.emailMasked}</dd></div>}
      {shipping.phoneMasked && <div><dt>Teléfono</dt><dd>{shipping.phoneMasked}</dd></div>}
      {shipping.estimatedDelivery && <div><dt>Entrega estimada</dt><dd>{formatDate(shipping.estimatedDelivery)}</dd></div>}
    </dl>
  </section>;
}
