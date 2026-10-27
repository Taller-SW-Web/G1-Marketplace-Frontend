import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProductCommerce } from "../../src/features/catalog/components/ProductCommerce";
import { RelatedProductsRegion } from "../../src/features/catalog/components/RelatedProductsRegion";
import {
  fetchProductPrice,
  normalizePrice,
  ProductPriceError,
} from "../../src/features/catalog/services/product-price.service";
import {
  fetchProductVariants,
  isSelectionComplete,
  findVariant,
  ProductVariantsError,
} from "../../src/features/catalog/services/product-variants.service";
import {
  fetchProductAvailability,
  ProductAvailabilityError,
} from "../../src/features/catalog/services/product-availability.service";
import {
  fetchRelatedProducts,
  MAX_RECOMMENDATIONS,
} from "../../src/features/catalog/services/product-recommendations.service";
import { pruneSelection } from "../../src/features/catalog/hooks/useProductVariants";
import { formatMoney } from "../../src/features/catalog/money";
import type { PriceDTO } from "../../src/features/catalog/types/product-price.types";
import { installBffFetchStub, restoreBffFetchStub } from "./bffFetch.stub";

beforeEach(() => {
  installBffFetchStub();
});
afterEach(() => {
  restoreBffFetchStub();
});

function commerce(slug: string, productId = "PRD-MOCK-001", showCart = true) {
  return (
    <ProductCommerce
      slug={slug}
      productId={productId}
      showCart={showCart}
      busy={false}
      onAdd={vi.fn()}
    />
  );
}

describe("F-012 · precio, oferta y descuento", () => {
  it("deriva la presentación de los importes autoritativos del BFF", async () => {
    const response = await fetchProductPrice("zapatillas-running-aero-x");
    expect(response.data.sku).toBe("SKU-MOCK-001");
    expect(response.data.price.regularAmount).toBe(299.9);
    expect(response.data.price.saleAmount).toBe(254.9);
    expect(response.data.price.discountPercent).toBe(15);
    expect(response.meta.channel).toBe("MARKETPLACE");
  });

  it("RC-F-012-02: sin oferta no inventa descuento", async () => {
    const response = await fetchProductPrice("producto-demostracion-2");
    expect(response.data.price.saleAmount).toBeNull();
    expect(response.data.price.discountPercent).toBeNull();
  });

  it("propaga los códigos públicos de error del contrato", async () => {
    await expect(fetchProductPrice("producto-variable-mock")).rejects.toMatchObject({
      code: "PRODUCT_VARIANT_SELECTION_REQUIRED",
      status: 409,
    });
    await expect(
      fetchProductPrice("producto-variable-mock", "SKU-MOCK-VAR-3"),
    ).rejects.toMatchObject({ code: "PRICE_NOT_AVAILABLE", status: 422 });
    await expect(
      fetchProductPrice("producto-variable-mock", "SKU-MOCK-OTRO"),
    ).rejects.toMatchObject({ code: "SKU_NOT_BELONG_TO_PRODUCT", status: 409 });
    await expect(
      fetchProductPrice("producto-error-502-precio-mock"),
    ).rejects.toBeInstanceOf(ProductPriceError);
  });

  it("RC-F-012-03: una oferta caducada retira badge y referencia juntos", () => {
    const price: PriceDTO = {
      regularAmount: 200,
      saleAmount: 170,
      currency: "PEN",
      discountPercent: 15,
      validFrom: "2026-09-01T00:00:00Z",
      validUntil: "2026-10-01T00:00:00Z",
      priceVersion: 8,
    };
    const expired = normalizePrice(price, new Date("2026-11-01T00:00:00Z"));
    expect(expired.saleAmount).toBeNull();
    expect(expired.discountPercent).toBeNull();
    expect(expired.validUntil).toBeNull();
    expect(expired.regularAmount).toBe(200);
  });

  it("formatea importes en es-PE", () => {
    expect(formatMoney(254.9, "PEN")).toBe("S/\u00A0254.90");
  });
});

describe("F-013 · selección de atributos y variante", () => {
  it("filtra variantes no activas y resuelve una combinación única", async () => {
    const response = await fetchProductVariants("producto-variable-mock");
    const data = response.data;
    expect(data.hasVariants).toBe(true);
    expect(data.variants).toHaveLength(3);
    expect(data.variants.every((variant) => variant.status === "ACTIVE")).toBe(
      true,
    );

    const selection = { color: "negro", size: "42" };
    expect(isSelectionComplete(data, selection)).toBe(true);
    expect(findVariant(data, selection)?.sku).toBe("SKU-MOCK-VAR-1");
  });

  it("RC-F-013-01: un cambio incompatible elimina el SKU previo", async () => {
    const { data } = await fetchProductVariants("producto-variable-mock");
    const pruned = pruneSelection(
      data,
      { color: "blanco", size: "43" },
      "color",
    );
    expect(pruned).toEqual({ color: "blanco" });
    expect(findVariant(data, pruned)).toBeUndefined();
  });

  it("RC-F-013-03: un producto simple no renderiza selector", async () => {
    render(commerce("zapatillas-running-aero-x"));
    expect(await screen.findByText(/S\/\s*254\.90/u)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Color" })).toBeNull();
  });

  it("deshabilita una combinación inexistente y consulta precio/stock del SKU nuevo", async () => {
    render(commerce("producto-variable-mock", "PRD-VAR-MOCK-001"));

    // Sin selección no se consulta precio ajeno (RC-F-012-01).
    expect(
      await screen.findByText("Selecciona una opción para ver el precio."),
    ).toBeTruthy();
    expect(
      screen.getByText("Selecciona una opción para consultar disponibilidad."),
    ).toBeTruthy();

    const color = await screen.findByRole("group", { name: "Color" });
    fireEvent.click(within(color).getByRole("button", { name: "Negro" }));
    const size = screen.getByRole("group", { name: "Talla" });
    fireEvent.click(within(size).getByRole("button", { name: "42" }));

    expect(await screen.findByText(/S\/\s*299\.90/u)).toBeTruthy();
    expect(await screen.findByText(/Disponible/u)).toBeTruthy();
    expect(
      screen.getByText("Selección: Color: Negro · Talla: 42."),
    ).toBeTruthy();

    // Blanco + 43 no existe: la opción queda deshabilitada con explicación.
    fireEvent.click(within(color).getByRole("button", { name: "Blanco" }));
    const size43 = within(screen.getByRole("group", { name: "Talla" })).getByRole(
      "button",
      { name: "43" },
    );
    expect((size43 as HTMLButtonElement).disabled).toBe(true);
    expect(
      within(screen.getByRole("group", { name: "Talla" })).getByRole("button", {
        name: "42",
      }),
    ).toBeTruthy();

    fireEvent.click(
      within(screen.getByRole("group", { name: "Talla" })).getByRole("button", {
        name: "42",
      }),
    );

    // El SKU nuevo no tiene precio vigente y está agotado: el importe anterior
    // desaparece y nunca se hereda.
    await waitFor(() =>
      expect(screen.queryByText(/S\/\s*299\.90/u)).toBeNull(),
    );
    expect(
      await screen.findByText("Precio no disponible por el momento."),
    ).toBeTruthy();
    expect(await screen.findByText(/Agotado/u)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Agregar al carrito" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("un error de variantes sólo reintenta la región", async () => {
    render(commerce("producto-error-503-variantes-mock", "PRD-X", false));
    expect(
      await screen.findByText("No pudimos cargar las opciones del producto."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Reintentar opciones" }),
    ).toBeTruthy();
  });

  it("valida el contrato antes de habilitar el selector", async () => {
    restoreBffFetchStub();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            productId: "PRD-1",
            hasVariants: true,
            attributes: [],
            variants: [],
          },
        }),
      })),
    );

    await expect(
      fetchProductVariants("producto-variable-mock"),
    ).rejects.toMatchObject({ code: "CATALOG_INVALID_RESPONSE", status: 502 });
    expect(new ProductVariantsError("CATALOG_UNAVAILABLE", 503).name).toBe(
      "ProductVariantsError",
    );
  });
});

describe("F-014 · disponibilidad comercial", () => {
  it("mapea los tres estados por SKU sin cantidades ni ubicaciones", async () => {
    const available = await fetchProductAvailability(
      "producto-variable-mock",
      "SKU-MOCK-VAR-1",
    );
    const low = await fetchProductAvailability(
      "producto-variable-mock",
      "SKU-MOCK-VAR-2",
    );
    const out = await fetchProductAvailability(
      "producto-variable-mock",
      "SKU-MOCK-VAR-3",
    );
    expect(available.data.availability).toBe("AVAILABLE");
    expect(low.data.availability).toBe("STOCK_LOW");
    expect(out.data.availability).toBe("OUT_OF_STOCK");
    expect(available.data).not.toHaveProperty("quantity");
    expect(available.data).not.toHaveProperty("locationId");
  });

  it("RC-F-014-01: un fallo de inventario no se presenta como agotado", async () => {
    await expect(
      fetchProductAvailability("producto-error-503-stock-mock", undefined),
    ).rejects.toBeInstanceOf(ProductAvailabilityError);

    render(commerce("producto-error-503-stock-mock", "PRD-X", false));
    expect(
      await screen.findByText("No pudimos consultar disponibilidad."),
    ).toBeTruthy();
    expect(screen.queryByText(/Agotado/u)).toBeNull();
    expect(
      document.querySelector('[data-error-code="INVENTORY_UNAVAILABLE"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Reintentar disponibilidad" }),
    ).toBeTruthy();
  });

  it("RC-F-014-02: sin SKU no consulta ni muestra un estado ficticio", () => {
    render(commerce("producto-variable-mock", "PRD-VAR-MOCK-001", false));
    expect(
      screen.getByText("Selecciona una opción para consultar disponibilidad."),
    ).toBeTruthy();
    expect(screen.queryByText("Disponible")).toBeNull();
  });
});

describe("F-015 · productos relacionados", () => {
  it("conserva el orden del BFF y no convierte precio null en cero", async () => {
    const cards = await fetchRelatedProducts("zapatillas-running-aero-x");
    expect(cards.map((card) => card.slug)).toEqual([
      "producto-demostracion-1",
      "producto-demostracion-2",
      "producto-demostracion-3",
      "producto-demostracion-4",
    ]);
    expect(cards[2].price).toBeNull();
  });

  it("renderiza hasta 8 tarjetas enlazadas a la ficha", async () => {
    render(<RelatedProductsRegion slug="zapatillas-running-aero-x" />);
    expect(
      await screen.findByRole("heading", { name: "Productos relacionados" }),
    ).toBeTruthy();

    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links[0].getAttribute("href")).toBe(
      "/productos/producto-demostracion-1",
    );

    const third = screen.getByText("Mochila deportiva 03").closest("a");
    expect(third?.querySelector(".related-price")).toBeNull();
  });

  it("RC-F-015-01/02: vacío o error omite título y región", async () => {
    const { unmount } = render(
      <RelatedProductsRegion slug="producto-sin-relacionados-mock" />,
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Productos relacionados" }),
      ).toBeNull(),
    );
    unmount();

    render(<RelatedProductsRegion slug="producto-error-recomendaciones-mock" />);
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Productos relacionados" }),
      ).toBeNull(),
    );
  });

  it("el adaptador degrada fallos de transporte a arreglo vacío", async () => {
    restoreBffFetchStub();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    await expect(
      fetchRelatedProducts("zapatillas-running-aero-x"),
    ).resolves.toEqual([]);
    expect(MAX_RECOMMENDATIONS).toBe(8);
  });
});
