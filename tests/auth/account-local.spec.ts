import { test, expect } from "@playwright/test";

test("registration uses the BFF and stays pending verification; mobile layout", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/registro");
  await expect(page.getByRole("button", { name: "Crear cuenta", exact: true })).toBeEnabled();
  await page.screenshot({ path: "test-results/auth-h4/registro-desktop.png", fullPage: true, caret: "initial" });
  await page.setViewportSize({ width: 390, height: 1137 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/auth-h4/registro-mobile.png", fullPage: true, caret: "initial" });
  for (const [label, value] of [["Nombres", "Cuenta Prueba"], ["Apellidos", "Fixture"], ["Correo electrónico", "new@fixture.test"],
    ["Celular", "900000000"], ["Contraseña", "Only-fixture!123"], ["Confirmar contraseña", "Only-fixture!123"]]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu correo", exact: true })).toBeVisible();
  await expect(page.getByText(/La sesión aún no está iniciada/)).toBeVisible();
  expect((await context.cookies()).some(cookie => cookie.name.includes("g1_session"))).toBe(false);
});

test("recovery is neutral and reset scrubs the link, validates policy, and never logs in", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto("/recuperar-contrasena");
  await expect(page.getByRole("button", { name: "Enviar instrucciones" })).toBeEnabled();
  await page.screenshot({ path: "test-results/auth-h4/recuperar-mobile.png", fullPage: true, caret: "initial" });
  await page.getByLabel("Correo electrónico").fill("unknown@fixture.test"); await page.getByRole("button", { name: "Enviar instrucciones" }).click();
  await expect(page.getByText("Si el correo es válido, recibirás instrucciones para continuar.")).toBeVisible();
  const response = await page.goto("/restablecer-contrasena?token=valid-fixture");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page).toHaveURL("http://127.0.0.1:3002/restablecer-contrasena");
  await expect(page.getByRole("button", { name: "Guardar nueva contraseña" })).toBeEnabled();
  expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain("valid-fixture");
  await page.screenshot({ path: "test-results/auth-h4/restablecer-mobile.png", fullPage: true, caret: "initial" });
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Changed-fixture!123");
  await page.getByLabel("Confirma tu contraseña", { exact: true }).fill("Changed-fixture!123");
  await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await expect(page.getByRole("heading", { name: "Contraseña actualizada" })).toBeVisible();
  expect((await context.cookies()).some(cookie => cookie.name.includes("g1_session"))).toBe(false);
});

test("expired reset link removes the form; checkout logout is cancelable with correct focus", async ({ page }) => {
  await page.goto("/restablecer-contrasena?token=expired-fixture");
  await expect(page.getByRole("button", { name: "Guardar nueva contraseña" })).toBeEnabled();
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Changed-fixture!123");
  await page.getByLabel("Confirma tu contraseña", { exact: true }).fill("Changed-fixture!123"); await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
  await expect(page.getByRole("heading", { name: "Enlace vencido" })).toBeVisible();
  await expect(page.getByLabel("Nueva contraseña", { exact: true })).toHaveCount(0);
  await page.goto("/login?returnTo=%2Fcheckout");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("a@fixture.test"); await page.getByLabel("Contraseña", { exact: true }).fill("Fixture-only!123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click(); await expect(page).toHaveURL(/\/checkout$/);
  const logout = page.getByRole("button", { name: "Cerrar sesión", exact: true }); await expect(logout).toBeVisible(); await logout.click();
  const dialog = page.getByRole("dialog", { name: "¿Cerrar sesión?" }); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continuar checkout" })).toBeFocused();
  await page.screenshot({ path: "test-results/auth-h4/logout-checkout.png", caret: "initial" });
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(logout).toBeFocused();
  await logout.click(); await dialog.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3002/?sesion=cerrada");
});
