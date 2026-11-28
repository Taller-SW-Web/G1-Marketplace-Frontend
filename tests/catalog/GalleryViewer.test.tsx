import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { GalleryViewer } from "../../src/features/catalog/components/GalleryViewer";
import { MOCK_MEDIA } from "../../src/features/catalog/fixtures/product-detail.fixture";

function Harness({ label = "Zapatillas Running Aero X [MOCK]" }: { label?: string }) {
  const [opened, setOpened] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setOpened(true)}>
        Ampliar imagen
      </button>
      <GalleryViewer
        opened={opened}
        media={MOCK_MEDIA}
        index={index}
        label={label}
        onClose={() => setOpened(false)}
        onIndexChange={setIndex}
      />
    </>
  );
}

describe("GalleryViewer · O-002 (F-011)", () => {
  it("no renderiza nada cuando está cerrado", () => {
    const { container } = render(
      <GalleryViewer
        opened={false}
        media={MOCK_MEDIA}
        index={0}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("expone el diálogo modal con nombre accesible de producto", () => {
    render(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={0}
        label="Zapatillas Running Aero X [MOCK]"
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe(
      "Zapatillas Running Aero X [MOCK]",
    );
    expect(screen.getByText(/imagen 1 de 2/i)).toBeTruthy();
  });

  it("RC-F-011-04: Escape cierra el visor y devuelve el foco al elemento que lo abrió", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Ampliar imagen" });
    trigger.focus();
    fireEvent.click(trigger);

    const close = screen.getByRole("button", { name: "Cerrar visor" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("navega entre imágenes y deshabilita los controles en los extremos", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={0}
        onClose={vi.fn()}
        onIndexChange={onIndexChange}
      />,
    );

    const previous = screen.getByRole<HTMLButtonElement>("button", {
      name: "Imagen anterior",
    });
    const next = screen.getByRole<HTMLButtonElement>("button", {
      name: "Imagen siguiente",
    });
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    fireEvent.click(next);
    expect(onIndexChange).toHaveBeenCalledWith(1);

    rerender(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={1}
        onClose={vi.fn()}
        onIndexChange={onIndexChange}
      />,
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Imagen siguiente" })
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/imagen 2 de 2/i)).toBeTruthy();
  });

  it("V-007: el zoom es operable con +, - y 0 y anuncia el nivel", () => {
    render(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={0}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );

    expect(screen.getByText("100 % de zoom")).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Alejar imagen" })
        .disabled,
    ).toBe(true);

    fireEvent.keyDown(document, { key: "+" });
    expect(screen.getByText("150 % de zoom")).toBeTruthy();

    fireEvent.keyDown(document, { key: "+" });
    fireEvent.keyDown(document, { key: "+" });
    expect(screen.getByText("250 % de zoom")).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Acercar imagen" })
        .disabled,
    ).toBe(true);

    fireEvent.keyDown(document, { key: "-" });
    expect(screen.getByText("200 % de zoom")).toBeTruthy();

    fireEvent.keyDown(document, { key: "0" });
    expect(screen.getByText("100 % de zoom")).toBeTruthy();
  });

  it("V-007: los botones de zoom funcionan y se limitan a los niveles válidos", () => {
    render(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={0}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );

    const zoomIn = screen.getByRole("button", { name: "Acercar imagen" });
    const zoomOut = screen.getByRole<HTMLButtonElement>("button", {
      name: "Alejar imagen",
    });

    fireEvent.click(zoomIn);
    expect(screen.getByText("150 % de zoom")).toBeTruthy();
    fireEvent.click(zoomOut);
    expect(screen.getByText("100 % de zoom")).toBeTruthy();
    expect(zoomOut.disabled).toBe(true);
  });

  it("V-007: las flechas cambian de imagen sin disparar el zoom", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={0}
        onClose={vi.fn()}
        onIndexChange={onIndexChange}
      />,
    );

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(onIndexChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);

    rerender(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={1}
        onClose={vi.fn()}
        onIndexChange={onIndexChange}
      />,
    );
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("amplía con la rueda sobre la foto y reinicia el zoom al elegir una miniatura", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar imagen" }));
    const dialog = within(screen.getByRole("dialog"));
    const photo = dialog.getByRole("region", { name: "Foto ampliada" });

    fireEvent.wheel(dialog.getByRole("button", { name: "Cerrar visor" }), { deltaY: -120 });
    expect(dialog.getByText("100 % de zoom")).toBeTruthy();
    fireEvent.wheel(photo, { deltaY: -120 });
    expect(dialog.getByText("150 % de zoom")).toBeTruthy();

    const thumb = dialog.getByRole("button", { name: "Imagen 2 de 2" });
    fireEvent.click(thumb);
    expect(thumb.getAttribute("aria-pressed")).toBe("true");
    expect(dialog.getByText("100 % de zoom")).toBeTruthy();
  });

  it("V-007: cambiar de imagen reinicia el zoom aplicado", () => {
    const { rerender } = render(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={0}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: "+" });
    expect(screen.getByText("150 % de zoom")).toBeTruthy();

    rerender(
      <GalleryViewer
        opened
        media={MOCK_MEDIA}
        index={1}
        onClose={vi.fn()}
        onIndexChange={vi.fn()}
      />,
    );
    expect(screen.getByText("100 % de zoom")).toBeTruthy();
  });
});
