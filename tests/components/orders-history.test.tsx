import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrdersHistory } from "../../src/features/orders/OrdersHistory";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

const twoOrders = {
  data: [
    {
      orderId: "PED-MOCK-001",
      state: "PAGADO",
      total: { amount: 355, currency: "PEN" },
      createdAt: "2026-09-27T18:30:00.000Z",
    },
    {
      orderId: "PED-MOCK-002",
      state: "CREADO",
      total: { amount: 129.9, currency: "PEN" },
      createdAt: "2026-09-18T12:15:00.000Z",
    },
  ],
  page: { number: 0, size: 10, totalElements: 2, totalPages: 1 },
};

function mockFetch(body: unknown, init: { status?: number; source?: string } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init.source) headers.set("x-orders-source", init.source);
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status: init.status ?? 200, headers }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("F-028 OrdersHistory (MOCK Hito 3)", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra los pedidos del cliente y el aviso de datos MOCK", async () => {
    const fetchMock = mockFetch(twoOrders, { source: "MOCK" });
    render(<OrdersHistory initialPage={0} />);

    expect((await screen.findAllByText("PED-MOCK-001")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("PED-MOCK-002").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toBe("Datos sintéticos de prueba (MOCK)");
    expect(screen.getByText("Mostrando 1–2 de 2 pedidos")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/orders/me?page=0&pageSize=10");
  });

  it("no envía identidad del cliente desde el navegador", async () => {
    const fetchMock = mockFetch(twoOrders, { source: "MOCK" });
    render(<OrdersHistory initialPage={0} />);
    await screen.findAllByText("PED-MOCK-001");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toMatch(/cliente|customer/i);
    expect(JSON.stringify(init)).not.toMatch(/cliente|customer|authorization/i);
  });

  it("no aviso MOCK cuando la fuente no es MOCK", async () => {
    mockFetch(twoOrders, { source: "REAL" });
    render(<OrdersHistory initialPage={0} />);
    await screen.findAllByText("PED-MOCK-001");
    expect(screen.queryByText(/MOCK\)/)).toBe(null);
  });

  it("«Detalle» queda pendiente: no hay enlaces a /mis-pedidos/{id} (F-030 fuera de entrega)", async () => {
    mockFetch(twoOrders, { source: "MOCK" });
    const { container } = render(<OrdersHistory initialPage={0} />);
    await screen.findAllByText("PED-MOCK-001");

    expect(container.querySelectorAll('a[href^="/mis-pedidos/"]').length).toBe(0);
    expect(screen.queryByRole("link", { name: /ver detalle/i })).toBe(null);
    const pending = screen.getAllByText("Detalle próximamente");
    expect(pending.length).toBe(4); // tabla (2) + tarjetas (2)
    for (const node of screen.getAllByRole("button", { name: /Detalle del pedido/ })) {
      expect((node as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("lista vacía muestra estado vacío con acción hacia el catálogo", async () => {
    mockFetch(
      { data: [], page: { number: 0, size: 10, totalElements: 0, totalPages: 0 } },
      { source: "MOCK" },
    );
    render(<OrdersHistory initialPage={0} />);

    expect(await screen.findByText("Aún no has realizado pedidos")).toBeDefined();
    expect(screen.getByRole("link", { name: "Explorar catálogo" }).getAttribute("href")).toBe("/catalogo");
    expect(screen.queryByRole("table")).toBe(null);
  });

  it("paginación: muestra rango, página actual y navega con Siguiente/Anterior", async () => {
    mockFetch(
      {
        data: twoOrders.data,
        page: { number: 1, size: 2, totalElements: 5, totalPages: 3 },
      },
      { source: "MOCK" },
    );
    render(<OrdersHistory initialPage={1} />);

    expect(await screen.findByText("Mostrando 3–4 de 5 pedidos")).toBeDefined();
    expect(screen.getByText("Página 2 de 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(push).toHaveBeenLastCalledWith("/mis-pedidos?page=2");
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(push).toHaveBeenLastCalledWith("/mis-pedidos?page=0");
  });

  it("página fuera de rango redirige a la última página disponible", async () => {
    mockFetch(
      { data: [], page: { number: 9, size: 10, totalElements: 12, totalPages: 2 } },
      { source: "MOCK" },
    );
    render(<OrdersHistory initialPage={9} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mis-pedidos?page=1"));
  });

  it("error 503: muestra mensaje y permite reintentar", async () => {
    const fetchMock = mockFetch({ code: "ORDERS_UNAVAILABLE" }, { status: 503 });
    render(<OrdersHistory initialPage={0} />);

    expect(await screen.findByText("No pudimos cargar tus pedidos")).toBeDefined();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(twoOrders), {
        status: 200,
        headers: { "x-orders-source": "MOCK" },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect((await screen.findAllByText("PED-MOCK-001")).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("error 401: pide iniciar sesión", async () => {
    mockFetch({}, { status: 401 });
    render(<OrdersHistory initialPage={0} />);
    expect(await screen.findByText("Inicia sesión para ver tus pedidos")).toBeDefined();
  });

  it("respuesta con forma inesperada se trata como error, no se renderiza", async () => {
    mockFetch({ data: [{ orderId: "" }], page: {} }, { source: "MOCK" });
    render(<OrdersHistory initialPage={0} />);
    expect(await screen.findByText("No pudimos cargar tus pedidos")).toBeDefined();
  });
});
