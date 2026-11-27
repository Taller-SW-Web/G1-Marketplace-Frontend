import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const origin = "https://g1-marketplace-frontend.vercel.app";
const output = process.argv[2] ?? "test-results/h5-vercel-estados";
const order = "PED-H5-QA-001";
const emptyPage = { data: [], page: { number: 0, size: 24, totalElements: 0, totalPages: 0 } };
const cases = [
  {
    id: "v005-inicio", path: "/", api: "/api/catalog/home",
    error: { code: "CATALOG_UNAVAILABLE" }, message: /no pudimos|no está disponible|problema/i,
    retry: "Reintentar", recovered: /encuentra tu próximo favorito/i,
    json: { categories: [], featuredProducts: [] },
  },
  {
    id: "v006-timeout", path: "/catalogo?q=polo", api: "/api/catalog/products",
    error: { code: "CATALOG_TIMEOUT" }, message: /tardó demasiado/i,
    retry: "Reintentar", recovered: /sin resultados|no encontramos productos con estos criterios/i, json: emptyPage,
  },
  {
    id: "v006-indisponible", path: "/catalogo?q=polo", api: "/api/catalog/products",
    error: { code: "CATALOG_UNAVAILABLE" }, message: /no está disponible|no pudimos cargar el catálogo/i,
    retry: "Reintentar", recovered: /sin resultados|no encontramos productos con estos criterios/i, json: emptyPage,
  },
  {
    id: "v008-carrito", path: "/carrito", api: "/api/cart/current",
    error: { error: { code: "COMMERCE_DATA_UNAVAILABLE" } }, message: /carrito/i,
    retry: "Reintentar carga", recovered: /tu carrito está vacío/i,
    json: { data: { cartId: null, version: 0, items: [] } },
  },
  {
    id: "v009-favoritos", path: "/favoritos", api: "/api/wishlist", session: true,
    error: { code: "CATALOG_UNAVAILABLE" }, message: /no pudimos cargar tus favoritos/i,
    retry: "Reintentar", recovered: /aún no tienes favoritos/i, json: [],
  },
  {
    id: "v010-direccion", path: "/checkout/direccion", api: "/api/checkout/delivery-addresses",
    session: true, checkout: true, error: { error: { code: "ADDRESS_UNAVAILABLE" } },
    message: /no pudimos|no está disponible|inténtalo/i,
    retry: "Reintentar carga de direcciones", recovered: /aún no tienes direcciones guardadas/i,
    recoveredText: true, json: { data: [] },
  },
  {
    id: "v015-pedidos", path: "/mis-pedidos", api: "/api/orders/me",
    error: { error: { code: "ORDER_UNAVAILABLE" } }, message: /no pudimos cargar tus pedidos/i,
    retry: "Reintentar", recovered: /aún no has realizado pedidos/i, json: emptyPage,
  },
  {
    id: "v016-detalle", path: `/mis-pedidos/${order}`, api: `/api/orders/${order}`,
    error: { error: { code: "ORDER_UNAVAILABLE" } }, message: /no pudimos cargar el pedido/i,
    retry: "Reintentar", recovered: /pedido no disponible/i,
    status: 404, json: { error: { code: "ORDER_NOT_AVAILABLE" } },
  },
  {
    id: "v017-seguimiento", path: `/mis-pedidos/${order}/seguimiento`, api: `/api/orders/${order}/tracking`,
    error: { error: { code: "ORDER_UNAVAILABLE" } }, message: /no pudimos consultar el seguimiento/i,
    retry: "Reintentar", recovered: /el pedido aún no está en despacho/i,
    status: 202, json: { data: null },
  },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  for (const [device, viewport] of Object.entries({
    escritorio: { width: 1280, height: 900 },
    movil: { width: 390, height: 844 },
  })) {
    for (const c of cases) {
      const page = await browser.newPage({ viewport, serviceWorkers: "block" });
      const row = { dispositivo: device, caso: c.id, ruta: c.path, pruebaUtc: new Date().toISOString(), respuestasSimuladas: [] };
      let recover = false;
      try {
        // Las acciones que escriben quedan bloqueadas en el navegador de prueba.
        await page.route("**/*", route => ["GET", "HEAD"].includes(route.request().method())
          ? route.continue() : route.abort());
        if (c.session) {
          const testSession = { authenticated: true, scope: "qa-owner", user: { id: "qa-owner" } };
          await page.route(url => url.origin === origin && url.pathname === "/api/v1/auth/session",
            route => route.request().method() === "GET" ? route.fulfill({ json: testSession }) : route.abort());
        }
        if (c.checkout) {
          const testCart = { data: { cartId: "CART-QA", version: 1, items: [{ sku: "SKU-QA", quantity: 1 }] } };
          await page.route(url => url.origin === origin && url.pathname === "/api/cart/current",
            route => route.request().method() === "GET" ? route.fulfill({ json: testCart }) : route.abort());
        }
        await page.route(url => url.origin === origin && url.pathname === c.api, async route => {
          if (route.request().method() !== "GET") return route.abort();
          const status = recover ? c.status ?? 200 : 503;
          row.respuestasSimuladas.push(status);
          return route.fulfill({ status, json: recover ? c.json : c.error });
        });
        const nav = await page.goto(origin + c.path, { waitUntil: "domcontentloaded", timeout: 18000 });
        row.documentoHttp = nav.status();
        row.vercelRequestId = await nav.headerValue("x-vercel-id");
        row.rutaFinal = new URL(page.url()).pathname;
        row.deployId = await page.locator("html").getAttribute("data-dpl-id", { timeout: 4000 });
        if (c.session) row.sesionSimulada = true;
        const main = page.getByRole("main").first();
        if (c.checkout && await main.getByText("Fixtures locales", { exact: true }).isVisible()) {
          row.modo = "Fixtures locales";
          const fixturePath = device + "-" + c.id + "-modo-fixture.png";
          await page.screenshot({ path: join(output, fixturePath), animations: "disabled", fullPage: true });
          row.capturaModo = fixturePath;
          throw new Error("La versión publicada de checkout muestra direcciones del fixture");
        }
        const retrier = main.getByRole("button", { name: c.retry, exact: true });
        await retrier.waitFor({ timeout: 8000 });
        await main.getByText(c.message).first().waitFor({ timeout: 5000 });
        const errorPath = device + "-" + c.id + "-error.png";
        await page.screenshot({ path: join(output, errorPath), animations: "disabled", fullPage: true });
        row.capturaError = errorPath;
        recover = true;
        await retrier.click();
        const recovered = c.recoveredText ? main.getByText(c.recovered).first()
          : main.getByRole("heading", { name: c.recovered });
        await recovered.waitFor({ timeout: 8000 });
        if (c.id.startsWith("v006") && new URL(page.url()).searchParams.get("q") !== "polo") {
          throw new Error("El reintento perdió la búsqueda");
        }
        const recoveredPath = device + "-" + c.id + "-recuperado.png";
        await page.screenshot({ path: join(output, recoveredPath), animations: "disabled", fullPage: true });
        row.capturaRecuperacion = recoveredPath;
        if (!row.respuestasSimuladas.includes(503) || !row.respuestasSimuladas.includes(c.status ?? 200)) {
          throw new Error("No se observaron ambas respuestas");
        }
        row.resultado = "PASS";
      } catch {
        row.resultado = "INCONCLUSO";
        row.encabezados = await page.getByRole("heading").allTextContents().catch(() => []);
        row.motivo = row.modo
          ? "Checkout muestra datos de fixture y no consulta el endpoint de direcciones."
          : row.respuestasSimuladas.length
            ? "El UI publicado difiere del comportamiento esperado para la respuesta simulada"
            : "El navegador no llegó a consumir la respuesta simulada";
      } finally {
        results.push(row);
        console.log(device, c.id, row.resultado, row.documentoHttp, row.respuestasSimuladas.join("→"));
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(join(output, "resultados.json"), JSON.stringify({ origen: origin, casos: results }, null, 2) + "\n");
}
if (results.some(row => row.resultado !== "PASS")) process.exitCode = 1;
