"use client";
import { Button } from "@/shared/ui/Button";
import { LoadingState, Skeleton } from "@/shared/ui/Skeleton";
import type {
  AttributeSelection,
  ProductVariantsState,
} from "../types/product-variants.types";
import { SelectionSummary } from "./SelectionSummary";
import { VariantSelector } from "./VariantSelector";

interface Props {
  state: ProductVariantsState;
  selection: AttributeSelection;
  onSelectionChange: (attributeId: string, valueId: string) => void;
  onRetry: () => void;
}

/**
 * Región F-013 de la ficha. Un producto simple no renderiza controles; un
 * error conserva la ficha y sólo ofrece reintentar las variantes.
 */
export function ProductVariantsRegion({
  state,
  selection,
  onSelectionChange,
  onRetry,
}: Props) {
  if (state.kind === "simple") return null;

  if (state.kind === "loading") {
    return (
      <section className="variants-region" aria-label="Opciones del producto">
        <LoadingState label="Consultando las opciones del producto">
          <div className="variant-skeleton">
            <Skeleton variant="line" className="skeleton-line short" />
            <Skeleton className="skeleton-option" />
            <Skeleton className="skeleton-option" />
          </div>
        </LoadingState>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section
        className="variants-region"
        aria-label="Opciones del producto"
        data-error-code={state.code}
      >
        <p role="alert">No pudimos cargar las opciones del producto.</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar opciones
        </Button>
      </section>
    );
  }

  return (
    <section className="variants-region" aria-label="Opciones del producto">
      <VariantSelector
        attributes={state.data.attributes}
        variants={state.data.variants}
        value={selection}
        busy={false}
        onSelectionChange={onSelectionChange}
      />
      <SelectionSummary
        attributes={state.data.attributes}
        selection={selection}
        valid={state.kind === "valid"}
      />
    </section>
  );
}
