/** Contrato F-014 — Disponibilidad comercial por SKU (BFF Marketplace). */

export const COMMERCIAL_AVAILABILITY = [
  "AVAILABLE",
  "STOCK_LOW",
  "OUT_OF_STOCK",
] as const;

export type CommercialAvailability = (typeof COMMERCIAL_AVAILABILITY)[number];

export interface ProductAvailabilityDTO {
  productId: string;
  sku: string;
  availability: CommercialAvailability;
  checkedAt: string;
}

export interface ProductAvailabilityResponseDTO {
  data: ProductAvailabilityDTO;
}

export type AvailabilityErrorCode =
  | "INVALID_PRODUCT_SLUG"
  | "PRODUCT_NOT_AVAILABLE"
  | "PRODUCT_VARIANT_SELECTION_REQUIRED"
  | "SKU_NOT_BELONG_TO_PRODUCT"
  | "INVENTORY_INVALID_RESPONSE"
  | "INVENTORY_UNAVAILABLE"
  | "INVENTORY_TIMEOUT";

/**
 * Estados de la región F-014:
 *   WAITING_FOR_SKU → LOADING → AVAILABLE | STOCK_LOW | OUT_OF_STOCK | ERROR
 *
 * Un error de inventario nunca se degrada a `OUT_OF_STOCK` (RC-F-014-01).
 */
export type ProductAvailabilityState =
  | { kind: "waiting_for_sku" }
  | { kind: "loading" }
  | {
      kind: "ready";
      availability: CommercialAvailability;
      checkedAt: string;
    }
  | { kind: "error"; code: AvailabilityErrorCode };
