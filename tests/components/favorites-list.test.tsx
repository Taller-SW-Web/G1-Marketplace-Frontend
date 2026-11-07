import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FavoritesList, type FavoriteProduct } from "../../src/features/wishlist/FavoritesList";
import { parseWishlist, toFavorite } from "../../src/features/wishlist/contract";

const products: FavoriteProduct[] = [
  { productId: "one", name: "Zapatillas", slug: "zapatillas", categoryId: "shoes", brandId: "brand", image: { url: "/fixtures/product-0.svg", alt: "Zapatillas" }, availability: "in_stock" },
  { productId: "two", name: "Polo", slug: "polo", categoryId: "clothes", brandId: "brand", image: { url: "/fixtures/product-1.svg", alt: "Polo" }, availability: "out_of_stock" },
];

it("preserves server order across stock states and keeps detail links", () => {
  const retired: FavoriteProduct = { productId: "retired", name: "Retirado", slug: null, image: null, availability: "unavailable" };
  const ordered = [products[1], retired, products[0]];
  render(<FavoritesList products={ordered} />);
  const collection = within(screen.getByRole("region", { name: "Productos guardados" }));
  expect(collection.getAllByRole("heading", { level: 3 }).map(node => node.textContent)).toEqual(["Polo", "Retirado", "Zapatillas"]);
  const links = collection.getAllByRole("link");
  expect(links.map(node => node.getAttribute("href"))).toEqual([
    "/productos/polo?returnTo=%2Ffavoritos", "/productos/zapatillas?returnTo=%2Ffavoritos",
  ]);
  expect(collection.getByText("Sin existencias")).toBeDefined();
  expect(collection.getByText("Producto no disponible")).toBeDefined();
});

it("connects removal and does not label an all-sold-out list as empty", () => {
  const remove = vi.fn();
  const { rerender } = render(<FavoritesList products={products} onRemove={remove} />);
  fireEvent.click(screen.getByRole("button", { name: "Eliminar de favoritos: Zapatillas" }));
  expect(remove).toHaveBeenCalledExactlyOnceWith(products[0]);
  rerender(<FavoritesList products={[products[1]]} />);
  expect(screen.getByText("Sin existencias", { exact: true })).toBeDefined();
  expect(screen.queryByText("Aún no tienes favoritos")).toBeNull();
  expect((screen.getByRole("button", { name: "Eliminar de favoritos: Polo" }) as HTMLButtonElement).disabled).toBe(true);
  rerender(<FavoritesList products={[]} />);
  expect(screen.getByRole("link", { name: "Explorar productos" }).getAttribute("href")).toBe("/catalogo");
});

it("offers optional cart actions only for available products and explains uncertainty", () => {
  const add = vi.fn();
  const { rerender } = render(<FavoritesList products={products} onAddToCart={add} />);
  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito: Zapatillas" }));
  expect(add).toHaveBeenCalledExactlyOnceWith(products[0]);
  expect((screen.getByRole("button", { name: "Agregar al carrito: Polo" }) as HTMLButtonElement).disabled).toBe(true);
  rerender(<FavoritesList products={products} onAddToCart={add} pending={{ one: "cart-uncertain" }} />);
  expect((screen.getByRole("button", { name: "Agregar al carrito: Zapatillas" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Revisa el carrito antes de volver a agregar este producto.").getAttribute("role")).toBe("status");
  rerender(<FavoritesList products={products} />);
  expect(screen.queryByRole("button", { name: /Agregar al carrito/ })).toBeNull();
});

it("keeps mixed AVAILABLE and UNDETERMINED responses visible and blocks only the unconfirmed cart action", () => {
  const wire = [
    { productId: "available", createdAt: "2026-11-07T01:00:00.000Z", name: "Disponible", slug: "disponible",
      brand: null, image: null, price: { amount: 89.9, currency: "PEN" }, availability: "AVAILABLE" },
    { productId: "pending", createdAt: "2026-11-07T00:00:00.000Z", name: "Por confirmar", slug: "por-confirmar",
      brand: null, image: null, price: { amount: 79.9, currency: "PEN" }, availability: "UNDETERMINED" },
  ];
  const parsed = parseWishlist(wire);
  expect(parsed).not.toBeNull();
  const mixed = parsed!.map(toFavorite);
  const add = vi.fn(); const remove = vi.fn();
  render(<FavoritesList products={mixed} onAddToCart={add} onRemove={remove} />);

  expect(screen.getByRole("heading", { name: "Disponible" })).toBeDefined();
  expect(screen.getByRole("heading", { name: "Por confirmar" })).toBeDefined();
  expect(screen.getByText("Disponibilidad por confirmar")).toBeDefined();
  const pendingCart = screen.getByRole("button", { name: "Agregar al carrito: Por confirmar" }) as HTMLButtonElement;
  expect(pendingCart.disabled).toBe(true);
  fireEvent.click(pendingCart); expect(add).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Eliminar de favoritos: Por confirmar" }));
  expect(remove).toHaveBeenCalledExactlyOnceWith(mixed[1]);
});

it("keeps retired items removable without a purchase link or a sold-out message", () => {
  const remove = vi.fn();
  render(<FavoritesList products={[{ ...products[0], name: "Producto retirado", availability: "unavailable", image: null }]}
    onRemove={remove} onAddToCart={vi.fn()} />);
  const collection = within(screen.getByRole("region", { name: "Productos guardados" }));
  expect(collection.queryByRole("link")).toBeNull();
  expect(collection.queryByRole("button", { name: /Agregar al carrito/ })).toBeNull();
  expect(screen.queryByText(/sin existencias/i)).toBeNull();
  expect(screen.queryByText("Aún no tienes favoritos")).toBeNull();
  expect(collection.getByText("Imagen no disponible")).toBeDefined();
  fireEvent.click(collection.getByRole("button", { name: "Eliminar de favoritos: Producto retirado" }));
  expect(remove).toHaveBeenCalledOnce();
});
