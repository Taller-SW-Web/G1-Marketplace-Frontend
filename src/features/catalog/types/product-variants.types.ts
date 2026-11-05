/** Contrato F-013 — Atributos y variantes del producto (BFF Marketplace). */

export interface VariantAttributeValueDTO {
  id: string;
  label: string;
}

export interface VariantAttributeDTO {
  id: string;
  label: string;
  values: VariantAttributeValueDTO[];
}

export interface VariantImageDTO {
  url: string;
  alt: string;
}

export interface ProductVariantDTO {
  variantId: string;
  sku: string;
  status: "ACTIVE";
  attributes: Record<string, string>;
  image: VariantImageDTO | null;
}

export interface ProductVariantsDTO {
  productId: string;
  hasVariants: boolean;
  attributes: VariantAttributeDTO[];
  variants: ProductVariantDTO[];
}

export interface ProductVariantsResponseDTO {
  data: ProductVariantsDTO;
}

export type VariantErrorCode =
  | "INVALID_PRODUCT_SLUG"
  | "PRODUCT_NOT_AVAILABLE"
  | "CATALOG_INVALID_RESPONSE"
  | "CATALOG_UNAVAILABLE"
  | "CATALOG_TIMEOUT";

/** Selección por ID de atributo; el SKU se deriva de la combinación única. */
export type AttributeSelection = Record<string, string>;

/**
 * Estados de la región F-013:
 *   LOADING → SIMPLE | INCOMPLETE | VALID | ERROR
 *
 * `selection` se conserva mientras exista al menos una variante compatible;
 * una combinación inválida elimina el SKU anterior (RC-F-013-01).
 */
export type ProductVariantsState =
  | { kind: "loading" }
  | { kind: "simple"; data: ProductVariantsDTO }
  | {
      kind: "selecting";
      data: ProductVariantsDTO;
      selection: AttributeSelection;
    }
  | {
      kind: "valid";
      data: ProductVariantsDTO;
      selection: AttributeSelection;
      variant: ProductVariantDTO;
    }
  | { kind: "error"; code: VariantErrorCode };
