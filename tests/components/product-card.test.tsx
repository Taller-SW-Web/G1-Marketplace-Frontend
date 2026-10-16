import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "../../src/features/catalog/ProductCard";
import { isCatalogPage, isHome } from "../../src/features/catalog/api";
import type { ProductCardDTO } from "../../src/features/catalog/types";

const product: ProductCardDTO = {
  productId: "without-image", slug: "producto-sin-imagen", name: "Producto sin imagen",
  categoryId: "running", brandId: "brand", image: null,
};

describe("ProductCard optional image", () => {
  it("shows an accessible local placeholder and preserves the product link", () => {
    render(<ProductCard product={product} returnPath="/catalogo?q=running&page=1" />);
    expect(screen.getByRole("img", { name: "Imagen no disponible para Producto sin imagen" }).getAttribute("src"))
      .toBe("/images/product-placeholder.svg");
    expect(screen.getByRole("heading", { name: product.name })).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href"))
      .toBe("/productos/producto-sin-imagen?returnTo=%2Fcatalogo%3Fq%3Drunning%26page%3D1");
  });

  it("keeps a provided image and its alternative text", () => {
    render(<ProductCard product={{ ...product, image: { url: "/fixtures/product-0.svg", alt: "Imagen del producto" } }} returnPath="/catalogo" />);
    expect(screen.getByRole("img", { name: "Imagen del producto" }).getAttribute("src"))
      .toBe("/fixtures/product-0.svg");
  });

  it("accepts explicit image absence in home and catalog but rejects malformed image objects", () => {
    const home = (card: unknown) => ({ categories: [], featuredProducts: [card] });
    const page = (card: unknown) => ({ data: [card], page: { number: 0, size: 24, totalElements: 1, totalPages: 1 } });
    expect(isHome(home(product))).toBe(true);
    expect(isCatalogPage(page(product))).toBe(true);
    for (const image of [{}, { url: "javascript:alert(1)", alt: "unsafe" }, "", undefined]) {
      expect(isHome(home({ ...product, image }))).toBe(false);
      expect(isCatalogPage(page({ ...product, image }))).toBe(false);
    }
  });
});
