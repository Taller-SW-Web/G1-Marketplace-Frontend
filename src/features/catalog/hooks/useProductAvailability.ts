"use client";
import { useEffect, useState } from "react";
import {
  fetchProductAvailability,
  ProductAvailabilityError,
} from "../services/product-availability.service";
import type { ProductAvailabilityState } from "../types/product-availability.types";

/**
 * Orquesta F-014: sin SKU aplicable no ejecuta la consulta. Un error de
 * inventario se mantiene como error y nunca se presenta como agotado.
 */
export function useProductAvailability(
  slug: string,
  sku: string | undefined,
  requiresSku: boolean,
) {
  const [attempt, setAttempt] = useState(0);
  const key = `${slug}:${sku ?? ""}:${attempt}`;
  const waiting = requiresSku && !sku;
  const [result, setResult] = useState<{
    key: string;
    state: ProductAvailabilityState;
  }>({ key, state: { kind: "loading" } });

  useEffect(() => {
    if (!slug || waiting) return;

    const controller = new AbortController();
    fetchProductAvailability(slug, sku, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state: {
            kind: "ready",
            availability: response.data.availability,
            checkedAt: response.data.checkedAt,
          },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state: {
            kind: "error",
            code:
              error instanceof ProductAvailabilityError
                ? error.code
                : "INVENTORY_UNAVAILABLE",
          },
        });
      });

    return () => controller.abort();
  }, [slug, sku, waiting, key]);

  const state: ProductAvailabilityState = !slug
    ? { kind: "error", code: "PRODUCT_NOT_AVAILABLE" }
    : waiting
      ? { kind: "waiting_for_sku" }
      : result.key === key
        ? result.state
        : { kind: "loading" };

  const retry = () => setAttempt((value) => value + 1);

  return { state, retry };
}
