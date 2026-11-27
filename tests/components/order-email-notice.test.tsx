import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderEmailNotice } from "../../src/features/checkout/OrderEmailNotice";

describe("OrderEmailNotice (fixture)", () => {
  it("omits the notice until the order is confirmed and shows only future-facing copy", () => {
    const { container, rerender } = render(<OrderEmailNotice orderConfirmed={false} />);
    expect(container.childElementCount).toBe(0);

    rerender(<OrderEmailNotice orderConfirmed />);
    const notice = screen.getByRole("note");
    expect(within(notice).getByText("Confirmación por correo")).toBeDefined();
    expect(within(notice).getByText("Te enviaremos una confirmación al correo registrado.")).toBeDefined();
    expect(notice.querySelector("a, button, [tabindex]")).toBeNull();

    rerender(<OrderEmailNotice orderConfirmed={false} />);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("labels the preview and makes no network call when remounted", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    try {
      for (let i = 0; i < 2; i++) {
        const { unmount } = render(<OrderEmailNotice orderConfirmed preview />);
        expect(screen.getByRole("note").textContent).toContain("Vista previa: en una compra real, te enviaremos una confirmación al correo registrado.");
        unmount();
      }
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
