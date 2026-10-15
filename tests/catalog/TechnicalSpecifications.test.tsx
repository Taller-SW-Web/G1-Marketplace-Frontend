import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TechnicalSpecifications } from "../../src/features/catalog/components/TechnicalSpecifications";
import { MOCK_PRODUCT_SIMPLE } from "../../src/features/catalog/fixtures/product-detail.fixture";

const SPECS = MOCK_PRODUCT_SIMPLE.data.technicalSpecifications;

describe("TechnicalSpecifications (F-011)", () => {
  it("RC-F-011-05: la descripción maliciosa no ejecuta código", () => {
    render(
      <TechnicalSpecifications
        specs={[]}
        description={'<script>window.__xss=true</script>Texto válido'}
      />,
    );

    expect(document.querySelector("script")).toBeNull();
    expect(
      (window as unknown as { __xss?: boolean }).__xss,
    ).toBeUndefined();
    expect(screen.getByText(/texto válido/i)).toBeTruthy();
    expect(screen.queryByText(/window\.__xss/i)).toBeNull();
  });

  it("no renderiza bloque ni título huérfano sin specs ni descripción", () => {
    const { container } = render(
      <TechnicalSpecifications specs={[]} description="   " />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("agrupa las especificaciones en dl con la unidad concatenada al valor", () => {
    const { container } = render(<TechnicalSpecifications specs={SPECS} />);

    expect(screen.getByRole("heading", { level: 3 })).toBeTruthy();
    const list = container.querySelector("dl");
    expect(list).not.toBeNull();
    expect(container.querySelector("dt")?.textContent).toBe("Material");
    expect(screen.getByText("Malla técnica")).toBeTruthy();
    expect(screen.getByText("280 g")).toBeTruthy();
    expect(screen.queryByText(/^g$/u)).toBeNull();
  });

  it("muestra sólo la descripción cuando no hay especificaciones", () => {
    const { container } = render(
      <TechnicalSpecifications
        specs={[]}
        description="Descripción de prueba. Producto ficticio [MOCK]."
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    expect(container.querySelector("p")?.textContent).toContain("[MOCK]");
    expect(container.querySelector("dl")).toBeNull();
  });

  it("omite filas con nombre o valor vacíos tras sanitizar", () => {
    render(
      <TechnicalSpecifications
        specs={[
          { name: "", value: "Huérfano", displayOrder: 1 },
          { name: "   ", value: "<b></b>", displayOrder: 2 },
          {
            name: "Peso",
            value: "280",
            unit: "g",
            displayOrder: 3,
          },
        ]}
      />,
    );

    expect(screen.queryByText("Huérfano")).toBeNull();
    expect(screen.getByText("280 g")).toBeTruthy();
    // Sin `group` no hay encabezado de grupo: sólo el par válido queda.
    expect(screen.queryByText("Material")).toBeNull();
    expect(screen.getAllByRole("term")).toHaveLength(1);
  });

  it("si ninguna fila es válida y no hay descripción, no renderiza nada", () => {
    const { container } = render(
      <TechnicalSpecifications
        specs={[{ name: "<b></b>", value: " ", displayOrder: 1 }]}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
