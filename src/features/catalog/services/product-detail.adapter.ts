import {
  fetchProductDetail,
  isValidProductSlug,
  ProductDetailError,
} from "./product-detail.service";
import type { ProductDetailResponseDTO } from "../types/product-detail.types";

/**
 * Punto de entrada de la ficha F-011.
 *
 * El modo MOCK vive en el BFF (`BFF_MODE=mock`): aquí SIEMPRE se consulta el
 * proxy server-only → BFF (Frontend → BFF MOCK en H3), nunca datos locales ni
 * Productos y Ofertas (gate I-01). En H3 el BFF responde con fixtures y
 * `meta.source="MOCK"`, de donde se deriva el aviso de demostración.
 */
export async function getProductDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetailResponseDTO> {
  // La validación de slug aplica siempre: nunca se consulta con un slug que
  // el contrato rechazaría (400 INVALID_PRODUCT_SLUG).
  if (!isValidProductSlug(slug)) {
    throw new ProductDetailError("INVALID_PRODUCT_SLUG", 400);
  }

  return fetchProductDetail(slug, signal);
}
