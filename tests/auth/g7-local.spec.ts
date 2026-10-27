import { test, expect } from "@playwright/test";

// Requires explicitly started Next+BFF+G7 fixture and a disposable PostgreSQL DB.
// No traces or HAR: authentication exchanges should never be attached unredacted.
test("MFA → private wishlist → reload → second tab → logout", async ({ page, context }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.name));
  await page.goto("/login?returnTo=%2Ffavoritos");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("mfa@fixture.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Fixture-only!123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByLabel("Código de verificación")).toBeVisible();
  await expect(page.getByText("Correo: m***@fixture.test")).toBeVisible();
  await page.screenshot({ path: "test-results/auth-h4/mfa-desktop.png", fullPage: true, caret: "initial" });
  const before = await page.request.get("/api/v1/auth/session");
  expect((await before.json()).authenticated).toBe(false);
  await page.getByLabel("Código de verificación").fill("123456");
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(page).toHaveURL(/\/favoritos$/);
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
  await expect(page.getByText("Cliente de prueba H4", { exact: true })).toBeVisible();
  const list = await page.request.get("/api/wishlist"); expect(list.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
  const cookies = (await context.cookies()).filter(cookie => cookie.name === "g1_session");
  expect(cookies).toHaveLength(1); expect(cookies[0].httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie.includes("g1_session"))).toBe(false);
  const second = await context.newPage(); await second.goto("/favoritos");
  await expect(second.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3002/?sesion=cerrada");
  await expect(page.getByRole("status").filter({ hasText: "Sesión cerrada." })).toBeVisible();
  await expect(second.getByRole("button", { name: "Cerrar sesión", exact: true })).toHaveCount(0);
  await expect(second.getByRole("link", { name: "Iniciar sesión", exact: true }).first()).toBeVisible();
  expect((await second.request.get("/api/wishlist")).status()).toBe(401);
  expect(errors).toEqual([]); await second.close();
});

test("mobile login layout and unsafe return", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login?returnTo=https%3A%2F%2Fevil.test");
  await expect(page.getByRole("heading", { name: "Inicia sesión", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/auth-h4/login-mobile.png", fullPage: true, caret: "initial" });
  await page.getByLabel("Correo electrónico", { exact: true }).fill("a@fixture.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Fixture-only!123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3002/");
});
