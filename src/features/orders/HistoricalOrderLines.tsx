import type { OrderDetail } from "./types";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);
}

/** Historical item snapshot; it does not read current catalog prices or stock. */
export function HistoricalOrderLines({ lines }: { lines: OrderDetail["lines"] }) {
  return <section className="order-detail-section" aria-labelledby="order-lines-title">
    <h2 id="order-lines-title">Productos de la compra</h2>
    <ul className="order-detail-lines">{lines.map((line, index) => <li key={`${line.sku}-${index}`}>
      <div><strong>{line.description}</strong><small>SKU {line.sku} · Cantidad: {line.quantity}</small></div>
      <span>{formatMoney(line.unitPrice.amount, line.unitPrice.currency)}</span>
    </li>)}</ul>
  </section>;
}
