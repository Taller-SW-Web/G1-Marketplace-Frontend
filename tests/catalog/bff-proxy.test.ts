import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogProxyGet } from "../../src/app/api/catalog/bff-proxy";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

const PROBLEM_CONTENT_TYPE = "application/problem+json";

const requestFor = (path: string, headers: Record<string, string> = {}) =>
  new Request(`http://127.0.0.1:3000/api/catalog/${path}`, { headers });

/** Respuesta JSON mínima con la superficie que consume el proxy. */
function upstream(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

type FetchMock = ReturnType<
  typeof vi.fn<(url: URL, init?: RequestInit) => Promise<Response>>
>;

function stubFetch(
  impl: (url: URL, init?: RequestInit) => Promise<Response>,
): FetchMock {
  const mock = vi.fn<(url: URL, init?: RequestInit) => Promise<Response>>(
    impl,
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

async function readProblem(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("proxy /api/catalog — correlación y Problem Details (F-011 §3/§4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reenvía el X-Request-Id del consumidor al BFF y lo devuelve", async () => {
    const fetchMock = stubFetch(async () => upstream({ data: { ok: true } }));

    const response = await catalogProxyGet(
      requestFor("products/zapatillas", { "x-request-id": "fe-abc-1" }),
      ["products", "zapatillas"],
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("fe-abc-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [undefined, undefined];
    expect(url?.pathname).toBe("/api/v1/catalog/products/zapatillas");
    expect(
      (init?.headers as Record<string, string>)["X-Request-Id"],
    ).toBe("fe-abc-1");
  });

  it("genera un UUID cuando falta el header y lo usa hacia el BFF", async () => {
    const fetchMock = stubFetch(async () => upstream({ data: { ok: true } }));

    const response = await catalogProxyGet(requestFor("products/x"), [
      "products",
      "x",
    ]);

    const requestId = response.headers.get("x-request-id") ?? "";
    expect(requestId).toMatch(UUID_PATTERN);
    const [, init] = fetchMock.mock.calls[0] ?? [undefined, undefined];
    expect((init?.headers as Record<string, string>)["X-Request-Id"]).toBe(
      requestId,
    );
  });

  it("sustituye un X-Request-Id inseguro por uno generado", async () => {
    stubFetch(async () => upstream({ data: { ok: true } }));

    const response = await catalogProxyGet(
      requestFor("products/x", { "x-request-id": "id con espacios" }),
      ["products", "x"],
    );

    const requestId = response.headers.get("x-request-id") ?? "";
    expect(requestId).toMatch(UUID_PATTERN);
    expect(requestId).not.toContain(" ");
  });

  it("devuelve el X-Request-Id del BFF cuando este ya correlaciona", async () => {
    stubFetch(async () =>
      upstream(
        {
          type: "https://marketplace.example.com/problems/product-not-available",
          title: "Producto no disponible",
          status: 404,
          code: "PRODUCT_NOT_AVAILABLE",
          instance: "/api/v1/catalog/products/otro",
          requestId: "bff-id-1",
        },
        {
          status: 404,
          headers: { "x-request-id": "bff-id-1" },
        },
      ),
    );

    const response = await catalogProxyGet(requestFor("products/otro"), [
      "products",
      "otro",
    ]);

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("bff-id-1");
    expect(response.headers.get("content-type")).toBe(PROBLEM_CONTENT_TYPE);
    const problem = await readProblem(response);
    expect(problem.code).toBe("PRODUCT_NOT_AVAILABLE");
    expect(problem.requestId).toBe("bff-id-1");
    expect(problem.type).toBe(
      "https://marketplace.example.com/problems/product-not-available",
    );
  });

  it("conserva el id generado si el BFF aún no devuelve X-Request-Id", async () => {
    stubFetch(async () =>
      upstream({ code: "PRODUCT_NOT_AVAILABLE" }, { status: 404 }),
    );

    const response = await catalogProxyGet(requestFor("products/otro"), [
      "products",
      "otro",
    ]);

    expect(response.headers.get("x-request-id")).toMatch(UUID_PATTERN);
  });

  it("responde 404 Problem Details sin consultar el BFF si la ruta no está permitida", async () => {
    const fetchMock = stubFetch(async () => upstream({}));

    const response = await catalogProxyGet(
      requestFor("products/SLUG_INVALIDO!", { "x-request-id": "fe-abc-2" }),
      ["products", "SLUG_INVALIDO!"],
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("content-type")).toBe(PROBLEM_CONTENT_TYPE);
    const problem = await readProblem(response);
    expect(problem.code).toBe("NOT_FOUND");
    expect(problem.status).toBe(404);
    expect(problem.instance).toBe("/api/catalog/products/SLUG_INVALIDO!");
    expect(problem.requestId).toBe("fe-abc-2");
    expect(problem.type).toBe("https://marketplace.example.com/problems/not-found");
  });

  it("responde 503 CATALOG_UNAVAILABLE Problem Details si el BFF no responde", async () => {
    stubFetch(async () => {
      throw new Error("ECONNREFUSED");
    });

    const response = await catalogProxyGet(
      requestFor("products/x", { "x-request-id": "fe-abc-3" }),
      ["products", "x"],
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe(PROBLEM_CONTENT_TYPE);
    const problem = await readProblem(response);
    expect(problem.code).toBe("CATALOG_UNAVAILABLE");
    expect(problem.requestId).toBe("fe-abc-3");
  });

  it("trata un cuerpo no-JSON del BFF como fallo recuperable (503)", async () => {
    stubFetch(
      async () =>
        new Response("<html>error</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );

    const response = await catalogProxyGet(requestFor("products/x"), [
      "products",
      "x",
    ]);

    expect(response.status).toBe(503);
    const problem = await readProblem(response);
    expect(problem.code).toBe("CATALOG_UNAVAILABLE");
  });
});

describe("proxy /api/catalog — subrutas comerciales F-012…F-015", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["price", "?sku=SKU-MOCK-001", "/api/v1/catalog/products/zapatillas/price", "?sku=SKU-MOCK-001"],
    ["variants", "", "/api/v1/catalog/products/zapatillas/variants", ""],
    ["availability", "?sku=SKU-MOCK-001", "/api/v1/catalog/products/zapatillas/availability", "?sku=SKU-MOCK-001"],
    ["recommendations", "", "/api/v1/catalog/products/zapatillas/recommendations", ""],
  ])(
    "reenvía products/{slug}/%s y conserva el origen",
    async (subpath, query, expectedPath, expectedSearch) => {
      const fetchMock = stubFetch(async () =>
        upstream(
          { data: { ok: true } },
          { headers: { "x-catalog-source": "MOCK", "x-request-id": "bff-1" } },
        ),
      );

      const response = await catalogProxyGet(
        requestFor(`products/zapatillas/${subpath}${query}`),
        ["products", "zapatillas", subpath],
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("x-catalog-source")).toBe("MOCK");
      expect(response.headers.get("x-request-id")).toBe("bff-1");
      const [url] = fetchMock.mock.calls[0] ?? [undefined];
      expect(url?.pathname).toBe(expectedPath);
      expect(url?.search).toBe(expectedSearch);
    },
  );

  it.each([
    [["products", "zapatillas", "orders"]],
    [["products", "zapatillas", "price", "extra"]],
    [["products", "SLUG_INVALIDO!", "price"]],
  ])("rechaza la ruta no permitida %j sin consultar el BFF", async (path) => {
    const fetchMock = stubFetch(async () => upstream({}));
    const response = await catalogProxyGet(
      requestFor(path.join("/")),
      path,
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    const problem = await readProblem(response);
    expect(problem.code).toBe("NOT_FOUND");
  });
});
