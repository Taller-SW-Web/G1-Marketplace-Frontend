import { vi } from "vitest";
import {
  MOCK_PRODUCT_NO_SPECS,
  MOCK_PRODUCT_SIMPLE,
} from "../../src/features/catalog/fixtures/product-detail.fixture";
import type { ProductDetailResponseDTO } from "../../src/features/catalog/types/product-detail.types";
import type { ProductVariantsResponseDTO } from "../../src/features/catalog/types/product-variants.types";
import type { ProductAvailabilityResponseDTO } from "../../src/features/catalog/types/product-availability.types";
import type { RecommendationsResponseDTO } from "../../src/features/catalog/types/product-recommendations.types";

/**
 * Stub global de `fetch` que replica los contratos del BFF:
 *   - F-011: productos conocidos → 200 con ficha; slugs especiales → 404/503/504.
 *   - F-012 price, F-013 variants, F-014 availability, F-015 recommendations.
 *
 * Instalar con `installBffFetchStub()` en `beforeEach` y liberar con
 * `restoreBffFetchStub()` en `afterEach`.
 */

const DEMO_NAMES = [
  "Zapatillas de running",
  "Polo de entrenamiento",
  "Mochila deportiva",
  "Short de running",
];

const DEMO_PRODUCT = /^producto-demostracion-(?:[1-9]|[12][0-9]|3[0-2])$/;
const DEMO_PRODUCT_NUMBER = /^producto-demostracion-(\d{1,2})$/;

function demoProduct(slug: string): ProductDetailResponseDTO {
  const number = Number(slug.split("-").pop());
  const name = `${DEMO_NAMES[(number - 1) % DEMO_NAMES.length]} ${String(number).padStart(2, "0")}`;
  return {
    ...MOCK_PRODUCT_SIMPLE,
    data: {
      ...MOCK_PRODUCT_SIMPLE.data,
      productId: `mock-product-${number}`,
      slug,
      name,
    },
  };
}

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function problem(status: number, code: string): Response {
  return jsonResponse(status, { status, code });
}

function resolveSlug(slug: string): Response {
  if (slug === "producto-error-503-mock") return jsonResponse(503);
  if (slug === "producto-error-504-mock") return jsonResponse(504);
  if (slug === "producto-sin-specs-mock")
    return jsonResponse(200, MOCK_PRODUCT_NO_SPECS);
  if (slug === "zapatillas-running-aero-x")
    return jsonResponse(200, MOCK_PRODUCT_SIMPLE);
  if (slug === "producto-variable-mock")
    return jsonResponse(200, {
      ...MOCK_PRODUCT_SIMPLE,
      data: {
        ...MOCK_PRODUCT_SIMPLE.data,
        productId: "PRD-VAR-MOCK-001",
        slug,
        name: "Zapatillas Variable Mock [MOCK]",
      },
    });
  if (DEMO_PRODUCT.test(slug)) return jsonResponse(200, demoProduct(slug));
  return jsonResponse(404); // producto inexistente
}

function demoPricing(number: number) {
  const regularAmount = Math.round((79.9 + number * 10) * 100) / 100;
  const saleAmount =
    number % 4 === 0
      ? Math.round(regularAmount * 0.85 * 100) / 100
      : null;
  return { regularAmount, saleAmount };
}

function priceBody(
  productId: string,
  sku: string,
  regularAmount: number,
  saleAmount: number | null,
  priceVersion = 1,
) {
  return {
    data: {
      productId,
      sku,
      price: {
        regularAmount,
        saleAmount,
        currency: "PEN",
        discountPercent:
          saleAmount === null
            ? null
            : Math.round(
                ((regularAmount - saleAmount) / regularAmount) * 100,
              ),
        validFrom: "2026-09-01T00:00:00Z",
        validUntil: saleAmount === null ? null : "2026-12-31T23:59:59Z",
        priceVersion,
      },
    },
    meta: { channel: "MARKETPLACE", retrievedAt: new Date().toISOString() },
  };
}

function resolvePrice(slug: string, sku: string | null): Response {
  if (slug === "producto-error-422-precio-mock")
    return problem(422, "PRICE_NOT_AVAILABLE");
  if (slug === "producto-error-502-precio-mock")
    return problem(502, "PRICING_INVALID_RESPONSE");
  if (slug === "producto-error-503-precio-mock")
    return problem(503, "PRICING_UNAVAILABLE");
  if (slug === "producto-error-504-precio-mock")
    return problem(504, "PRICING_TIMEOUT");

  if (slug === "zapatillas-running-aero-x") {
    return jsonResponse(
      200,
      priceBody("PRD-MOCK-001", "SKU-MOCK-001", 299.9, 254.9, 8),
    );
  }

  if (slug === "producto-variable-mock") {
    if (!sku) return problem(409, "PRODUCT_VARIANT_SELECTION_REQUIRED");
    if (sku === "SKU-MOCK-VAR-1")
      return jsonResponse(
        200,
        priceBody("PRD-VAR-MOCK-001", sku, 349.9, 299.9, 3),
      );
    if (sku === "SKU-MOCK-VAR-2")
      return jsonResponse(
        200,
        priceBody("PRD-VAR-MOCK-001", sku, 349.9, null, 3),
      );
    if (sku === "SKU-MOCK-VAR-3") return problem(422, "PRICE_NOT_AVAILABLE");
    return problem(409, "SKU_NOT_BELONG_TO_PRODUCT");
  }

  if (DEMO_PRODUCT.test(slug)) {
    const number = Number(DEMO_PRODUCT_NUMBER.exec(slug)?.[1] ?? 1);
    const expectedSku = `SKU-MOCK-${String(number + 1).padStart(3, "0")}`;
    if (sku && sku !== expectedSku)
      return problem(409, "SKU_NOT_BELONG_TO_PRODUCT");
    const { regularAmount, saleAmount } = demoPricing(number);
    return jsonResponse(
      200,
      priceBody(`mock-product-${number}`, expectedSku, regularAmount, saleAmount),
    );
  }

  return problem(404, "PRODUCT_NOT_AVAILABLE");
}

const VARIABLE_VARIANTS: ProductVariantsResponseDTO = {
  data: {
    productId: "PRD-VAR-MOCK-001",
    hasVariants: true,
    attributes: [
      {
        id: "color",
        label: "Color",
        values: [
          { id: "negro", label: "Negro" },
          { id: "blanco", label: "Blanco" },
        ],
      },
      {
        id: "size",
        label: "Talla",
        values: [
          { id: "42", label: "42" },
          { id: "43", label: "43" },
        ],
      },
    ],
    variants: [
      {
        variantId: "VAR-MOCK-1",
        sku: "SKU-MOCK-VAR-1",
        status: "ACTIVE",
        attributes: { color: "negro", size: "42" },
        image: {
          url: "https://placehold.co/600x400?text=AERO-NEGRO-42",
          alt: "Zapatilla negro talla 42",
        },
      },
      {
        variantId: "VAR-MOCK-2",
        sku: "SKU-MOCK-VAR-2",
        status: "ACTIVE",
        attributes: { color: "negro", size: "43" },
        image: {
          url: "https://placehold.co/600x400?text=AERO-NEGRO-43",
          alt: "Zapatilla negro talla 43",
        },
      },
      {
        variantId: "VAR-MOCK-3",
        sku: "SKU-MOCK-VAR-3",
        status: "ACTIVE",
        attributes: { color: "blanco", size: "42" },
        image: {
          url: "https://placehold.co/600x400?text=AERO-BLANCO-42",
          alt: "Zapatilla blanco talla 42",
        },
      },
    ],
  },
};

function simpleVariants(productId: string): ProductVariantsResponseDTO {
  return {
    data: { productId, hasVariants: false, attributes: [], variants: [] },
  };
}

function resolveVariants(slug: string): Response {
  if (slug === "producto-error-502-variantes-mock")
    return problem(502, "CATALOG_INVALID_RESPONSE");
  if (slug === "producto-error-503-variantes-mock")
    return problem(503, "CATALOG_UNAVAILABLE");
  if (slug === "producto-error-504-variantes-mock")
    return problem(504, "CATALOG_TIMEOUT");
  if (slug === "zapatillas-running-aero-x")
    return jsonResponse(200, simpleVariants("PRD-MOCK-001"));
  if (slug === "producto-variable-mock")
    return jsonResponse(200, VARIABLE_VARIANTS);
  if (DEMO_PRODUCT.test(slug)) {
    const number = Number(DEMO_PRODUCT_NUMBER.exec(slug)?.[1] ?? 1);
    return jsonResponse(200, simpleVariants(`mock-product-${number}`));
  }
  return problem(404, "PRODUCT_NOT_AVAILABLE");
}

function availabilityBody(
  productId: string,
  sku: string,
  availability: "AVAILABLE" | "STOCK_LOW" | "OUT_OF_STOCK",
): ProductAvailabilityResponseDTO {
  return {
    data: {
      productId,
      sku,
      availability,
      checkedAt: new Date().toISOString(),
    },
  };
}

function resolveAvailability(slug: string, sku: string | null): Response {
  if (slug === "producto-error-502-stock-mock")
    return problem(502, "INVENTORY_INVALID_RESPONSE");
  if (slug === "producto-error-503-stock-mock")
    return problem(503, "INVENTORY_UNAVAILABLE");
  if (slug === "producto-error-504-stock-mock")
    return problem(504, "INVENTORY_TIMEOUT");

  if (slug === "zapatillas-running-aero-x") {
    return jsonResponse(
      200,
      availabilityBody("PRD-MOCK-001", "SKU-MOCK-001", "AVAILABLE"),
    );
  }

  if (slug === "producto-variable-mock") {
    if (!sku) return problem(409, "PRODUCT_VARIANT_SELECTION_REQUIRED");
    if (sku === "SKU-MOCK-VAR-1")
      return jsonResponse(
        200,
        availabilityBody("PRD-VAR-MOCK-001", sku, "AVAILABLE"),
      );
    if (sku === "SKU-MOCK-VAR-2")
      return jsonResponse(
        200,
        availabilityBody("PRD-VAR-MOCK-001", sku, "STOCK_LOW"),
      );
    if (sku === "SKU-MOCK-VAR-3")
      return jsonResponse(
        200,
        availabilityBody("PRD-VAR-MOCK-001", sku, "OUT_OF_STOCK"),
      );
    return problem(409, "SKU_NOT_BELONG_TO_PRODUCT");
  }

  if (DEMO_PRODUCT.test(slug)) {
    const number = Number(DEMO_PRODUCT_NUMBER.exec(slug)?.[1] ?? 1);
    const expectedSku = `SKU-MOCK-${String(number + 1).padStart(3, "0")}`;
    if (sku && sku !== expectedSku)
      return problem(409, "SKU_NOT_BELONG_TO_PRODUCT");
    const availability =
      number % 5 === 0
        ? "OUT_OF_STOCK"
        : number % 3 === 0
          ? "STOCK_LOW"
          : "AVAILABLE";
    return jsonResponse(
      200,
      availabilityBody(`mock-product-${number}`, expectedSku, availability),
    );
  }

  return problem(404, "PRODUCT_NOT_AVAILABLE");
}

function recommendationCard(
  number: number,
  presentationOrder: number,
  type: "CROSS_SELL" | "UPSELL",
  withPrice: boolean,
) {
  const name = `${DEMO_NAMES[(number - 1) % DEMO_NAMES.length]} ${String(number).padStart(2, "0")}`;
  return {
    productId: `mock-product-${number}`,
    slug: `producto-demostracion-${number}`,
    name,
    image: {
      url: `https://placehold.co/600x400?text=${number}A`,
      alt: `${name} [MOCK]`,
    },
    type,
    price: withPrice
      ? {
          amount: Math.round((79.9 + number * 10) * 100) / 100,
          currency: "PEN",
        }
      : null,
    presentationOrder,
  };
}

function recommendationsBody(
  sourceProductId: string,
  numbers: number[],
): RecommendationsResponseDTO {
  return {
    data: numbers.map((number, index) =>
      recommendationCard(
        number,
        index + 1,
        index === 1 ? "UPSELL" : "CROSS_SELL",
        index !== 2,
      ),
    ),
    meta: { sourceProductId },
  };
}

function resolveRecommendations(slug: string): Response {
  if (
    slug === "producto-sin-relacionados-mock" ||
    slug === "producto-error-recomendaciones-mock"
  ) {
    return jsonResponse(200, { data: [], meta: { sourceProductId: "PRD-MOCK-NONE" } });
  }
  if (slug === "zapatillas-running-aero-x") {
    return jsonResponse(200, recommendationsBody("PRD-MOCK-001", [1, 2, 3, 4]));
  }
  if (slug === "producto-variable-mock") {
    return jsonResponse(
      200,
      recommendationsBody("PRD-VAR-MOCK-001", [5, 6, 7]),
    );
  }
  if (DEMO_PRODUCT.test(slug)) {
    const number = Number(DEMO_PRODUCT_NUMBER.exec(slug)?.[1] ?? 1);
    const related = [1, 2, 3].map(
      (offset) => ((number - 1 + offset) % 32) + 1,
    );
    return jsonResponse(
      200,
      recommendationsBody(`mock-product-${number}`, related),
    );
  }
  return jsonResponse(200, { data: [], meta: { sourceProductId: "UNKNOWN" } });
}

function resolveCommerce(
  slug: string,
  subpath: string,
  url: URL,
): Response {
  const sku = url.searchParams.get("sku");
  if (subpath === "price") return resolvePrice(slug, sku);
  if (subpath === "variants") return resolveVariants(slug);
  if (subpath === "availability") return resolveAvailability(slug, sku);
  if (subpath === "recommendations") return resolveRecommendations(slug);
  return jsonResponse(404);
}

export function installBffFetchStub(): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://marketplace.test");
    const parts = url.pathname.split("/").filter(Boolean);
    const productsIndex = parts.indexOf("products");
    const slug = decodeURIComponent(parts[productsIndex + 1] ?? "");
    const subpath = parts[productsIndex + 2];
    if (subpath) return resolveCommerce(slug, subpath, url);
    return resolveSlug(slug);
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

export function restoreBffFetchStub(): void {
  vi.unstubAllGlobals();
}
