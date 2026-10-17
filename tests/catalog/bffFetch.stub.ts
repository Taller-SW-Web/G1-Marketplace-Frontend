import { vi } from "vitest";
import {
  MOCK_PRODUCT_NO_SPECS,
  MOCK_PRODUCT_SIMPLE,
} from "../../src/features/catalog/fixtures/product-detail.fixture";
import type { ProductDetailResponseDTO } from "../../src/features/catalog/types/product-detail.types";

/**
 * Stub global de `fetch` que replica el contrato del BFF F-011 (espejo de
 * `src/catalog` del backend): productos conocidos → 200 con ficha y
 * meta.source=MOCK; slugs especiales → 404/503/504; desconocidos → 404.
 * Instalar con `installBffFetchStub()` en `beforeEach` y liberar con
 * `restoreBffFetchStub()` en `afterEach`.
 */

const DEMO_NAMES = [
  "Zapatillas de running",
  "Polo de entrenamiento",
  "Mochila deportiva",
  "Short de running",
];

function demoProduct(slug: string): ProductDetailResponseDTO {
  const number = Number(slug.split("-").pop());
  const name = `${DEMO_NAMES[(number - 1) % DEMO_NAMES.length]} ${String(number).padStart(2, "0")}`;
  return {
    ...MOCK_PRODUCT_SIMPLE,
    data: { ...MOCK_PRODUCT_SIMPLE.data, productId: `mock-product-${number}`, slug, name },
  };
}

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function resolveSlug(slug: string): Response {
  if (slug === "producto-error-503-mock") return jsonResponse(503);
  if (slug === "producto-error-504-mock") return jsonResponse(504);
  if (slug === "producto-sin-specs-mock")
    return jsonResponse(200, MOCK_PRODUCT_NO_SPECS);
  if (slug === "zapatillas-running-aero-x")
    return jsonResponse(200, MOCK_PRODUCT_SIMPLE);
  if (/^producto-demostracion-(?:[1-9]|[12][0-9]|3[0-2])$/.test(slug))
    return jsonResponse(200, demoProduct(slug));
  return jsonResponse(404); // producto inexistente
}

export function installBffFetchStub(): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const slug = decodeURIComponent(
      url.split("/products/")[1]?.split("?")[0] ?? "",
    );
    return resolveSlug(slug);
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

export function restoreBffFetchStub(): void {
  vi.unstubAllGlobals();
}
