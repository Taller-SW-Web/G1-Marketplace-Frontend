import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProductDetailContainer } from "../../src/features/catalog/components/ProductDetailContainer";
import { installBffFetchStub, restoreBffFetchStub } from "./bffFetch.stub";

const SLUG = "producto-variable-mock";

/** Hace que el detalle declare `meta.source = REAL`, como el BFF desplegado tras BE #438. */
function declareDetailAsReal() {
  const stub = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await stub(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (new URL(url, "http://localhost").pathname.endsWith(`/products/${SLUG}`)) {
      const body = await response.json();
      return new Response(JSON.stringify({ ...body, meta: { ...body.meta, source: "REAL" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return response;
  }) as typeof fetch;
}

beforeEach(() => {
  installBffFetchStub();
  declareDetailAsReal();
});
afterEach(() => {
  restoreBffFetchStub();
});

describe("ficha con fuente REAL (precio y disponibilidad del BFF, BE #438)", () => {
  it("permite agregar al carrito y no muestra el aviso de demostración", async () => {
    render(<ProductDetailContainer slug={SLUG} showAddToCart />);
    await screen.findByRole("heading", { level: 1 });

    const color = await screen.findByRole("group", { name: "Color" });
    fireEvent.click(within(color).getByRole("button", { name: "Negro" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Talla" })).getByRole("button", { name: "42" }),
    );

    const cta = (await screen.findByRole("button", { name: "Agregar al carrito" })) as HTMLButtonElement;
    // Debe estar ACTIVO (con la guarda antigua solo existía un botón desactivado).
    await waitFor(() => expect(cta.disabled).toBe(false));
    expect(screen.queryByText(/aún no está habilitada/)).toBeNull();
    expect(screen.queryByText(/Ficha de demostración/)).toBeNull();
  });
});
