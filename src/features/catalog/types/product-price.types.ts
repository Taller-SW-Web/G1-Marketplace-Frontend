/** Contrato F-012 — Precio, oferta y descuento vigente (BFF Marketplace). */

export interface PriceDTO {
  regularAmount: number;
  saleAmount: number | null;
  currency: string;
  discountPercent: number | null;
  validFrom: string;
  validUntil: string | null;
  priceVersion: number;
}

export interface ProductPriceDTO {
  productId: string;
  sku: string;
  price: PriceDTO;
}

export interface ProductPriceResponseDTO {
  data: ProductPriceDTO;
  meta: { channel: "MARKETPLACE"; retrievedAt: string };
}

export type ProductPriceErrorCode =
  | "INVALID_PRODUCT_SLUG"
  | "PRODUCT_NOT_AVAILABLE"
  | "PRODUCT_VARIANT_SELECTION_REQUIRED"
  | "SKU_NOT_BELONG_TO_PRODUCT"
  | "PRICE_NOT_AVAILABLE"
  | "PRICING_INVALID_RESPONSE"
  | "PRICING_UNAVAILABLE"
  | "PRICING_TIMEOUT";

/**
 * Estados de la región F-012. `WAITING_FOR_VARIANT` no consulta ni muestra un
 * importe de otra alternativa (RN-F012-05).
 */
export type ProductPriceState =
  | { kind: "waiting_for_variant" }
  | { kind: "loading" }
  | { kind: "regular"; data: ProductPriceDTO; retrievedAt: string }
  | { kind: "sale"; data: ProductPriceDTO; retrievedAt: string }
  | { kind: "unavailable"; code: ProductPriceErrorCode };
