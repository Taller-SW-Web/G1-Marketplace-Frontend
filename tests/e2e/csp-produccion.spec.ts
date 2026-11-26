import { expect, test } from "./csp-guard";

// H5 DAST · Content-Security-Policy en producción. **MOCK**: el BFF se responde con page.route;
// se valida la cabecera que envía el frontend y que ninguna ruta principal la viole.
const routes = ["/", "/catalogo", "/login", "/registro", "/carrito", "/checkout", "/checkout/direccion",
  "/favoritos", "/mis-pedidos", "/privacidad", "/terminos"];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/auth/session") return route.fulfill({ json: { authenticated: false, scope: "anonymous" } });
    if (path === "/api/v1/auth/capabilities") return route.fulfill({ json: { login: true, registro: true, recuperacion: true } });
    if (path.startsWith("/api/cart/")) return route.fulfill({ json: { data: { cartId: null, version: 0, items: [] } } });
    return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
  });
});

test("la cabecera CSP es restrictiva y usa un nonce nuevo en cada respuesta", async ({ request }) => {
  const first = await request.get("/login");
  const second = await request.get("/login");
  const csp = first.headers()["content-security-policy"];
  expect(csp).toBeTruthy();
  expect(first.headers()["content-security-policy-report-only"]).toBeUndefined();
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(csp).not.toMatch(/(^|\s)\*(\s|;|$)|\*\.|\s(https?|wss?):(\s|;|$)/);
  for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'",
    "form-action 'self'", "connect-src 'self'", "font-src 'self'"]) expect(csp).toContain(directive);
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce).toBeTruthy();
  expect(second.headers()["content-security-policy"]).not.toContain(nonce);
  // Next aplica el nonce a sus propios <script>.
  expect(await first.text()).toContain(`nonce="${nonce}"`);
  // Se mantienen las demás cabeceras de seguridad.
  expect(first.headers()["x-frame-options"]).toBe("DENY");
  expect(first.headers()["x-content-type-options"]).toBe("nosniff");
  const api = await request.get("/api/v1/auth/session");
  expect(api.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
});

for (const path of routes) {
  test(`sin violaciones de CSP en ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main, [role=main]").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    // Next hidrata: un script bloqueado dejaría la página sin interactividad.
    expect(await page.evaluate(() => document.querySelectorAll("script:not([nonce])[src], script:not([nonce]):not([src])").length)).toBe(0);
  });
}

test("el navegador bloquea un manejador inline inyectado (XSS) y csp-guard lo detecta", async ({ page, cspViolations }) => {
  await page.goto("/login");
  await page.evaluate(() => {
    document.body.insertAdjacentHTML("beforeend", '<img src="/figma/no-existe.png" alt="" onerror="window.__inyectado = true">');
  });
  await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => "__inyectado" in window)).toBe(false);
  expect(cspViolations.join("\n")).toMatch(/enforce script-src(-attr)? inline/);
  cspViolations.length = 0; // violación provocada a propósito
});
