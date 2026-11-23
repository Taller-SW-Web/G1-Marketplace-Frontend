import { expect, test } from "./csp-guard";
import type { Page, Route } from "@playwright/test";

// H5 · E2E de navegador V-001..V-004 + cierre de sesión. **MOCK**: el BFF /api/v1/* se
// responde con page.route usando los códigos del contrato G7 (catalogo-errores.md). No hay
// G7, Backend ni base de datos detrás; no acredita integración REAL.
// Con E2E_EVIDENCE=1 guarda capturas en docs/evidencias/H5/UX-010-cuenta-V001-V004/e2e.

const policy = { longitudMinima: 12, historial: 5, requiereMayuscula: true, requiereMinuscula: true,
  requiereDigito: true, requiereCaracterEspecial: true, rechazaComunes: true, rechazaDatosPersonales: true };
const user = { id: "11111111-1111-4111-8111-111111111111", nombreCompleto: "Cliente fixture", roles: ["CLIENTE"] };
// En producción G1 solo acepta G7 por https (playwright.e2e-csp.config.ts usa un origen fixture).
const G7 = process.env.E2E_G7_ORIGIN ?? "http://127.0.0.1:4011";
const invalidCredentials = "No pudimos iniciar sesión con esos datos. Revisa tu correo y contraseña e inténtalo de nuevo.";

type Bff = { authenticated: boolean; logins: number; logouts: number; login?: (route: Route, body: Record<string, unknown>) => Promise<void> | void };

async function mockBff(page: Page, overrides: Partial<Bff> = {}) {
  const state: Bff = { authenticated: false, logins: 0, logouts: 0, ...overrides };
  await page.route("**/api/catalog/**", route => route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } }));
  await page.route("**/api/cart/**", route => route.fulfill({ json: { data: { cartId: null, version: 0, items: [] } } }));
  await page.route("**/api/wishlist**", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1/", "");
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    if (path === "auth/session") return route.fulfill({ json: state.authenticated ? { authenticated: true, scope: "fixture-a", user } : { authenticated: false, scope: "anonymous" } });
    if (path === "auth/capabilities") return route.fulfill({ json: { login: true, registro: true, recuperacion: true } });
    if (path === "password/politica") return route.fulfill({ json: policy });
    if (path === "auth/login") {
      state.logins++;
      if (state.login) return state.login(route, body);
      return route.fulfill({ status: 401, json: { code: "CREDENCIALES_INVALIDAS" } });
    }
    if (path === "auth/logout") { state.logouts++; state.authenticated = false; return route.fulfill({ json: { authenticated: false } }); }
    return route.fulfill({ status: 503, json: { code: "AUTH_UNAVAILABLE" } });
  });
  // SPA de recuperación G7: página stub; G1 sólo debe llegar aquí sin datos del usuario.
  await page.route(`${G7}/**`, route => route.fulfill({ contentType: "text/html; charset=utf-8", body: "<!doctype html><meta charset=\"utf-8\"><title>G7 (MOCK)</title><h1>Recuperación G7 (MOCK)</h1>" }));
  return state;
}

async function evidence(page: Page, name: string) {
  if (!process.env.E2E_EVIDENCE) return;
  const project = test.info().project.name;
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.screenshot({ animations: "disabled", path: `docs/evidencias/H5/UX-010-cuenta-V001-V004/e2e/${project}-${name}.png`, fullPage: true, caret: "initial" });
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function fillLogin(page: Page, correo: string, contrasena = "Fixture-only!123") {
  await page.getByLabel("Correo electrónico", { exact: true }).fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
}

async function webStorage(page: Page) {
  return page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
}

test.describe("V-002 Registro", () => {
  test("valida en línea, conserva datos ante 409 neutral y acepta la solicitud sin iniciar sesión", async ({ page }) => {
    let status = 409;
    const state = await mockBff(page);
    await page.route("**/api/v1/auth/registro", route => route.fulfill(status === 409
      ? { status: 409, json: { code: "CORREO_NO_DISPONIBLE" } }
      : { status: 201, json: { id: user.id, estado: "PENDIENTE_VERIFICACION" } }));
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeFocused();
    const submit = page.getByRole("button", { name: "Crear cuenta", exact: true });
    await submit.click();
    const nombres = page.getByLabel("Nombres", { exact: true });
    await expect(nombres).toBeFocused();
    await expect(nombres).toHaveAttribute("aria-invalid", "true");
    await evidence(page, "V002-validacion");
    await nombres.fill("Cuenta");
    await expect(nombres).not.toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Contraseña", { exact: true }).fill("Valid-fixture!123");
    await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Valid-fixture!123");
    await page.getByLabel("Apellidos", { exact: true }).fill("Fixture");
    await page.getByLabel("Correo electrónico", { exact: true }).fill("existente@fixture.test");
    await page.getByLabel("Celular", { exact: true }).fill("900000000");
    await page.getByRole("checkbox").check();
    await submit.click();
    const alert = page.getByRole("alert").filter({ hasText: "No pudimos completar el registro con esos datos" });
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText("existe");
    await expect(page.getByLabel("Correo electrónico", { exact: true })).toHaveValue("existente@fixture.test");
    await evidence(page, "V002-409-neutral");
    await noHorizontalScroll(page);

    status = 201;
    await submit.click();
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeFocused();
    await expect(page.getByText("La sesión aún no está iniciada.", { exact: false })).toBeVisible();
    expect(state.authenticated).toBe(false);
    await evidence(page, "V002-solicitud-aceptada");
  });
});

test.describe("V-002 Registro · contraseña", () => {
  test("un mensaje rojo por regla de la política que desaparece al cumplirla; confirmación que no coincide", async ({ page }) => {
    await mockBff(page);
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeFocused();
    // Ajuste Jim 21/11: sin checklist; un mensaje rojo por regla incumplida que desaparece al cumplirla.
    const password = page.getByLabel("Contraseña", { exact: true });
    const passwordErrors = page.locator(".field").filter({ has: password }).locator(".field-errors .field-error");
    const rule = (text: string) => page.locator(".field-errors .field-error", { hasText: text });
    await evidence(page, "V002-contrasena-vacia");
    await password.fill("corta");
    for (const text of ["al menos 12 caracteres", "mayúscula", "número", "carácter especial"]) await expect(rule(text)).toBeVisible();
    await expect(rule("minúscula")).toHaveCount(0);
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await evidence(page, "V002-contrasena-debil");
    await password.fill("Cortaperolarga1");
    await expect(passwordErrors).toHaveText(["Debe incluir un carácter especial, por ejemplo ! o #."]);
    await evidence(page, "V002-contrasena-un-mensaje");
    await password.fill("Valid-fixture!123");
    await expect(passwordErrors).toHaveCount(0);
    await expect(password).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Cumplido|Pendiente|Formato comprobado|Coinciden/)).toHaveCount(0);
    await evidence(page, "V002-contrasena-valida");
    const confirmation = page.getByLabel("Confirmar contraseña", { exact: true });
    await confirmation.fill("Valid-fixture!12");
    await expect(rule("Las contraseñas no coinciden.")).toBeVisible();
    await evidence(page, "V002-confirmacion-no-coincide");
    await confirmation.fill("Valid-fixture!123");
    await expect(rule("Las contraseñas no coinciden.")).toHaveCount(0);
  });
});

test.describe("V-001 Inicio de sesión", () => {
  test.describe("casos clave con video", () => {

    test("credenciales inválidas, cuenta sin verificar y bloqueada responden igual (sin enumerar) y luego se limita", async ({ page }) => {
      const seen: string[] = [];
      await mockBff(page, { login: (route, body) => {
        seen.push(String(body.correo));
        // G7 responde 401 idéntico para inválida, sin verificar y bloqueada; 429 al superar el límite.
        return seen.length >= 4
          ? route.fulfill({ status: 429, json: { code: "RATE_LIMITED" } })
          : route.fulfill({ status: 401, json: { code: "CREDENCIALES_INVALIDAS" } });
      } });
      await page.goto("/login");
      const messages: string[] = [];
      for (const correo of ["no-existe@fixture.test", "sin-verificar@fixture.test", "bloqueada@fixture.test"]) {
        await fillLogin(page, correo);
        const alert = page.locator(".auth-feedback--error");
        await expect(alert).toHaveText(invalidCredentials);
        await expect(alert).toBeFocused();
        messages.push(await alert.innerText());
      }
      expect(new Set(messages).size).toBe(1);
      await evidence(page, "V001-credenciales-invalidas");
      await fillLogin(page, "bloqueada@fixture.test");
      await expect(page.locator(".auth-feedback--error")).toHaveText("Has realizado varios intentos. Espera antes de volver a intentarlo.");
      await evidence(page, "V001-limite-intentos");
      expect(seen).toHaveLength(4);
    });

    test("credenciales válidas con MFA: sin sesión antes del código, retorno seguro y sin tokens en almacenamiento web", async ({ page }) => {
      const state = await mockBff(page, { login: route => route.fulfill({ json: { mfaRequerido: true, expiraEn: 300, accessToken: "eyJ.fixture-should-not-persist" } }) });
      await page.route("**/api/v1/auth/otp/solicitar", route => route.fulfill({ json: { expiraEn: 300, desafioExpiraEn: 300, destinoEnmascarado: "c***@fixture.test" } }));
      await page.route("**/api/v1/auth/otp/verificar", async route => {
        const ok = route.request().postDataJSON().codigo === "123456";
        if (ok) state.authenticated = true;
        await route.fulfill(ok ? { json: { authenticated: true, scope: "fixture-a", user } } : { status: 401, json: { code: "CODIGO_INVALIDO" } });
      });
      await page.goto("/login?returnTo=https%3A%2F%2Fevil.test%2Fphish");
      await fillLogin(page, "cliente@fixture.test");
      await expect(page.getByLabel("Código de verificación")).toBeVisible();
      expect(state.authenticated).toBe(false);
      expect((await page.evaluate(() => fetch("/api/v1/auth/session").then(r => r.json()))).authenticated).toBe(false);
      await evidence(page, "V001-mfa");
      await page.getByLabel("Código de verificación").fill("000000");
      await page.getByRole("button", { name: "Verificar código", exact: true }).click();
      await expect(page.locator(".auth-feedback--error")).toHaveText("El código no es válido. Revísalo e inténtalo de nuevo.");
      expect(state.authenticated).toBe(false);
      await page.getByLabel("Código de verificación").fill("123456");
      await page.getByRole("button", { name: "Verificar código", exact: true }).click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
      expect(await webStorage(page)).not.toMatch(/eyJ|token|contrasena|Fixture-only/i);
      expect(await page.evaluate(() => document.cookie)).not.toMatch(/token|session/i);
    });
  });

  test("validación local y credenciales válidas sin MFA vuelven a una ruta interna", async ({ page }) => {
    const state = await mockBff(page, { login: route => { state.authenticated = true; return route.fulfill({ json: { authenticated: true, scope: "fixture-a", user } }); } });
    await page.goto("/login?returnTo=%2Fcarrito");
    await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeFocused();
    await evidence(page, "V001-principal");
    await fillLogin(page, "correo-invalido", "");
    await expect(page.getByText("Ingresa un correo electrónico válido.")).toBeVisible();
    await expect(page.getByText("Ingresa tu contraseña.")).toBeVisible();
    await expect(page.getByLabel("Correo electrónico", { exact: true })).toBeFocused();
    expect(state.logins).toBe(0);
    await evidence(page, "V001-validacion");
    await noHorizontalScroll(page);
    await fillLogin(page, "cliente@fixture.test");
    await expect(page).toHaveURL("/carrito");
    await expect(page.getByText("Cliente fixture")).toBeVisible();
  });
});

test.describe("V-003 / V-004 Recuperación y restablecimiento (SPA G7)", () => {
  test("el login enlaza a la SPA G7 con canal fijo, sin datos del formulario ni referrer", async ({ page }) => {
    await mockBff(page);
    await page.goto("/login");
    await page.getByLabel("Correo electrónico", { exact: true }).fill("cliente@fixture.test");
    const link = page.getByRole("link", { name: "¿Olvidaste tu contraseña?" });
    await expect(link).toHaveAttribute("href", `${G7}/recuperar-contrasena?canal=MARKETPLACE`);
    await expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
    const request = page.waitForRequest(`${G7}/**`);
    await link.click();
    const sent = await request;
    expect(sent.url()).toBe(`${G7}/recuperar-contrasena?canal=MARKETPLACE`);
    expect(sent.headers().referer).toBeUndefined();
    await expect(page.getByRole("heading", { name: "Recuperación G7 (MOCK)" })).toBeVisible();
  });

  test("/recuperar-contrasena redirige a G7 y descarta parámetros recibidos", async ({ page }) => {
    await mockBff(page);
    const request = page.waitForRequest(`${G7}/**`);
    // page.route no intercepta destinos de redirección: el puerto G7 está cerrado y la
    // navegación falla a propósito; sólo importa la URL que el navegador solicitó.
    await page.goto("/recuperar-contrasena?correo=cliente%40fixture.test").catch(() => undefined);
    const sent = await request;
    expect(sent.url()).toBe(`${G7}/recuperar-contrasena?canal=MARKETPLACE`);
    expect(sent.url()).not.toContain("fixture.test");
  });

  test.describe("caso clave con video", () => {
    // G1 ya no procesa tokens (decisión PO 26/10): un enlace válido, vencido o ya usado
    // recibe el mismo trato. Su validez la decide la SPA G7 (pendiente REAL).
    for (const [kind, url] of [
      ["valido", "/restablecer-contrasena?token=fixture-token-valido"],
      ["vencido", "/restablecer-contrasena?token=fixture-token-vencido&expira=0"],
      ["usado", "/restablecer-contrasena#token=fixture-token-usado"],
    ] as const) {
      test(`enlace heredado ${kind}: el token no queda en URL, HTML ni se reenvía; no hay sesión automática`, async ({ page }) => {
        const state = await mockBff(page);
        const leaked: string[] = [];
        page.on("request", request => { if (request.url().includes("fixture-token") && !request.url().includes("/restablecer-contrasena")) leaked.push(request.url()); });
        page.on("request", request => { if ((request.headers().referer ?? "").includes("fixture-token")) leaked.push(`referer:${request.url()}`); });
        const response = await page.goto(url);
        await expect(page.getByRole("heading", { name: "Restablece tu contraseña en Seguridad" })).toBeFocused();
        await expect(page).toHaveURL("/restablecer-contrasena");
        expect(await page.evaluate(() => location.hash + location.search + JSON.stringify(history.state))).not.toContain("fixture-token");
        expect(await response!.text()).not.toContain("fixture-token");
        expect(await page.content()).not.toContain("fixture-token");
        if (kind === "valido") await evidence(page, "V004-enlace-heredado");
        const go = page.getByRole("link", { name: "Ir a recuperación" });
        await expect(go).toHaveAttribute("href", `${G7}/recuperar-contrasena?canal=MARKETPLACE`);
        await go.click();
        await expect(page.getByRole("heading", { name: "Recuperación G7 (MOCK)" })).toBeVisible();
        expect(leaked).toEqual([]);
        expect(state.logins).toBe(0);
        expect(state.authenticated).toBe(false);
      });
    }
  });
});

test.describe("Cierre de sesión", () => {

  test("invalida la sesión y volver atrás no la recupera", async ({ page }) => {
    const state = await mockBff(page, { authenticated: true });
    await page.goto("/carrito");
    const logout = page.getByRole("button", { name: "Cerrar sesión", exact: true });
    await expect(logout).toBeVisible();
    await evidence(page, "logout-antes");
    await logout.click();
    await expect(page).toHaveURL("/?sesion=cerrada");
    await expect(page.getByRole("status").filter({ hasText: "Sesión cerrada." })).toBeVisible();
    expect(state.logouts).toBe(1);
    await evidence(page, "logout-cerrada");
    await page.goBack();
    await expect(page).toHaveURL("/carrito");
    await expect(page.getByRole("link", { name: "Iniciar sesión" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toHaveCount(0);
    await expect(page.getByText("Cliente fixture")).toHaveCount(0);
    expect((await page.evaluate(() => fetch("/api/v1/auth/session").then(r => r.json()))).authenticated).toBe(false);
    await evidence(page, "logout-volver-atras");
  });
});
