import { expect, test } from "@playwright/test";
test("production denies sandbox despite enabled flag and hides its UI", async ({ page, request }) => {
  expect((await request.get("/demo/h3/favoritos")).status()).toBe(404);
  expect((await request.get("/demo/h3/favoritos/lista")).status()).toBe(404);
  expect((await request.get("/demo/h3/favoritos/lista/vacia")).status()).toBe(404);
  expect((await request.get("/api/wishlist")).status()).toBe(404);
  expect((await request.get("/api/h3/session")).status()).toBe(404);
  expect((await request.post("/api/h3/session", { data: { identity: "A" } })).status()).toBe(404);
  expect((await request.post("/api/wishlist/items", { data: { productId: "PRD-1" } })).status()).toBe(404);
  expect((await request.delete("/api/wishlist/items/PRD-1")).status()).toBe(404);
  await page.goto("/"); await expect(page.getByLabel("Identidad ficticia")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guardar en favoritos" })).toHaveCount(0);
});
