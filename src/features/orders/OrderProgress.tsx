/** Presentación del avance de un pedido a partir de su estado público (sin datos nuevos). */
const steps = [
  { state: "PAGADO", label: "Pagado" },
  { state: "EN_PREPARACION", label: "En preparación" },
  { state: "DESPACHADO", label: "Despachado" },
  { state: "ENTREGADO", label: "Entregado" },
] as const;

const stepIndex: Record<string, number> = {
  CREADO: 0, PAGADO: 0, PREPARANDO: 1, EN_PREPARACION: 1, EN_TRANSITO: 2, DESPACHADO: 2, ENTREGADO: 3,
};

/** Etiqueta en mayúsculas con tildes para códigos de estado conocidos. */
export function orderStateCode(state: string) {
  return state === "EN_PREPARACION" ? "EN PREPARACIÓN" : state === "EN_TRANSITO" ? "EN TRÁNSITO" : state.replaceAll("_", " ");
}

export function orderStateTone(state: string) {
  switch (state) {
    case "PAGADO": return "paid";
    case "CREADO": case "PREPARANDO": case "EN_PREPARACION": return "preparing";
    case "EN_TRANSITO": case "DESPACHADO": return "transit";
    case "ENTREGADO": return "delivered";
    case "ANULADO": return "cancelled";
    default: return "neutral";
  }
}

export function OrderProgress({ state }: { state: string }) {
  if (state === "ANULADO") {
    return <p className="order-progress-cancelled" role="note">Este pedido fue anulado. No continuará con la preparación ni el despacho.</p>;
  }
  const current = stepIndex[state];
  if (current === undefined) return null;
  return <ol className="order-progress" aria-label="Avance del pedido">
    {steps.map((step, index) => {
      const status = index < current || (index === current && state === "ENTREGADO") ? "is-done" : index === current ? "is-current" : "";
      return <li key={step.state} className={status} aria-current={index === current ? "step" : undefined}>
        <span className="order-progress__marker" aria-hidden="true">{status === "is-done" ? "✓" : index + 1}</span>
        <span className="order-progress__label">{step.label}{status === "is-done" && <span className="sr-only"> (completado)</span>}</span>
      </li>;
    })}
  </ol>;
}
