import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductGallery } from "../../src/features/catalog/components/ProductGallery";
import { MOCK_MEDIA } from "../../src/features/catalog/fixtures/product-detail.fixture";

const button = (name: RegExp | string) =>
  screen.getByRole<HTMLButtonElement>("button", { name });
const thumbs = () =>
  screen.getAllByRole<HTMLButtonElement>("button", {
    name: /^Imagen \d de 2$/u,
  });

describe("ProductGallery (F-011)", () => {
  it("RC-F-011-01: deshabilita Anterior en la primera e Siguiente en la última imagen", () => {
    render(<ProductGallery media={MOCK_MEDIA} onOpenViewer={vi.fn()} />);

    expect(button("Imagen anterior").disabled).toBe(true);
    expect(button("Imagen siguiente").disabled).toBe(false);

    fireEvent.click(button("Imagen siguiente"));
    expect(button("Imagen anterior").disabled).toBe(false);
    expect(button("Imagen siguiente").disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("2 de 2");
  });

  it("marca la miniatura seleccionada con aria-pressed y la navega", () => {
    render(<ProductGallery media={MOCK_MEDIA} onOpenViewer={vi.fn()} />);

    expect(thumbs()).toHaveLength(2);
    expect(thumbs()[0].getAttribute("aria-pressed")).toBe("true");
    expect(thumbs()[1].getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(thumbs()[1]);
    expect(thumbs()[0].getAttribute("aria-pressed")).toBe("false");
    expect(thumbs()[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("abre el visor en el índice seleccionado", () => {
    const onOpenViewer = vi.fn();
    render(<ProductGallery media={MOCK_MEDIA} onOpenViewer={onOpenViewer} />);

    fireEvent.click(button("Ampliar imagen"));
    expect(onOpenViewer).toHaveBeenCalledWith(0);

    fireEvent.click(button("Imagen siguiente"));
    fireEvent.click(button("Ampliar imagen"));
    expect(onOpenViewer).toHaveBeenLastCalledWith(1);
  });

  it("RC-F-011-02: la imagen fallida muestra respaldo y mantiene los controles", () => {
    render(<ProductGallery media={MOCK_MEDIA} onOpenViewer={vi.fn()} />);

    fireEvent.error(screen.getByRole("img"));

    expect(
      screen.getAllByText(/imagen no disponible/i).length,
    ).toBeGreaterThan(0);
    expect(document.querySelector(".gallery-main img")).toBeNull();
    expect(button("Ampliar imagen").disabled).toBe(false);
    expect(button("Imagen siguiente").disabled).toBe(false);
  });

  it("conserva las miniaturas fallidas visibles y marcadas como no disponibles", () => {
    render(<ProductGallery media={MOCK_MEDIA} onOpenViewer={vi.fn()} />);
    const thumb = thumbs()[1];

    fireEvent.error(thumb.querySelector("img") as HTMLImageElement);

    expect(thumb.textContent).toMatch(/imagen no disponible/i);
    expect(thumb.getAttribute("aria-label")).toMatch(/no disponible/i);
  });
});
