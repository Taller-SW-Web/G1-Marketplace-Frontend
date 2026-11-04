import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderDetailContainer } from "../../src/features/orders/OrderDetailContainer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const detail = { data: {
  orderId: "PED-MOCK-001", state: "DESPACHADO", total: { amount: 355, currency: "PEN" },
  createdAt: "2026-09-27T18:30:00.000Z",
  lines: [{ sku: "MOCK-AERO-42", description: "Audífonos de prueba", quantity: 1, unitPrice: { amount: 50, currency: "PEN" } }],
  milestones: [{ state: "PAGADO", at: "2026-09-27T18:35:00.000Z" }],
} };

describe("F-031 order detail integration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("submits through the same-origin BFF and shows only its confirmed result", async () => {
    const uuid = vi.fn().mockReturnValueOnce("33333333-3333-4333-8333-333333333333")
      .mockReturnValueOnce("44444444-4444-4444-8444-444444444444");
    vi.stubGlobal("crypto", { randomUUID: uuid });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        cartId: "cart-1", version: 4, added: [{ sku: "MOCK-AERO-42", quantity: 1 }],
        adjustments: [{ sku: "RETIRED-SKU", reason: "NOT_AVAILABLE" }],
      } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        cartId: "cart-1", version: 5, added: [{ sku: "MOCK-AERO-42", quantity: 1 }], adjustments: [],
      } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderDetailContainer orderId="PED-MOCK-001" reorderEnabled />);

    fireEvent.click(await screen.findByRole("button", { name: "Agregar productos al carrito" }));
    expect(await screen.findByRole("dialog", { name: "Resultado parcial del reordenado" })).toBeDefined();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/orders/PED-MOCK-001/reorder");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST", cache: "no-store" });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ "Idempotency-Key": "33333333-3333-4333-8333-333333333333" });
    fireEvent.click(screen.getByRole("button", { name: "Ver carrito" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/carrito"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Agregar productos al carrito" }));
    await screen.findByRole("dialog", { name: "Productos agregados al carrito" });
    expect(fetchMock.mock.calls[2][1].headers).toEqual({ "Idempotency-Key": "44444444-4444-4444-8444-444444444444" });
    expect(uuid).toHaveBeenCalledTimes(2);
  });

  it("reuses the action key after an uncertain failure so a retry cannot double-add", async () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValue("55555555-5555-4555-8555-555555555555") });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "REORDER_UNAVAILABLE" } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        cartId: "cart-1", version: 4, added: [{ sku: "MOCK-AERO-42", quantity: 1 }], adjustments: [],
      } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderDetailContainer orderId="PED-MOCK-001" reorderEnabled />);

    fireEvent.click(await screen.findByRole("button", { name: "Agregar productos al carrito" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Agregar productos al carrito" }));
    await screen.findByRole("dialog", { name: "Productos agregados al carrito" });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ "Idempotency-Key": "55555555-5555-4555-8555-555555555555" });
    expect(fetchMock.mock.calls[2][1].headers).toEqual({ "Idempotency-Key": "55555555-5555-4555-8555-555555555555" });
  });

  it("hides the action while the local feature flag is off", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(detail), { status: 200 })));
    render(<OrderDetailContainer orderId="PED-MOCK-001" />);
    await screen.findByRole("heading", { name: "Detalle del pedido" });
    expect(screen.queryByRole("button", { name: "Agregar productos al carrito" })).toBeNull();
  });
});
