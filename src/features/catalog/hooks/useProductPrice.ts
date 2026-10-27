"use client";
import { useEffect, useState } from "react";
import {
  fetchProductPrice,
  ProductPriceError,
} from "../services/product-price.service";
import type {
  ProductPriceState,
} from "../types/product-price.types";

/**
 * Orquesta F-012: espera el SKU aplicable, consulta el precio y permite
 * reintentar sólo esta región. Una respuesta vieja de otro SKU se descarta.
 */
export function useProductPrice(
  slug: string,
  sku: string | undefined,
  requiresVariant: boolean,
) {
  const [attempt, setAttempt] = useState(0);
  const key = `${slug}:${sku ?? ""}:${attempt}`;
  const waiting = requiresVariant && !sku;
  const [result, setResult] = useState<{
    key: string;
    state: ProductPriceState;
  }>({ key, state: { kind: "loading" } });

  useEffect(() => {
    if (!slug || waiting) return;

    const controller = new AbortController();
    fetchProductPrice(slug, sku, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state:
            res.data.price.saleAmount !== null
              ? {
                  kind: "sale",
                  data: res.data,
                  retrievedAt: res.meta.retrievedAt,
                }
              : {
                  kind: "regular",
                  data: res.data,
                  retrievedAt: res.meta.retrievedAt,
                },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          state:
            error instanceof ProductPriceError
              ? { kind: "unavailable", code: error.code }
              : { kind: "unavailable", code: "PRICING_UNAVAILABLE" },
        });
      });

    return () => controller.abort();
  }, [slug, sku, waiting, key]);

  const state: ProductPriceState = !slug
    ? { kind: "unavailable", code: "PRODUCT_NOT_AVAILABLE" }
    : waiting
      ? { kind: "waiting_for_variant" }
      : result.key === key
        ? result.state
        : { kind: "loading" };

  const retry = () => setAttempt((value) => value + 1);

  return { state, retry };
}
