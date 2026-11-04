import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistoricalOrderLines } from "../../src/features/orders/HistoricalOrderLines";
import { OrderStateTimeline } from "../../src/features/orders/OrderStateTimeline";
import { OrderDeliverySummary } from "../../src/features/orders/OrderDeliverySummary";
import { ShipmentTimeline } from "../../src/features/orders/ShipmentTimeline";

describe("order detail and shipment presentation components", () => {
  it("renders historical lines and snapshots the price passed by the order", () => {
    render(<HistoricalOrderLines lines={[{
      sku: "SKU-OLD-1", description: "Zapatillas edición anterior", quantity: 2,
      unitPrice: { amount: 120, currency: "PEN" },
    }]} />);
    expect(screen.getByRole("heading", { name: "Productos de la compra" })).toBeDefined();
    expect(screen.getByText("Zapatillas edición anterior")).toBeDefined();
    expect(screen.getByText(/SKU SKU-OLD-1 · Cantidad: 2/)).toBeDefined();
    expect(screen.getByText(/S\/ 120\.00/)).toBeDefined();
  });

  it("renders order milestones as a readable, timestamped timeline", () => {
    render(<OrderStateTimeline milestones={[{ state: "PAGADO", at: "2026-10-10T10:00:00Z" }]} />);
    expect(screen.getByRole("heading", { name: "Historial del pedido" })).toBeDefined();
    expect(screen.getByText("PAGADO")).toBeDefined();
    expect(document.querySelector('time[datetime="2026-10-10T10:00:00Z"]')).not.toBeNull();
  });

  it("shows only a minimized delivery region and masked contact data", () => {
    render(<OrderDeliverySummary shipping={{
      locationSummary: "San Isidro, Lima",
      emailMasked: "c•••@•••",
      phoneMasked: "••••••888",
      estimatedDelivery: "2026-10-14",
    }} />);
    expect(screen.getByRole("heading", { name: "Datos de entrega" })).toBeDefined();
    expect(screen.getByText("San Isidro, Lima")).toBeDefined();
    expect(screen.getByText("c•••@•••")).toBeDefined();
    expect(screen.getByText("••••••888")).toBeDefined();
    expect(screen.getByText(/14 de octubre de 2026/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/Av\. Javier Prado|correo\.com|\+51 999 888 888/);
  });

  it("shows only public shipment status, estimate, and milestone data", () => {
    render(<ShipmentTimeline
      state="DESPACHADO"
      estimatedDelivery="2026-10-12"
      milestones={[{ state: "DESPACHADO", at: "2026-10-10T10:00:00Z" }]}
    />);
    expect(screen.getByRole("heading", { name: "DESPACHADO" })).toBeDefined();
    expect(screen.getByText("Entrega estimada:")).toBeDefined();
    expect(screen.getAllByText("DESPACHADO")).toHaveLength(2);
    expect(document.querySelector('time[datetime="2026-10-10T10:00:00Z"]')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/teléfono|coordenada|repartidor/i);
  });
});
