import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FavoritesList, type FavoriteProduct } from "../../src/features/wishlist/FavoritesList";

const products: FavoriteProduct[] = [
  { productId: "one", name: "Zapatillas", slug: "zapatillas", categoryId: "shoes", brandId: "brand", image: { url: "/fixtures/product-0.svg", alt: "Zapatillas" }, availability: "in_stock" },
  { productId: "two", name: "Polo", slug: "polo", categoryId: "clothes", brandId: "brand", image: { url: "/fixtures/product-1.svg", alt: "Polo" }, availability: "out_of_stock" },
];

it("separates stock, preserves detail links and only allows available products into the cart", () => {
  const add = vi.fn();
  render(<FavoritesList products={products} onAddToCart={add} />);
  const available = within(screen.getByRole("region", { name: "Disponibles (1)" }));
  const unavailable = within(screen.getByRole("region", { name: "Sin existencias (1)" }));
  expect(available.queryByText("Polo")).toBeNull();
  expect(unavailable.queryByText("Zapatillas")).toBeNull();
  expect(available.getByRole("link").getAttribute("href")).toBe("/productos/zapatillas?returnTo=%2Ffavoritos");
  expect(unavailable.getByRole("link").getAttribute("href")).toBe("/productos/polo?returnTo=%2Ffavoritos");
  fireEvent.click(available.getByRole("button", { name: "Mover al carrito: Zapatillas" }));
  fireEvent.click(unavailable.getByRole("button", { name: "Sin existencias: Polo" }));
  expect(add).toHaveBeenCalledExactlyOnceWith(products[0]);
  expect((unavailable.getByRole("button", { name: "Sin existencias: Polo" }) as HTMLButtonElement).disabled).toBe(true);
});

it("never enables an unconnected cart and does not label an all-sold-out list as empty", () => {
  const { rerender } = render(<FavoritesList products={products} />);
  expect((screen.getByRole("button", { name: "Mover al carrito: Zapatillas" }) as HTMLButtonElement).disabled).toBe(true);
  rerender(<FavoritesList products={[products[1]]} />);
  expect(screen.getByRole("region", { name: "Sin existencias (1)" })).toBeDefined();
  expect(screen.queryByText("Aún no tienes favoritos")).toBeNull();
  rerender(<FavoritesList products={[]} />);
  expect(screen.getByRole("link", { name: "Explorar productos" }).getAttribute("href")).toBe("/catalogo");
});
