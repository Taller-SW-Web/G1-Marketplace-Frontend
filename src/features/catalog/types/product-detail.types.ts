export interface ProductBrandDTO {
  brandId: string;
  name: string;
}

export interface ProductMediaDTO {
  mediaId: string;
  type: "IMAGE";
  url: string;
  alt: string; // obligatorio; BFF genera fallback si falta
  displayOrder: number;
}

export interface TechnicalSpecificationDTO {
  group?: string;
  name: string;
  value: string;
  unit?: string | null;
  displayOrder: number;
}

export interface ProductDetailDTO {
  productId: string;
  slug: string;
  name: string;
  brand: ProductBrandDTO;
  description?: string;
  technicalSpecifications: TechnicalSpecificationDTO[];
  media: ProductMediaDTO[]; // nunca vacío para producto activo
}

export interface ProductDetailResponseDTO {
  data: ProductDetailDTO;
  meta: { source: string; retrievedAt: string };
}

// Estados de la máquina F-011
export type ProductDetailStatus =
  | { kind: "loading" }
  // `source` viene del `meta.source` del BFF: gobierna el aviso [MOCK].
  | { kind: "ready"; data: ProductDetailDTO; source?: string }
  | { kind: "not_available" } // 404 / slug inválido
  | { kind: "error"; code: ProductDetailErrorCode };

export type ProductDetailErrorCode =
  | "INVALID_PRODUCT_SLUG"
  | "PRODUCT_NOT_AVAILABLE"
  | "PRODUCT_CATALOG_INVALID_RESPONSE"
  | "PRODUCT_CATALOG_UNAVAILABLE"
  | "PRODUCT_CATALOG_TIMEOUT";
