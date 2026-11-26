import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderDetailContainer } from "../../src/features/orders/OrderDetailContainer";
import { ShipmentTimeline } from "../../src/features/orders/ShipmentTimeline";
import { ShipmentTrackingContainer } from "../../src/features/orders/ShipmentTrackingContainer";

describe("order detail and shipment presentation", () => {
  afterEach(() => vi.unstubAllGlobals());
  const orderId = "PED-2026-00001";

  it("shows the raw Ventas summary and only then offers tracking", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      orderId, state: "PAGADO", total: { amount: 139.90, currency: "PEN" }, createdAt: "2026-11-26T15:00:00Z",
    })));
    render(<OrderDetailContainer orderId={orderId} />);
    expect(screen.queryByRole("link", { name: "Ver seguimiento" })).toBeNull();
    const tracking = await screen.findByRole("link", { name: "Ver seguimiento" });
    expect(tracking.getAttribute("href")).toBe("/mis-pedidos/PED-2026-00001/seguimiento");
    expect(screen.getByText(orderId)).toBeDefined();
    expect(screen.getByText("PAGADO")).toBeDefined();
    expect(screen.getByText(/139[.,]90/)).toBeDefined();
    expect(screen.getByText(/26 de noviembre de 2026/i)).toBeDefined();
  });

  it.each([403, 404])("shows no order data or tracking link when detail returns %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "upstream" } }, { status })));
    render(<OrderDetailContainer orderId={orderId} />);
    await screen.findByRole("heading", { name: "Pedido no disponible" });
    expect(screen.queryByText(orderId)).toBeNull();
    expect(screen.queryByRole("link", { name: "Ver seguimiento" })).toBeNull();
  });

  it.each([403, 404])("shows no tracking data when opening a denied URL (%s)", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "upstream" } }, { status })));
    render(<ShipmentTrackingContainer orderId={orderId} />);
    await screen.findByRole("heading", { name: "Pedido no disponible" });
    expect(screen.queryByText(orderId)).toBeNull();
    expect(screen.queryByRole("link", { name: "Detalle" })).toBeNull();
  });

  it("shows the shipment timeline and public estimated date", () => {
    render(<ShipmentTimeline
      state="DESPACHADO"
      estimatedDelivery="2026-10-12"
      milestones={[{ state: "DESPACHADO", at: "2026-10-10T10:00:00Z" }]}
    />);
    expect(screen.getByRole("heading", { name: "DESPACHADO" })).toBeDefined();
    expect(screen.getByText("Entrega estimada:")).toBeDefined();
    expect(screen.getAllByText("DESPACHADO")).toHaveLength(2);
    expect(document.querySelector('time[datetime="2026-10-10T10:00:00Z"]')).not.toBeNull();
  });
});
