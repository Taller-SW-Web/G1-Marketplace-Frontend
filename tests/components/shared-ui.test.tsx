import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Button } from "../../src/shared/ui/Button";
import { TextField } from "../../src/shared/ui/TextField";
import { EmptyState } from "../../src/shared/ui/EmptyState";
import { LoadingState, Skeleton } from "../../src/shared/ui/Skeleton";

describe("Button", () => {
  it("does not submit a surrounding form unless explicitly configured", () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Limpiar</Button>
        <Button type="submit">Aplicar</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it("blocks repeated clicks while loading and preserves the action name", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Guardar/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("keeps explicit disabled after loading finishes and forwards refs", () => {
    const ref = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <Button ref={ref} disabled loading>
        Guardar
      </Button>,
    );
    rerender(
      <Button ref={ref} disabled>
        Guardar
      </Button>,
    );
    expect(ref.current?.disabled).toBe(true);
  });
  it("supports documented sizes and variants with decorative icons", () => {
    render(
      <Button variant="secondary" size="sm" startIcon="+" fullWidth>
        Agregar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Agregar" });
    expect(button.classList.contains("button--secondary")).toBe(true);
    expect(button.classList.contains("button--sm")).toBe(true);
    expect(button.classList.contains("button--full")).toBe(true);
  });
});

describe("TextField", () => {
  it("generates separate ids and associates visible labels", () => {
    render(
      <>
        <TextField label="Nombre" />
        <TextField label="Correo" type="email" />
      </>,
    );
    const name = screen.getByLabelText("Nombre");
    const email = screen.getByLabelText("Correo");
    expect(name.id).not.toBe(email.id);
    expect(name.id).not.toBe("");
    expect(screen.getByText("Nombre").classList.contains("sr-only")).toBe(
      false,
    );
  });
  it("links hint, error and external description without hiding validation", () => {
    const { rerender } = render(
      <>
        <p id="currency">En soles</p>
        <TextField
          id="price"
          label="Precio"
          hint="Importe no negativo"
          error="Revisa el importe"
          aria-describedby="currency"
        />
      </>,
    );
    const input = screen.getByLabelText("Precio");
    expect(input.getAttribute("aria-describedby")).toBe(
      "currency price-hint price-error",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-errormessage")).toBe("price-error");
    expect(screen.getByRole("alert").textContent).toBe("Revisa el importe");
    rerender(
      <TextField id="price" label="Precio" hint="Importe no negativo" />,
    );
    expect(screen.getByLabelText("Precio").getAttribute("aria-invalid")).toBe(
      null,
    );
    expect(screen.queryByRole("alert")).toBe(null);
  });
  it("forwards native input behavior and allows an independently named action", () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(
      <TextField
        ref={ref}
        label="Buscar"
        labelHidden
        type="search"
        value=""
        onChange={onChange}
        startAdornment="⌕"
        endAdornment={<Button type="submit">Aplicar búsqueda</Button>}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), {
      target: { value: "running" },
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(ref.current?.type).toBe("search");
    expect(
      screen.getByRole("button", { name: "Aplicar búsqueda" }),
    ).toBeDefined();
  });
});

describe("EmptyState and loading", () => {
  it("provides a named section, heading and actual recovery action", () => {
    const onClear = vi.fn();
    render(
      <EmptyState
        title="Sin coincidencias"
        description="Prueba otra búsqueda"
        icon="↗"
        actions={<Button onClick={onClear}>Limpiar</Button>}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Sin coincidencias" }),
    ).toBeDefined();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "Sin coincidencias",
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
  it("does not insert a page h1 or invent a recovery action", () => {
    render(<EmptyState headingLevel={3} title="Aún no hay elementos" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 1 })).toBe(null);
    expect(screen.queryByRole("button")).toBe(null);
  });
  it("announces a loading group once and hides individual skeletons", () => {
    render(
      <LoadingState label="Cargando categorías" className="category-grid">
        <Skeleton />
        <Skeleton variant="line" />
        <Skeleton variant="circle" />
      </LoadingState>,
    );
    expect(screen.getAllByRole("status").length).toBe(1);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe(
      "Cargando categorías",
    );
    expect(
      document.querySelectorAll('.skeleton[aria-hidden="true"]').length,
    ).toBe(3);
    expect(document.querySelector(".skeleton--circle")).not.toBe(null);
  });
});
