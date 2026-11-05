import { expect, test } from "@playwright/test";

// Requires the local G7 contract fixture and a disposable PostgreSQL-backed BFF.
test("G7 contract fixture rejects an invalid OTP before creating a session", async ({ page }) => {
  await page.goto("/login?returnTo=%2Ffavoritos");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("mfa@fixture.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("Fixture-only!123");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByLabel("Código de verificación")).toBeVisible();

  await page.getByLabel("Código de verificación").fill("999999");
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "El código no es válido" })).toBeVisible();
  expect((await (await page.request.get("/api/v1/auth/session")).json()).authenticated).toBe(false);

  await page.getByLabel("Código de verificación").fill("123456");
  await page.getByRole("button", { name: "Verificar código", exact: true }).click();
  await expect(page).toHaveURL(/\/favoritos$/);
  expect((await (await page.request.get("/api/v1/auth/session")).json()).authenticated).toBe(true);
});
