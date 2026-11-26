import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ProductCommerce } from "../../src/features/catalog/components/ProductCommerce";
import { ProductDetailContainer } from "../../src/features/catalog/components/ProductDetailContainer";
import { installBffFetchStub, restoreBffFetchStub } from "./bffFetch.stub";

beforeEach(() => {
  installBffFetchStub();
});
afterEach(() => {
  restoreBffFetchStub();
});

const selectNegro42 = async () => {
  const color = await screen.findByRole("group", { name: "Color" });
  fireEvent.click(within(color).getByRole("button", { name: "Negro" }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Talla" })).getByRole("button", {
      name: "42",
    }),
  );
};

describe("F-013 → F-011: imagen de la variante en la galería", () => {
  it("la vista principal cambia a la imagen de la combinación elegida", async () => {
    render(<ProductDetailContainer slug="producto-variable-mock" />);
    await screen.findByRole("heading", { level: 1 });

    const mainImage = () =>
      document.querySelector<HTMLImageElement>(".gallery-main img");
    expect(mainImage()?.getAttribute("src")).toBe("https://placehold.co/600x400");

    await selectNegro42();

    await waitFor(() =>
      expect(mainImage()?.getAttribute("src")).toBe(
        "https://placehold.co/600x400?text=AERO-NEGRO-42",
      ),
    );
    expect(mainImage()?.getAttribute("alt")).toBe("Zapatilla negro talla 42");
  });

  it("el visor amplía la imagen de la variante que se está viendo", async () => {
    render(<ProductDetailContainer slug="producto-variable-mock" />);
    await screen.findByRole("heading", { level: 1 });
    await selectNegro42();

    await waitFor(() =>
      expect(
        document.querySelector<HTMLImageElement>(".gallery-main img")?.src,
      ).toContain("AERO-NEGRO-42"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog)
        .getByRole("img")
        .getAttribute("src"),
    ).toBe("https://placehold.co/600x400?text=AERO-NEGRO-42");
  });
});

describe("F-013 → F-016: SKU de la variante en el carrito", () => {
  it("el CTA envía el SKU de la combinación elegida junto al producto", async () => {
    const onAdd = vi.fn();
    render(
      <ProductCommerce
        slug="producto-variable-mock"
        productId="PRD-VAR-MOCK-001"
        showCart
        busy={false}
        onAdd={onAdd}
      />,
    );

    await selectNegro42();

    const cta = await screen.findByRole("button", {
      name: "Agregar al carrito",
    });
    await waitFor(() => expect((cta as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(cta);

    expect(onAdd).toHaveBeenCalledWith({
      productId: "PRD-VAR-MOCK-001",
      sku: "SKU-MOCK-VAR-1",
      quantity: 1,
    });
  });
});
