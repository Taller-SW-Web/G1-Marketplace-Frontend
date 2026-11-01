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
async function resetFields(page: Page) {
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Valid-fixture!123");
  await page.getByLabel("Confirma tu contraseña", { exact: true }).fill("Valid-fixture!123");
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

// Browser-only double: 409 represents an unavailable address but must not disclose that fact.
test("registration 409 keeps a neutral message and entered values on desktop and mobile", async ({ page }) => {
  let registrationCalls = 0;
  await page.route("**/api/v1/auth/registro", async route => {
    registrationCalls++;
    await route.fulfill({ status: 409, json: { code: "CORREO_NO_DISPONIBLE", detail: "private fixture detail" } });
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/registro");
    await registrationFields(page);
    const email = page.getByLabel("Correo electrónico", { exact: true });
    await email.fill("qa-f001@fixture.test");
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();

    const alert = page.getByText("No pudimos completar el registro con esos datos. Revisa la información o intenta recuperar el acceso.", { exact: true });
    await expect(alert).toBeFocused();
    await expect(alert).toHaveText("No pudimos completar el registro con esos datos. Revisa la información o intenta recuperar el acceso.");
    await expect(email).toHaveValue("qa-f001@fixture.test");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("Valid-fixture!123");
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain("qa-f001@fixture.test");
    expect(await page.locator("body").innerText()).not.toContain("private fixture detail");
    expect(registrationCalls).toBe(viewport.width === 1440 ? 1 : 2);
  }
});

test("recovery focuses its invalid email and the neutral confirmation", async ({ page }) => {
  await page.route("**/api/v1/password/recuperar", route => route.fulfill({ status: 202, json: { accepted: true } }));
  await page.goto("/recuperar-contrasena"); await expect(page).toHaveTitle(/Recupera tu contraseña/);
  const submit = page.getByRole("button", { name: "Enviar instrucciones" });
  await expect(submit).toBeEnabled(); await submit.click();
  await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  await page.getByLabel("Correo electrónico").fill("unknown@fixture.test"); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeFocused();
});

test("reset associates each error with its field and focuses the success outcome", async ({ page }) => {
  let reject = true;
  await page.route("**/api/v1/password/restablecer", route => route.fulfill(reject
    ? { status: 422, json: { code: "POLITICA_INCUMPLIDA" } } : { status: 204, body: "" }));
  await page.goto("/restablecer-contrasena?token=only-ui-fixture");
  const submit = page.getByRole("button", { name: "Guardar nueva contraseña" });
  await expect(submit).toBeEnabled(); await submit.click();
  const password = page.getByLabel("Nueva contraseña", { exact: true });
  await expect(password).toBeFocused(); await expect(password).toHaveAttribute("aria-invalid", "true");
  await password.fill("Valid-fixture!123"); await submit.click();
  await expect(page.getByLabel("Confirma tu contraseña", { exact: true })).toBeFocused();
  await resetFields(page); await submit.click(); await expect(password).toBeFocused(); await expect(password).toHaveValue("");
  await expect(page.getByText("Seguridad no aceptó esta contraseña.", { exact: false })).toBeVisible();
  reject = false; await resetFields(page); await submit.click();
  await expect(page.getByRole("heading", { name: "Contraseña actualizada" })).toBeFocused();
  await page.goto("/restablecer-contrasena");
  await expect(page.getByRole("heading", { name: "Enlace no válido" })).toBeFocused();
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

test("submission preserves submit focus and prevents duplicate requests while busy", async ({ page }) => {
  let calls = 0; let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/password/recuperar", async route => { calls++; await waiting; await route.fulfill({ status: 202, json: { accepted: true } }); });
  await page.goto("/recuperar-contrasena");
  const submit = page.getByRole("button", { name: "Enviar instrucciones" });
  await expect(submit).toBeEnabled(); await page.getByLabel("Correo electrónico").fill("unknown@fixture.test");
  await submit.focus(); await page.keyboard.press("Enter");
  try {
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(submit).toBeFocused(); await page.keyboard.press("Enter"); await page.keyboard.press("Space");
    const email = page.getByLabel("Correo electrónico");
    await email.focus(); await expect(email).toHaveAttribute("readonly", "");
    await page.keyboard.type("changed"); await expect(email).toHaveValue("unknown@fixture.test");
    await expect(email).toBeFocused(); await page.keyboard.press("Enter");
    expect(calls).toBe(1);
  } finally { release(); }
  await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeFocused();
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
