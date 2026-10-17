/** ⚠️ MOCK — Solo desarrollo local. No usar en producción. */
import type { ProductDetailResponseDTO } from "../types/product-detail.types";

export const MOCK_PRODUCT_SIMPLE: ProductDetailResponseDTO = {
  data: {
    productId: "PRD-MOCK-001",
    slug: "zapatillas-running-aero-x",
    name: "Zapatillas Running Aero X [MOCK]",
    brand: { brandId: "BR-MOCK", name: "BrandMock" },
    description:
      "Descripción de prueba. Producto ficticio [MOCK]. No corresponde a un artículo real.",
    technicalSpecifications: [
      {
        group: "Características",
        name: "Material",
        value: "Malla técnica",
        displayOrder: 1,
      },
      {
        group: "Características",
        name: "Peso",
        value: "280",
        unit: "g",
        displayOrder: 2,
      },
    ],
    media: [
      {
        mediaId: "MED-001",
        type: "IMAGE",
        url: "https://placehold.co/600x400",
        alt: "Vista frontal [MOCK]",
        displayOrder: 1,
      },
      {
        mediaId: "MED-002",
        type: "IMAGE",
        url: "https://placehold.co/600x400?text=2",
        alt: "Vista lateral [MOCK]",
        displayOrder: 2,
      },
    ],
  },
  meta: { source: "MOCK", retrievedAt: new Date().toISOString() },
};

export const MOCK_PRODUCT_NO_SPECS: ProductDetailResponseDTO = {
  ...MOCK_PRODUCT_SIMPLE,
  data: {
    ...MOCK_PRODUCT_SIMPLE.data,
    technicalSpecifications: [],
  },
};

export const MOCK_MEDIA = MOCK_PRODUCT_SIMPLE.data.media;

// Slugs especiales para pruebas:
// 'producto-no-existente-mock'  → simula 404
// 'producto-error-503-mock'     → simula error de servicio
// 'producto-sin-specs-mock'     → sin especificaciones técnicas
// Cualquier otro slug válido devuelve MOCK_PRODUCT_SIMPLE.
