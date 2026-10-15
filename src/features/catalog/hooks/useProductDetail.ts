"use client";
import { useEffect, useState } from "react";
import { getProductDetail } from "../services/product-detail.adapter";
import { ProductDetailError } from "../services/product-detail.service";
import type { ProductDetailStatus } from "../types/product-detail.types";

/**
 * Orquesta F-011: carga, reintento y cancelación de la petición en vuelo.
 * El reintento relanza únicamente el detalle; no consulta precio, stock ni
 * variantes (F-012–F-015 quedan fuera de H3).
 */
export function useProductDetail(slug: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${slug}:${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    status: ProductDetailStatus;
  }>({ key, status: { kind: "loading" } });

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();
    getProductDetail(slug, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted)
          setResult({ key, status: { kind: "ready", data: res.data } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ProductDetailError) {
          const notFound =
            error.code === "PRODUCT_NOT_AVAILABLE" ||
            error.code === "INVALID_PRODUCT_SLUG";
          setResult({
            key,
            status: notFound
              ? { kind: "not_available" }
              : { kind: "error", code: error.code },
          });
        } else {
          setResult({
            key,
            status: { kind: "error", code: "PRODUCT_CATALOG_UNAVAILABLE" },
          });
        }
      });

    // Cancelar petición en vuelo si el slug cambia o el componente desmonta.
    return () => controller.abort();
  }, [slug, key]);

  const retry = () => setAttempt((value) => value + 1);

  // Estado derivado: sin slug no hay consulta; sin respuesta para la clave
  // actual la ficha sigue cargando.
  const state: ProductDetailStatus = !slug
    ? { kind: "not_available" }
    : result.key === key
      ? result.status
      : { kind: "loading" };

  return { state, retry };
}
