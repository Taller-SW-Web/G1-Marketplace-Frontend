import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { WishlistProvider } from "../../src/features/wishlist/WishlistProvider";
import { WishlistDemo } from "../../src/features/wishlist/WishlistDemo";
import { ProductCard } from "../../src/features/catalog/ProductCard";
import { mutateItem } from "../../src/features/wishlist/api";

let mutations: { url: string; init?: RequestInit }[];
let response: () => Promise<Response>;
beforeEach(() => {
  mutations = [];
  response = async () => Response.json({ productId: "PRD-1" }, { status: 201 });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/h3/session") {
      const identity = init?.body ? JSON.parse(String(init.body)).identity : "A";
      return Response.json({ enabled: true, identity, scope: identity ? `scope-${identity}` : "anonymous" });
    }
    mutations.push({ url, init }); return response();
  }));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { if (this.open) { this.open = false; this.dispatchEvent(new Event("close")); } };
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function demo() {
  render(<WishlistProvider enabled><WishlistDemo /></WishlistProvider>);
  await screen.findByText("Cliente de prueba A activo.");
}
function firstRegion() { return within(screen.getByRole("region", { name: "Producto de demostración" })); }

it("starts unknown, confirms save in two controls and removes only on 204", async () => {
  await demo();
  const first = firstRegion().getByRole("button", { name: "Guardar en favoritos" });
  expect(first.hasAttribute("aria-pressed")).toBe(false);
  fireEvent.click(first);
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Quitar de favoritos" })).toHaveLength(2));
  expect(first.getAttribute("aria-pressed")).toBe("true");
  response = async () => new Response(null, { status: 204 });
  fireEvent.click(first);
  await waitFor(() => expect(first.getAttribute("aria-pressed")).toBe("false"));
  expect(mutations[1].init?.method).toBe("DELETE");
  expect(screen.getAllByText("Quitado de favoritos.")).toHaveLength(2);
  expect(screen.getAllByRole("status").filter(node => node.textContent === "Quitado de favoritos.")).toHaveLength(1);
});

it("serializes duplicate clicks and preserves previous confirmation while pending", async () => {
  await demo(); let complete!: (result: Response) => void;
  response = () => new Promise(resolve => { complete = resolve; });
  const buttons = screen.getAllByRole("button", { name: "Guardar en favoritos" });
  fireEvent.click(buttons[0]); fireEvent.click(buttons[0]); fireEvent.click(buttons[1]);
  expect(mutations).toHaveLength(1); expect(buttons[0].hasAttribute("disabled")).toBe(true);
  expect(buttons[0].hasAttribute("aria-pressed")).toBe(false);
  await act(async () => complete(Response.json({ productId: "PRD-1" }, { status: 200 })));
  expect(screen.getAllByRole("button", { name: "Quitar de favoritos" })).toHaveLength(2);
});

it.each([[400, "INVALID_REQUEST"], [404, "PRODUCT_NOT_AVAILABLE"], [503, "CATALOG_UNAVAILABLE"], [500, "INTERNAL_ERROR"], [504, "RESULT_UNCERTAIN"]])("shows %s without a false confirmed favorite", async (status, code) => {
  await demo(); response = async () => Response.json({ code }, { status: Number(status) });
  fireEvent.click(firstRegion().getByRole("button", { name: "Guardar en favoritos" }));
  await waitFor(() => expect(firstRegion().getByRole("alert")).toBeTruthy());
  expect(screen.queryByRole("button", { name: "Quitar de favoritos" })).toBe(null);
  expect(firstRegion().getByRole("button", { name: "Guardar en favoritos" }).hasAttribute("aria-pressed")).toBe(false);
});

it("keeps saved confirmation when DELETE fails and offers retry", async () => {
  await demo(); fireEvent.click(firstRegion().getByRole("button", { name: "Guardar en favoritos" }));
  const remove = await firstRegion().findByRole("button", { name: "Quitar de favoritos" });
  response = async () => Response.json({ code: "INTERNAL_ERROR" }, { status: 500 }); fireEvent.click(remove);
  await firstRegion().findByRole("alert"); expect(remove.getAttribute("aria-pressed")).toBe("true");
  expect(firstRegion().getByRole("button", { name: "Reintentar eliminación" })).toBeTruthy();
});

it("ignores a late response after identity change and clears prior state", async () => {
  await demo(); let complete!: (result: Response) => void;
  response = () => new Promise(resolve => { complete = resolve; });
  fireEvent.click(firstRegion().getByRole("button", { name: "Guardar en favoritos" }));
  fireEvent.change(screen.getByLabelText("Identidad ficticia"), { target: { value: "B" } });
  await screen.findByText("Cliente de prueba B activo.");
  await act(async () => complete(Response.json({ productId: "PRD-1" })));
  expect(screen.queryByRole("button", { name: "Quitar de favoritos" })).toBe(null);
  expect(firstRegion().getByRole("button", { name: "Guardar en favoritos" }).hasAttribute("aria-pressed")).toBe(false);
});

it("keeps the last known saved heart after an uncertain DELETE without asserting aria-pressed", async () => {
  await demo(); fireEvent.click(firstRegion().getByRole("button", { name: "Guardar en favoritos" }));
  const remove = await firstRegion().findByRole("button", { name: "Quitar de favoritos" });
  response = async () => { throw new DOMException("Timeout", "TimeoutError"); };
  fireEvent.click(remove); await firstRegion().findByRole("alert");
  expect(firstRegion().getByRole("button", { name: "Quitar de favoritos" })).toBeTruthy();
  expect(remove.hasAttribute("aria-pressed")).toBe(false);
  expect(firstRegion().getByRole("button", { name: "Reintentar eliminación" })).toBeTruthy();
});

it("401 clears private state and requests a new test session", async () => {
  await demo(); response = async () => Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
  fireEvent.click(firstRegion().getByRole("button", { name: "Guardar en favoritos" }));
  await screen.findByText("Sin sesión activa.");
  expect(screen.getByRole("alert").textContent).toContain("Tu sesión terminó");
  expect(screen.queryByRole("button", { name: "Quitar de favoritos" })).toBe(null);
});

it("without session opens a named dialog, never posts and returns focus on cancel", async () => {
  await demo(); fireEvent.change(screen.getByLabelText("Identidad ficticia"), { target: { value: "none" } });
  await screen.findByText("Sin sesión activa.");
  const button = firstRegion().getByRole("button", { name: "Guardar en favoritos" }); button.focus(); fireEvent.click(button);
  const dialog = await screen.findByRole("dialog", { name: "Se requiere una sesión" });
  expect(mutations).toHaveLength(0); fireEvent.click(within(dialog).getByRole("button", { name: "Ahora no" }));
  await waitFor(() => expect(document.activeElement).toBe(button));
});

it("places the favorite outside the product link and preserves its destination", async () => {
  render(<WishlistProvider enabled><ProductCard returnPath="/catalogo" product={{ productId: "PRD-1", slug: "prueba", name: "Prueba", categoryId: "c", brandId: "b", image: { url: "/test.png", alt: "Prueba" } }} /></WishlistProvider>);
  const button = await screen.findByRole("button", { name: "Guardar en favoritos" });
  expect(button.closest("a")).toBe(null);
  expect(screen.getByRole("link").getAttribute("href")).toContain("/productos/prueba?returnTo=");
});

it("does not persist favorites locally or reconstruct state after remount", async () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  const view = render(<WishlistProvider enabled><WishlistDemo /></WishlistProvider>);
  await screen.findByText("Cliente de prueba A activo."); fireEvent.click(firstRegion().getByRole("button", { name: "Guardar en favoritos" }));
  await firstRegion().findByRole("button", { name: "Quitar de favoritos" }); view.unmount();
  await demo(); expect(screen.queryByRole("button", { name: "Quitar de favoritos" })).toBe(null); expect(setItem).not.toHaveBeenCalled();
});

it("DELETE client never reads a successful empty response as JSON", async () => {
  const json = vi.fn(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204, json }));
  await mutateItem("PRD-1", "remove"); expect(json).not.toHaveBeenCalled();
});

it("does not accept inherited object keys as public error codes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "constructor", message: "private error" }, { status: 500 })));
  await expect(mutateItem("PRD-1", "save")).rejects.toMatchObject({ code: "INTERNAL_ERROR", message: "No pudimos completar la operación. Inténtalo de nuevo." });
});

it("has no sandbox controls when disabled", () => {
  render(<WishlistProvider enabled={false}><ProductCard returnPath="/catalogo" product={{ productId: "PRD-1", slug: "p", name: "P", categoryId: "c", brandId: "b", image: { url: "/test.png", alt: "P" } }} /></WishlistProvider>);
  expect(screen.queryByRole("button")).toBe(null);
});

// The auth endpoint is a double; this exercises the real provider's in-memory isolation.
it("clears confirmed favorites when a real-auth identity changes even if its scope is reused", async () => {
  let identity = "user-a";
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/v1/auth/session"
    ? Response.json({ authenticated: true, scope: "reused-scope", user: { id: identity } })
    : Response.json({ productId: "PRD-1" }, { status: 201 })));
  render(<WishlistProvider enabled realAuth><ProductCard returnPath="/catalogo" product={{ productId: "PRD-1", slug: "p", name: "P", categoryId: "c", brandId: "b", image: { url: "/test.png", alt: "P" } }} /></WishlistProvider>);
  const button = await screen.findByRole("button", { name: "Guardar en favoritos" });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  fireEvent.click(button);
  await screen.findByRole("button", { name: "Quitar de favoritos" });
  identity = "user-b";
  fireEvent.focus(window);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Quitar de favoritos" })).toBeNull());
});
