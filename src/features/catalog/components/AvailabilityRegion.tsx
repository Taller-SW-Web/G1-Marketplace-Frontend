"use client";
import { Button } from "@/shared/ui/Button";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";
import type {
  CommercialAvailability,
  ProductAvailabilityState,
} from "../types/product-availability.types";

interface Props {
  state: ProductAvailabilityState;
  retry: () => void;
}

const LABELS: Record<CommercialAvailability, string> = {
  AVAILABLE: "Disponible",
  STOCK_LOW: "Quedan pocas unidades",
  OUT_OF_STOCK: "Agotado",
};

const MODIFIERS: Record<CommercialAvailability, string> = {
  AVAILABLE: "availability-available",
  STOCK_LOW: "availability-low",
  OUT_OF_STOCK: "availability-out",
};

/** Icono redundante con el texto (no depende sólo del color). */
function AvailabilityIcon({ state }: { state: CommercialAvailability }) {
  return (
    <span className={`availability-icon ${MODIFIERS[state]}`} aria-hidden="true">
      {state === "AVAILABLE" ? "✓" : state === "STOCK_LOW" ? "!" : "×"}
    </span>
  );
}

/**
 * `CMP-F014-001` · AvailabilityRegion — estado comercial sin cantidades,
 * ubicaciones ni promesa de reserva. Un error nunca se presenta como agotado.
 */
export function AvailabilityRegion({ state, retry }: Props) {
  if (state.kind === "waiting_for_sku") {
    return (
      <section className="availability-region" aria-live="polite">
        <p className="availability-hint">
          Selecciona una opción para consultar disponibilidad.
        </p>
      </section>
    );
  }

  if (state.kind === "loading") {
    return (
      <section
        className="availability-region"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingState label="Consultando la disponibilidad">
          <Skeleton variant="line" className="skeleton-line short" />
        </LoadingState>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section
        className="availability-region"
        aria-live="polite"
        data-error-code={state.code}
      >
        <p className="availability-status availability-error" role="alert">
          No pudimos consultar disponibilidad.
        </p>
        <Button variant="secondary" size="sm" onClick={retry}>
          Reintentar disponibilidad
        </Button>
      </section>
    );
  }

  return (
    <section className="availability-region" aria-live="polite">
      <p
        className={`availability-status ${MODIFIERS[state.availability]}`}
        data-availability={state.availability}
      >
        <AvailabilityIcon state={state.availability} />
        {LABELS[state.availability]}
      </p>
    </section>
  );
}
