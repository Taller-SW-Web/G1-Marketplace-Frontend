"use client";
import { Button } from "@/shared/ui/Button";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";
import type { ProductPriceState } from "../types/product-price.types";
import { PriceDisplay } from "./PriceDisplay";

interface Props {
  state: ProductPriceState;
  retry: () => void;
}

/**
 * Región comercial de precio (`CMP-F012-001`). El contenedor
 * `ProductCommerce` ejecuta `useProductPrice`; esta pieza sólo representa el
 * estado discriminado y no consulta servicios.
 */
export function ProductPriceRegion({ state, retry }: Props) {
  return (
    <section
      className="price-region"
      aria-label="Precio"
      aria-live="polite"
      aria-busy={state.kind === "loading"}
    >
      {state.kind === "waiting_for_variant" && (
        <p className="price-hint">
          Selecciona una opción para ver el precio.
        </p>
      )}

      {state.kind === "loading" && (
        <LoadingState label="Consultando el precio">
          <div className="price-skeleton">
            <Skeleton variant="line" className="skeleton-line short" />
            <Skeleton variant="line" className="skeleton-line" />
          </div>
        </LoadingState>
      )}

      {state.kind === "unavailable" && (
        <div className="price-unavailable" data-error-code={state.code}>
          <p>Precio no disponible por el momento.</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}

      {(state.kind === "regular" || state.kind === "sale") && (
        <PriceDisplay
          price={state.data.price}
          retrievedAt={state.retrievedAt}
        />
      )}
    </section>
  );
}
