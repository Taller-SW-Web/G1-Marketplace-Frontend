import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  sanitizeCatalogReturnTo,
  sanitizeReturnTo,
} from "../../src/features/catalog/returnTo";
import { ProductDetailContainer } from "../../src/features/catalog/components/ProductDetailContainer";
import { installBffFetchStub, restoreBffFetchStub } from "./bffFetch.stub";

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

// El modo MOCK vive en el BFF: stub de fetch que replica sus respuestas.
beforeEach(() => {
  installBffFetchStub();
});
afterEach(() => {
  restoreBffFetchStub();
});

describe("sanitizeReturnTo (validador InternalPath del handoff)", () => {
  it("conserva rutas internas válidas", () => {
    expect(sanitizeReturnTo("/catalogo?q=running")).toBe("/catalogo?q=running");
    expect(sanitizeReturnTo("/catalogo")).toBe("/catalogo");
    expect(sanitizeReturnTo("/")).toBe("/");
  });

  it("usa /catalogo cuando falta el parámetro", () => {
    expect(sanitizeReturnTo(undefined)).toBe("/catalogo");
  });

  it("rechaza destinos externos y cae a /catalogo", () => {
    expect(sanitizeReturnTo("https://evil.test")).toBe("/catalogo");
    expect(sanitizeReturnTo("//evil.test")).toBe("/catalogo");
    expect(sanitizeReturnTo("/\\evil.test")).toBe("/catalogo");
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/catalogo");
    expect(sanitizeReturnTo("catalogo")).toBe("/catalogo");
  });

  it("rechaza backslashes, caracteres de control, vacíos y longitudes excesivas", () => {
    expect(sanitizeReturnTo("/catalogo\\x")).toBe("/catalogo");
    expect(sanitizeReturnTo("/catalogo\nSet-Cookie: x")).toBe("/catalogo");
    expect(sanitizeReturnTo("")).toBe("/catalogo");
    expect(sanitizeReturnTo(`/catalogo?${"a".repeat(600)}`)).toBe("/catalogo");
  });
});

describe("sanitizeCatalogReturnTo (migra «Catálogo»)", () => {
  it("conserva los criterios previos cuando returnTo apunta al catálogo", () => {
    expect(sanitizeCatalogReturnTo("/catalogo?q=running&page=2")).toBe(
      "/catalogo?q=running&page=2",
    );
    expect(sanitizeCatalogReturnTo("/catalogo")).toBe("/catalogo");
  });

  it("devuelve catálogo general para rutas que no son el catálogo", () => {
    expect(sanitizeCatalogReturnTo("/")).toBe("/catalogo");
    expect(sanitizeCatalogReturnTo("/otra-seccion")).toBe("/catalogo");
    expect(sanitizeCatalogReturnTo("/catalogox")).toBe("/catalogo");
    expect(sanitizeCatalogReturnTo(undefined)).toBe("/catalogo");
  });
});

describe("ProductDetailContainer consume returnTo", () => {
  it("«Volver al catálogo» (no disponible) usa la ruta de contexto validada", async () => {
    render(
      <ProductDetailContainer
        slug="producto-no-existente-mock"
        returnTo="/catalogo?q=running"
      />,
    );

    await screen.findByRole("heading", {
      level: 1,
      name: /producto no disponible/i,
    });
    const link = screen.getByRole("link", { name: /catálogo/i });
    expect(link.getAttribute("href")).toBe("/catalogo?q=running");
    expect(link.textContent).toBe("Volver al catálogo");
  });

  it("«Volver al catálogo» (no disponible) ignora destinos externos", async () => {
    render(
      <ProductDetailContainer
        slug="producto-no-existente-mock"
        returnTo="https://evil.test"
      />,
    );

    await screen.findByRole("heading", {
      level: 1,
      name: /producto no disponible/i,
    });
    expect(
      screen.getByRole("link", { name: /catálogo/i }).getAttribute("href"),
    ).toBe("/catalogo");
  });

  it("«Volver al catálogo» (error) conserva el criterio de origen", async () => {
    render(
      <ProductDetailContainer
        slug="producto-error-503-mock"
        returnTo="/catalogo?categoria=zapatillas"
      />,
    );

    await screen.findByRole("heading", {
      level: 1,
      name: /no pudimos cargar/i,
    });
    expect(
      screen.getByRole("link", { name: /catálogo/i }).getAttribute("href"),
    ).toBe("/catalogo?categoria=zapatillas");
  });

  it("«Volver al catálogo» (error) sin returnTo vuelve a /catalogo", async () => {
    render(<ProductDetailContainer slug="producto-error-503-mock" />);

    await screen.findByRole("heading", {
      level: 1,
      name: /no pudimos cargar/i,
    });
    expect(
      screen.getByRole("link", { name: /catálogo/i }).getAttribute("href"),
    ).toBe("/catalogo");
  });

  it("migra «Catálogo» conserva criterios previos; «Inicio» sigue en /", async () => {
    render(
      <ProductDetailContainer
        slug="zapatillas-running-aero-x"
        returnTo="/catalogo?q=running"
      />,
    );

    await screen.findByRole("heading", { level: 1, name: /\[MOCK\]/u });
    expect(
      screen.getByRole("link", { name: "Catálogo" }).getAttribute("href"),
    ).toBe("/catalogo?q=running");
    expect(
      screen.getByRole("link", { name: "Inicio" }).getAttribute("href"),
    ).toBe("/");
  });

  it("migra «Catálogo» va al catálogo general cuando el origen fue el inicio", async () => {
    render(
      <ProductDetailContainer slug="zapatillas-running-aero-x" returnTo="/" />,
    );

    await screen.findByRole("heading", { level: 1, name: /\[MOCK\]/u });
    expect(
      screen.getByRole("link", { name: "Catálogo" }).getAttribute("href"),
    ).toBe("/catalogo");
  });
});
