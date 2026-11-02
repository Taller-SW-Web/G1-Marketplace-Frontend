import { test, expect } from "@playwright/test";

// Browser/UI integration with intercepted auth responses, not a real BFF or security provider.
test("checkout cancel keeps the session and restores focus on desktop and mobile", async ({ page }) => {
  let logoutCalls = 0;
  await page.route("**/api/v1/auth/**", async route => {
    if (route.request().url().endsWith("/logout")) logoutCalls++;
    await route.fulfill({ json: { authenticated: true, scope: "fixture-a", user: { id: "11111111-1111-4111-8111-111111111111", nombreCompleto: "Cuenta fixture", roles: ["CLIENTE"] } } });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/checkout");
    const trigger = page.getByRole("button", { name: "Cerrar sesión", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "¿Cerrar sesión?" });
    await expect(dialog.getByRole("button", { name: "Continuar checkout" })).toBeFocused();
    if (width === 1440) await dialog.getByRole("button", { name: "Continuar checkout" }).click();
    else await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByText("Cuenta fixture")).toBeVisible();
    expect(logoutCalls).toBe(0);
  }
});

test("pending and failed logout allow retry; local closure reports remote revocation pending", async ({ page }) => {
  let authenticated = true;
  let calls = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/auth/**", async route => {
    if (route.request().url().endsWith("/logout")) {
      calls++;
      if (calls === 1) { await pending; await route.fulfill({ status: 503, json: { code: "AUTH_UNAVAILABLE" } }); return; }
      authenticated = false;
      await route.fulfill({ json: { authenticated: false, remoteRevocationPending: true } }); return;
    }
    await route.fulfill({ json: authenticated ? { authenticated: true, scope: "fixture-a", user: { id: "11111111-1111-4111-8111-111111111111", nombreCompleto: "Cuenta fixture", roles: ["CLIENTE"] } } : { authenticated: false, scope: "anonymous" } });
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "¿Cerrar sesión?" });
  await dialog.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Cerrando sesión…");
  await expect(dialog.getByRole("button", { name: "Continuar checkout" })).toBeDisabled();
  await page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
  release();
  await expect(dialog.getByRole("alert")).toContainText("No pudimos confirmar");
  await expect(dialog.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\?sesion=cierre-local$/);
  await expect(page.getByRole("status").filter({ hasText: "No pudimos confirmar la revocación remota" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  expect(calls).toBe(2);
});
