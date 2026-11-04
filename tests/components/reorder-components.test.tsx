import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReorderAction, ReorderResultDialog } from "../../src/features/orders/ReorderAction";

describe("F-031 reorder presentation", () => {
  it("explains current prices and disables the action while busy", () => {
    const onReorder = vi.fn();
    render(<ReorderAction busy onReorder={onReorder} />);
    expect(screen.getByText(/precios y disponibilidad actuales/)).toBeDefined();
    expect((screen.getByRole("button", { name: "Agregando productos…" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Agregando productos…" }));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("shows a confirmed partial result and offers the cart only when something was added", () => {
    const onViewCart = vi.fn();
    const onClose = vi.fn();
    render(<ReorderResultDialog opened result={{
      added: [{ sku: "SKU-1", quantity: 2 }],
      adjustments: [{ sku: "SKU-2", reason: "NOT_AVAILABLE" }],
    }} onViewCart={onViewCart} onClose={onClose} />);

    expect(screen.getByRole("dialog", { name: "Resultado parcial del reordenado" })).toBeDefined();
    expect(screen.getByText("SKU SKU-1 · Cantidad agregada: 2")).toBeDefined();
    expect(screen.getByText("SKU SKU-2 · Motivo informado: NOT_AVAILABLE")).toBeDefined();
    expect(screen.getByText(/No se creó una compra/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Ver carrito" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onViewCart).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not offer the cart when the confirmed result added no lines", () => {
    render(<ReorderResultDialog opened result={{
      added: [], adjustments: [{ sku: "SKU-2", reason: "NOT_AVAILABLE" }],
    }} onViewCart={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "No se agregaron productos" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Ver carrito" })).toBeNull();
  });

  it("closes the result on Escape", () => {
    const onClose = vi.fn();
    render(<ReorderResultDialog opened result={{ added: [], adjustments: [] }} onViewCart={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
