"use client";
import { useCallback, useEffect, useState } from "react";
import {
  fetchProductVariants,
  findVariant,
  ProductVariantsError,
  variantAttributeIds,
} from "../services/product-variants.service";
import type {
  AttributeSelection,
  ProductVariantsDTO,
  ProductVariantsState,
} from "../types/product-variants.types";

/**
 * Orquesta F-013: carga atributos, resuelve una única combinación y descarta
 * respuestas de una selección anterior.
 *
 * `INCOMPLETE` y `VALID` se derivan de la misma selección; al cambiar un
 * atributo se eliminan sólo las elecciones incompatibles y nunca se conserva
 * un SKU previo (RC-F-013-01).
 */
export function useProductVariants(slug: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${slug}:${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    state: ProductVariantsState;
    selection: AttributeSelection;
  }>({
    key,
    state: { kind: "loading" },
    selection: {},
  });

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();
    fetchProductVariants(slug, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        const data = response.data;
        setResult({
          key,
          selection: {},
          state: data.hasVariants
            ? { kind: "selecting", data, selection: {} }
            : { kind: "simple", data },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          selection: {},
          state: {
            kind: "error",
            code:
              error instanceof ProductVariantsError
                ? error.code
                : "CATALOG_UNAVAILABLE",
          },
        });
      });

    return () => controller.abort();
  }, [slug, key]);

  const current = result.key === key ? result : null;

  const select = useCallback(
    (attributeId: string, valueId: string) => {
      setResult((previous) => {
        if (previous.key !== key) return previous;
        const { state } = previous;
        if (state.kind !== "selecting" && state.kind !== "valid") {
          return previous;
        }
        const selection = pruneSelection(
          state.data,
          { ...previous.selection, [attributeId]: valueId },
          attributeId,
        );
        const variant = findVariant(state.data, selection);
        return {
          key,
          selection,
          state: variant
            ? { kind: "valid", data: state.data, selection, variant }
            : { kind: "selecting", data: state.data, selection },
        };
      });
    },
    [key],
  );

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return {
    state: current?.state ?? { kind: "loading" as const },
    selection: current?.selection ?? {},
    select,
    retry,
  };
}

function matches(
  data: ProductVariantsDTO,
  selection: AttributeSelection,
): boolean {
  const entries = Object.entries(selection);
  return data.variants.some((variant) =>
    entries.every(([id, value]) => variant.attributes[id] === value),
  );
}

/**
 * Conserva el valor recién elegido y el mayor subconjunto de la selección
 * previa que siga teniendo una variante activa.
 */
export function pruneSelection(
  data: ProductVariantsDTO,
  candidate: AttributeSelection,
  lockedId: string,
): AttributeSelection {
  const locked = { [lockedId]: candidate[lockedId] };
  const others = variantAttributeIds(data).filter(
    (id) => id !== lockedId && candidate[id] !== undefined,
  );

  for (let size = others.length; size >= 0; size -= 1) {
    for (const combination of combinations(others, size)) {
      const selection: AttributeSelection = { ...locked };
      for (const id of combination) selection[id] = candidate[id];
      if (matches(data, selection)) return selection;
    }
  }
  return locked;
}

/** `true` si elegir `valueId` mantiene al menos una combinación alcanzable. */
export function isValueEnabled(
  data: Pick<ProductVariantsDTO, "variants">,
  selection: AttributeSelection,
  attributeId: string,
  valueId: string,
): boolean {
  const candidate = { ...selection, [attributeId]: valueId };
  const entries = Object.entries(candidate);
  return data.variants.some((variant) =>
    entries.every(([id, value]) => variant.attributes[id] === value),
  );
}

function combinations<T>(values: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (size > values.length) return [];
  const result: T[][] = [];
  values.forEach((value, index) => {
    for (const rest of combinations(values.slice(index + 1), size - 1)) {
      result.push([value, ...rest]);
    }
  });
  return result;
}
