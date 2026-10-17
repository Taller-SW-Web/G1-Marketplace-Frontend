import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useProductDetail } from "../../src/features/catalog/hooks/useProductDetail";
import { ProductDetailContainer } from "../../src/features/catalog/components/ProductDetailContainer";
import { installBffFetchStub, restoreBffFetchStub } from "./bffFetch.stub";

// El modo MOCK vive en el BFF: los tests sustituyen `fetch` por un stub que
// replica el contrato (200 con meta.source=MOCK, 404/503/504 acordados).
beforeEach(() => {
  installBffFetchStub();
});
afterEach(() => {
  restoreBffFetchStub();
});

// El contenedor navega con next/link; fuera de Next sólo interesa el destino.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function Harness({ slug }: { slug: string }) {
  const { state, retry } = useProductDetail(slug);
  return (
    <div>
      <p data-testid="status">{state.kind}</p>
      {state.kind === "error" && <p data-testid="code">{state.code}</p>}
      {state.kind === "ready" && <p data-testid="name">{state.data.name}</p>}
      <button type="button" onClick={retry}>
        Reintentar
      </button>
    </div>
  );
}

describe("useProductDetail (F-011 · MOCK)", () => {
  it("pasa de loading a ready con el fixture MOCK", async () => {
    render(<Harness slug="zapatillas-running-aero-x" />);
    expect(screen.getByTestId("status").textContent).toBe("loading");

    expect(await screen.findByText("ready")).toBeTruthy();
    expect(screen.getByTestId("name").textContent).toContain("[MOCK]");
  });

  it("mapea el 404 del adaptador a not_available", async () => {
    render(<Harness slug="producto-no-existente-mock" />);
    expect(await screen.findByText("not_available")).toBeTruthy();
    expect(screen.queryByTestId("code")).toBeNull();
  });

  it("expone el código de error para 503", async () => {
    render(<Harness slug="producto-error-503-mock" />);
    await screen.findByText("error");
    expect(screen.getByTestId("code").textContent).toBe(
      "PRODUCT_CATALOG_UNAVAILABLE",
    );
  });

  it("cancela la respuesta anterior cuando el slug cambia en vuelo", async () => {
    const { rerender } = render(
      <Harness slug="producto-error-503-mock" />,
    );
    rerender(<Harness slug="zapatillas-running-aero-x" />);

    expect(await screen.findByText("ready")).toBeTruthy();
    expect(screen.queryByTestId("code")).toBeNull();
  });

  it("retry() relanza únicamente el detalle", async () => {
    render(<Harness slug="producto-error-503-mock" />);
    await screen.findByText("error");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByTestId("status").textContent).toBe("loading");

    await screen.findByText("error");
    expect(screen.getByTestId("code").textContent).toBe(
      "PRODUCT_CATALOG_UNAVAILABLE",
    );
  });
});

describe("ProductDetailContainer (F-011 · MOCK)", () => {
  it("RC-F-011-03: el estado not_available es neutral y enlaza al catálogo", async () => {
    render(<ProductDetailContainer slug="producto-no-existente-mock" />);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: /producto no disponible/i,
    });
    expect(heading).toBeTruthy();
    expect(screen.queryByText(/inactivo/i)).toBeNull();
    expect(screen.queryByText(/privado/i)).toBeNull();
    expect(screen.queryByText(/no existe/i)).toBeNull();

    const link = screen.getByRole("link", { name: /catálogo/i });
    expect(link.getAttribute("href")).toBe("/catalogo");
    expect(link.textContent).toBe("Volver al catálogo");
  });

  it("migas, un único h1 y región comercial sin precio ni stock", async () => {
    render(<ProductDetailContainer slug="zapatillas-running-aero-x" />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /\[MOCK\]/u }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("heading", { level: 1 }),
    ).toHaveLength(1);

    const crumbLinks = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(crumbLinks).toContain("/");
    expect(crumbLinks).toContain("/catalogo");

    const page = document.querySelector(".product-page")?.textContent ?? "";
    expect(page).not.toMatch(/S\//u);
    expect(page).not.toMatch(/stock/i);
    expect(page).not.toMatch(/carrito/i);
    expect(page).not.toMatch(/precio/i);
  });

  it("RC-F-011-02 (integración): la imagen fallida conserva h1 y descripción", async () => {
    render(<ProductDetailContainer slug="zapatillas-running-aero-x" />);

    const image = await screen.findByRole("img");
    fireEvent.error(image);

    expect(
      screen.getAllByText(/imagen no disponible/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "[MOCK]",
    );
    expect(screen.getByText(/producto ficticio/i)).toBeTruthy();
  });

  it("ofrece Reintentar en el estado de error y vuelve a consultarlo", async () => {
    render(<ProductDetailContainer slug="producto-error-503-mock" />);

    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/problema/i);
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toHaveProperty("textContent", "No pudimos cargar este producto");

    const section = document.querySelector("[data-error-code]");
    expect(section?.getAttribute("data-error-code")).toBe(
      "PRODUCT_CATALOG_UNAVAILABLE",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(document.querySelector("[data-error-code]")).toBeNull();

    await waitFor(() =>
      expect(
        document
          .querySelector("[data-error-code]")
          ?.getAttribute("data-error-code"),
      ).toBe("PRODUCT_CATALOG_UNAVAILABLE"),
    );
  });

  it("cierra el visor al cambiar de slug (reset del estado local)", async () => {
    const { rerender } = render(
      <ProductDetailContainer slug="zapatillas-running-aero-x" />,
    );
    await screen.findByRole("heading", { level: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    rerender(<ProductDetailContainer slug="producto-sin-specs-mock" />);
    expect(screen.queryByRole("dialog")).toBeNull();

    // La nueva ficha termina en READY y el visor sigue cerrado.
    await screen.findByRole("heading", { level: 1, name: /\[MOCK\]/u });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
