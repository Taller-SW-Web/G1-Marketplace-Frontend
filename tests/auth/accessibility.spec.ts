import { expect, test, type Page } from "@playwright/test";

// UI contract fixtures only: this suite does not authenticate against G7/BFF.
const policy = { longitudMinima: 12, requiereMayuscula: true, requiereMinuscula: true,
  requiereDigito: true, requiereCaracterEspecial: false, historial: 5 };
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/session")) return route.fulfill({ json: { authenticated: false, scope: "anonymous" } });
    if (path.endsWith("/capabilities")) return route.fulfill({ json: { login: true, registro: true, recuperacion: true } });
    if (path.endsWith("/politica")) return route.fulfill({ json: policy });
    return route.fulfill({ status: 503, json: { code: "AUTH_UNAVAILABLE" } });
  });
  await page.route("**/api/catalog/**", route => route.fulfill({ status: 503, json: { code: "CATALOG_UNAVAILABLE" } }));
});
async function registrationFields(page: Page) {
  for (const [label, value] of [["Nombres", "Cuenta Local"], ["Apellidos", "Fixture"],
    ["Correo electrónico", "new@fixture.test"], ["Celular", "900000000"],
    ["Contraseña", "Valid-fixture!123"], ["Confirmar contraseña", "Valid-fixture!123"]]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("checkbox").check();
}
test("registration focuses field errors and policy rejection, then the pending heading", async ({ page }) => {
  let reject = true;
  await page.route("**/api/v1/auth/registro", route => route.fulfill(reject
    ? { status: 422, json: { code: "POLITICA_INCUMPLIDA" } }
    : { status: 201, json: { id: "11111111-1111-4111-8111-111111111111", estado: "PENDIENTE_VERIFICACION" } }));
  await page.goto("/registro");
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeFocused();
  await expect(page).toHaveTitle(/Crea tu cuenta/);
  const submit = page.getByRole("button", { name: "Crear cuenta", exact: true });
  await expect(submit).toBeEnabled(); await submit.click();
  await expect(page.getByLabel("Nombres", { exact: true })).toBeFocused();
  await registrationFields(page); await submit.click();
  const password = page.getByLabel("Contraseña", { exact: true });
  await expect(password).toBeFocused(); await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveValue("");
  await expect(page.getByLabel("Correo electrónico")).toHaveValue("new@fixture.test");
  await password.fill("Different-fixture!123");
  await page.keyboard.press("Tab");
  const show = page.getByRole("button", { name: "Mostrar contraseña", exact: true });
  await expect(show).toBeFocused(); await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Ocultar contraseña", exact: true })).toBeFocused();
  await expect(password).toHaveAttribute("type", "text");
  reject = false;
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Different-fixture!123");
  await submit.click(); await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeFocused();
});

test("recovery fallback is accessible when the G7 URL is not configured", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/recuperar-contrasena");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByRole("heading", { name: "Recuperación no disponible" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Volver a iniciar sesión" })).toHaveAttribute("href", "/login");
  await expect(page.getByLabel("Correo electrónico")).toHaveCount(0);
});

test("legacy reset link clears its parameters and offers a safe exit", async ({ page }) => {
  const first = await page.request.get("/restablecer-contrasena?token=only-ui-fixture", { maxRedirects: 0 });
  expect(first.status()).toBe(307);
  expect(first.headers().location).toBe("/restablecer-contrasena");
  await page.goto("/restablecer-contrasena?token=only-ui-fixture");
  await expect(page.getByRole("heading", { name: "Restablece tu contraseña en Seguridad" })).toBeFocused();
  await expect(page).toHaveURL("http://127.0.0.1:3002/restablecer-contrasena");
  await expect(page.getByRole("link", { name: "Volver a iniciar sesión" })).toHaveAttribute("href", "/login");
  await expect(page.getByLabel("Nueva contraseña")).toHaveCount(0);
  expect(await page.content()).not.toContain("only-ui-fixture");
});

test("MFA changes step with heading focus and focuses a neutral code error", async ({ page }) => {
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { mfaRequerido: true, canal: "EMAIL", expiraEn: 300 } }));
  await page.route("**/api/v1/auth/otp/solicitar", route => route.fulfill({ json: { canal: "EMAIL", destinoEnmascarado: "a***@fixture.test", expiraEn: 300, desafioExpiraEn: 300 } }));
  await page.route("**/api/v1/auth/otp/verificar", route => route.fulfill({ status: 401, json: { code: "CODIGO_INVALIDO" } }));
  await page.goto("/login"); await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toBeFocused();
  await page.getByLabel("Correo electrónico", { exact: true }).fill("a@fixture.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Only-fixture!123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verifica tu acceso" })).toBeFocused();
  await page.getByLabel("Código de verificación").fill("999999");
  await page.getByRole("button", { name: "Verificar código" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "El código no es válido" })).toBeFocused();
  await page.getByRole("button", { name: "Volver al inicio de sesión" }).click();
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeFocused();
});

test("MFA expiry moves focus from the code to the expiry notice without announcing each tick", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: { mfaRequerido: true, canal: "EMAIL", expiraEn: 2 } }));
  await page.route("**/api/v1/auth/otp/solicitar", route => route.fulfill({ json: { canal: "EMAIL", destinoEnmascarado: "a***@fixture.test", expiraEn: 2, desafioExpiraEn: 2 } }));
  await page.goto("/login");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("a@fixture.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Only-fixture!123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.getByLabel("Código de verificación").focus();
  await expect(page.getByRole("timer")).toHaveAttribute("aria-live", "off");
  await page.clock.fastForward(2500);
  await expect(page.getByRole("status").filter({ hasText: "El desafío venció" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Verificar código" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Volver al inicio de sesión" })).toBeEnabled();
});
