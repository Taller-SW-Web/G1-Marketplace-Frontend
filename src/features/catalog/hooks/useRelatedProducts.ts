"use client";
import { useEffect, useState } from "react";
import { fetchRelatedProducts } from "../services/product-recommendations.service";
import type { RelatedProductsState } from "../types/product-recommendations.types";

/**
 * Orquesta F-015 de forma degradable: vacío o fallo técnico omiten la región
 * completa sin afectar la ficha.
 */
export function useRelatedProducts(slug: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${slug}:${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    state: RelatedProductsState;
  }>({ key, state: { kind: "loading" } });

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();
    fetchRelatedProducts(slug, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setResult({
        key,
        state: data.length > 0 ? { kind: "ready", data } : { kind: "omitted" },
      });
    });

    return () => controller.abort();
  }, [slug, key]);

  const state: RelatedProductsState =
    result.key === key ? result.state : { kind: "loading" };

  return { state, retry: () => setAttempt((value) => value + 1) };
}
