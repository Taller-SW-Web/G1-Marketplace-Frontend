import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AvailabilityRegion } from "../../src/features/catalog/components/AvailabilityRegion";
import { ProductCommerce, toCartAvailability } from "../../src/features/catalog/components/ProductCommerce";
import { fetchProductAvailability } from "../../src/features/catalog/services/product-availability.service";
import { installBffFetchStub, restoreBffFetchStub } from "./bffFetch.stub";

const data = { productId: "PRD-1", sku: "SKU-1", availability: "UNDETERMINED", checkedAt: "2026-11-03T19:38:18Z" };
afterEach(() => { restoreBffFetchStub(); vi.unstubAllGlobals(); });

describe("M01 / F-014: disponibilidad por confirmar", () => {
  it("acepta UNDETERMINED con 200 y conserva su identidad", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data })));
    expect(await fetchProductAvailability("producto-prueba", "SKU-1")).toEqual({ data });
  });

  it("muestra texto e icono propios y permite volver a consultar", () => {
    const retry = vi.fn();
    render(<AvailabilityRegion state={{ kind: "ready", availability: "UNDETERMINED", checkedAt: data.checkedAt }} retry={retry} />);
    expect(screen.getByText("Disponibilidad por confirmar")).toBeTruthy();
    expect(screen.queryByText(/Agotado|No pudimos consultar/u)).toBeNull();
    expect(document.querySelector(".availability-icon")?.textContent).toBe("?");
    fireEvent.click(screen.getByRole("button", { name: "Volver a consultar" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(toCartAvailability({ kind: "ready", availability: "UNDETERMINED", checkedAt: data.checkedAt })).toBeNull();
  });

  it("el flujo completo reintenta la consulta y no ofrece compra", async () => {
    installBffFetchStub();
    render(<ProductCommerce slug="producto-demostracion-7" productId="mock-product-7" showCart busy={false} onAdd={vi.fn()} />);
    await screen.findByText("Disponibilidad por confirmar");
    expect(screen.queryByRole("button", { name: "Agregar al carrito" })).toBeNull();
    const before = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/availability")).length;
    fireEvent.click(screen.getByRole("button", { name: "Volver a consultar" }));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/availability")).length).toBe(before + 1));
    await screen.findByText("Disponibilidad por confirmar");
    expect(screen.queryByText(/Agotado/u)).toBeNull();
  });

  it.each(["INDETERMINADO", "ESTADO_NUEVO", "__proto__"])("no acepta el estado no público %s", async (availability) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { ...data, availability } })));
    await expect(fetchProductAvailability("producto-prueba", "SKU-1")).rejects.toMatchObject({ code: "INVENTORY_INVALID_RESPONSE", status: 502 });
  });

  it.each(["quantity", "available", "on_hand", "reserved", "location_id"])("rechaza datos internos: %s", async (key) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { ...data, [key]: 2 } })));
    await expect(fetchProductAvailability("producto-prueba", "SKU-1")).rejects.toMatchObject({ code: "INVENTORY_INVALID_RESPONSE" });
  });

  it("no usa la disponibilidad de otro SKU", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { ...data, sku: "SKU-OTRO" } })));
    await expect(fetchProductAvailability("producto-prueba", "SKU-1")).rejects.toMatchObject({ code: "INVENTORY_INVALID_RESPONSE" });
  });

  it("503 sigue siendo error, nunca indeterminado o agotado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "INVENTORY_UNAVAILABLE" }, { status: 503 })));
    await expect(fetchProductAvailability("producto-prueba", "SKU-1")).rejects.toMatchObject({ code: "INVENTORY_UNAVAILABLE", status: 503 });
  });
});
