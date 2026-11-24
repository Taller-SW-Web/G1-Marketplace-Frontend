/** Contrato F-015 — Productos relacionados (BFF Marketplace). */

export type RecommendationType = "CROSS_SELL" | "UPSELL";

export interface RecommendationPriceDTO {
  amount: number;
  currency: string;
}

export interface RecommendationImageDTO {
  url: string;
  alt: string;
}

export interface RecommendationCardDTO {
  productId: string;
  slug: string;
  name: string;
  image: RecommendationImageDTO;
  type: RecommendationType;
  /** El precio es informativo y opcional; `null` nunca equivale a cero. */
  price: RecommendationPriceDTO | null;
  presentationOrder: number;
}

export interface RecommendationsResponseDTO {
  data: RecommendationCardDTO[];
  meta: { sourceProductId: string };
}

export type RecommendationsErrorCode =
  | "INVALID_PRODUCT_SLUG"
  | "RECOMMENDATIONS_INVALID_RESPONSE";

/**
 * Región no crítica: `omitted` cubre tanto el arreglo vacío válido como el
 * fallo técnico degradado; en ambos casos se omite título y sección completos.
 */
export type RelatedProductsState =
  | { kind: "loading" }
  | { kind: "ready"; data: RecommendationCardDTO[] }
  | { kind: "omitted" };
