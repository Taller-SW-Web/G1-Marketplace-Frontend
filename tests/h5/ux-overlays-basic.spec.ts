import { expect, test } from "../e2e/csp-guard";
import type { Page, TestInfo } from "@playwright/test";

const sizes = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const { name, width, height } of sizes) {
  test(`O-006 · última línea y deshacer en ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/demo/h5/qa-carrito");
    await page.getByRole("button", { name: "Quitar Zapatillas de prueba del carrito" }).click();
    await expect(page.getByRole("heading", { name: "Tu carrito está vacío" })).toBeVisible();
    const undo = page.getByRole("button", { name: "Deshacer eliminación de Zapatillas de prueba" });
    await undo.focus();
    await expect(undo).toBeFocused();
    await expect(page.getByRole("link", { name: "Explorar catálogo" })).toBeVisible();
    await capture(page, testInfo, "o006-carrito-vacio-con-deshacer");
    await undo.click();
    await expect(page.getByRole("button", { name: "Quitar Zapatillas de prueba del carrito" })).toBeVisible();
    await expect(undo).toHaveCount(0);
  });

  test(`O-007 · ajustes de fusión y Escape en ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto("/demo/h5/qa-carrito");
    const trigger = page.getByRole("button", { name: "Simular resultado de fusión tras MFA" });
    const dialog = page.getByRole("dialog", { name: "Ajustes en tu carrito" });
    await expect(dialog).toHaveCount(0);
    await trigger.click();
    await expect(dialog.getByText("Solicitaste 5 · Ajustado a 2")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Entendido" })).toBeFocused();
    await capture(page, testInfo, "o007-ajustes-fusion");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
