import {
  MOCK_PRODUCT_NO_SPECS,
  MOCK_PRODUCT_SIMPLE,
} from "../fixtures/product-detail.fixture";
import {
  fetchProductDetail,
  isValidProductSlug,
  ProductDetailError,
} from "./product-detail.service";
import type { ProductDetailResponseDTO } from "../types/product-detail.types";

const MOCK_LATENCY_MS = 400;

/** Selector MOCK/REAL — activado por NEXT_PUBLIC_BFF_MODE=mock */
export async function getProductDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetailResponseDTO> {
  // La validación de slug aplica en ambos modos: nunca se consulta con un
  // slug que el contrato rechazaría.
  if (!isValidProductSlug(slug)) {
    throw new ProductDetailError("INVALID_PRODUCT_SLUG", 400);
  }

  if (process.env.NEXT_PUBLIC_BFF_MODE === "mock") {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS)); // simular latencia
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (slug === "producto-no-existente-mock")
      throw new ProductDetailError("PRODUCT_NOT_AVAILABLE", 404);
    if (slug === "producto-error-503-mock")
      throw new ProductDetailError("PRODUCT_CATALOG_UNAVAILABLE", 503);
    if (slug === "producto-error-504-mock")
      throw new ProductDetailError("PRODUCT_CATALOG_TIMEOUT", 504);
    if (slug === "producto-sin-specs-mock") return MOCK_PRODUCT_NO_SPECS;
    return MOCK_PRODUCT_SIMPLE;
  }

  return fetchProductDetail(slug, signal);
}
