import { expect, test } from "@playwright/test";

test("checkout local fixtures cover coupon, consent, and clearly labeled paid fixture", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Fixtures locales")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible();
  await page.getByLabel("Código promocional").fill("SAVE20");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupón aplicado.")).toBeVisible();
  await page.getByRole("button", { name: "Continuar al pago simulado" }).click();
  await expect(page.getByRole("heading", { name: "Pago simulado" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar consentimiento" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Registrar consentimiento" }).click();
  await expect(page.getByRole("heading", { name: "Confirma y crea tu pedido" })).toBeVisible();
  await page.getByLabel("Nombre completo").fill("Ana Prueba");
  await page.getByLabel("Número de documento").fill("12345678");
  await page.getByLabel("Teléfono").fill("999999999");
  await page.getByLabel("Correo electrónico").fill("ana@example.test");
  await page.getByRole("button", { name: "Crear pedido" }).click();
  await expect(page.getByRole("heading", { name: "¡Pedido confirmado!" })).toBeVisible();
  await expect(page.getByText("Resultado de fixture · SUCCEEDED/PAGADO")).toBeVisible();
  await expect(page.getByText("PAGADO (fixture)")).toBeVisible();
});

test("address form validates required fields and saves a local fixture address", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Agregar dirección" }).click();
  await page.getByLabel("Etiqueta").fill("Nueva casa");
  await page.getByRole("textbox", { name: "Dirección" }).fill("Av. Prueba 10");
  await page.getByRole("textbox", { name: "Departamento" }).fill("Lima");
  await page.getByRole("textbox", { name: "Provincia" }).fill("Lima");
  await page.getByRole("textbox", { name: "Distrito" }).fill("Surco");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("977777777");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.getByText("Nueva casa")).toBeVisible();
  await expect(page.getByText("Av. Prueba 10, Surco, Lima")).toBeVisible();
});
