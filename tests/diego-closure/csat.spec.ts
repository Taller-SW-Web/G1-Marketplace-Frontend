import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/demo/h3/evaluacion"); });
test("FE #96: undelivered fixture has no invitation and logout clears the draft", async ({ page }) => {
  await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
  await page.getByRole("textbox").fill("Borrador privado del titular");
  await page.keyboard.press("Escape");
  await page.getByLabel("Escenario").selectOption("logout");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByLabel("Escenario").selectOption("pendiente");
  await expect(page.getByRole("button", { name: "Evaluar entrega", exact: true })).toHaveCount(0);
  await page.getByLabel("Escenario").selectOption("exito");
  await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("");
});
test("FE #96: sentiment change clears incompatible reasons and preserves comment", async ({ page }) => {
  await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
  await page.getByRole("radio", { name: "Bien", exact: true }).check();
  await page.getByRole("checkbox", { name: "Llegó a tiempo" }).check();
  await page.getByRole("textbox").fill("Texto conservado");
  await page.getByRole("radio", { name: "Mal", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Llegó a tiempo" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Entrega tardía" })).not.toBeChecked();
  await expect(page.getByRole("textbox")).toHaveValue("Texto conservado");
});
test("FE #96: Escape closes locally without confirmation or durable dismissal", async ({ page }) => {
  let mutations = 0;
  page.on("request", request => { if (request.method() === "POST") mutations++; });
  await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
  await page.getByRole("textbox").fill("No enviar al cerrar");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Gracias por compartir tu experiencia" })).toHaveCount(0);
  await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("No enviar al cerrar");
  expect(mutations).toBe(0);
});
for (const scenario of ["duplicado", "error", "no-elegible"] as const) {
  test(`FE #96: explicit ${scenario} result`, async ({ page }) => {
    await page.getByLabel("Escenario").selectOption(scenario);
    await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
    await page.getByRole("radio", { name: "Regular", exact: true }).check();
    const text = '<img src=x onerror="window.__csatXss=true">';
    await page.getByRole("textbox").fill(text);
    await page.getByRole("button", { name: "Enviar evaluación", exact: true }).click();
    if (scenario === "duplicado") await expect(page.getByRole("heading", { name: "Gracias por compartir tu experiencia" })).toBeVisible();
    else if (scenario === "error") {
      await expect(page.getByRole("dialog").getByRole("alert")).toContainText("No pudimos confirmar");
      await expect(page.getByRole("textbox")).toHaveValue(text);
    } else await expect(page.getByRole("status")).toContainText("ya no está habilitado");
    expect(await page.evaluate(() => Object.hasOwn(window, "__csatXss"))).toBe(false);
    expect(await page.evaluate(() => Object.keys(localStorage).some(key => /csat|rating|comment/i.test(key)))).toBe(false);
  });
}
test("FE #95/#96: modal remains usable at desktop and mobile widths", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Evaluar entrega", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
  }
});
