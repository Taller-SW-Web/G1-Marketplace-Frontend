import { expect, test, type Page } from "@playwright/test";

// H5 · E2E de navegador V-010 Dirección de envío. **MOCK**: /api/checkout/* y /api/cart/current
// se responden con page.route según SPECS/contrato-api/F-022. La titularidad la resuelve el
// BFF con el token del titular (pendiente REAL, BE #114/#115); aquí se prueba que la UI no envía
// identidad editable y que sólo muestra lo que el BFF devolvió para la sesión.
// Con E2E_EVIDENCE=1 guarda capturas en docs/evidencias/H5/V-010-direccion-envio/e2e.

// Forma exacta del BFF de BE #331 / SPECS #19: G7 no tiene teléfono; label y reference son opcionales.
type Address = { addressId: string; label?: string; street: string; district: string; province: string; department: string; reference?: string };
const titular: Address[] = [
  { addressId: "ADR-A-1", label: "Casa", street: "Av. Lima 123", district: "Miraflores", province: "Lima", department: "Lima", reference: "Dpto. 402" },
  { addressId: "ADR-A-2", label: "Trabajo", street: "Jr. Comercio 450", district: "San Isidro", province: "Lima", department: "Lima" },
  { addressId: "ADR-A-4", street: "Av. Brasil 900", district: "Pueblo Libre", province: "Lima", department: "Lima" },
];
// El 201 del BFF devuelve la dirección sin el teléfono que recibió en el alta.
const bffCreated = (body: Record<string, unknown>, addressId: string) => {
  const { phone: _phone, ...rest } = body;
  void _phone;
  return { ...rest, addressId };
};
const cart = { cartId: "cart-a", version: 4, items: [{ sku: "SKU-MOCK-001", quantity: 2 }] };

async function mockCheckout(page: Page, { list = titular, create }: { list?: Address[]; create?: (body: Record<string, unknown>) => { status: number; json: unknown } } = {}) {
  const state = { listRequests: [] as string[], created: [] as Record<string, unknown>[], quotes: [] as Record<string, unknown>[] };
  await page.route("**/api/v1/auth/**", route => route.fulfill({ json: { authenticated: false, scope: "anonymous" } }));
  await page.route("**/api/cart/current", route => route.fulfill({ json: { data: cart } }));
  await page.route("**/api/checkout/delivery-addresses", async route => {
    if (route.request().method() === "GET") {
      state.listRequests.push(route.request().url());
      return route.fulfill({ json: { data: list } });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    state.created.push(body);
    const response = create?.(body) ?? { status: 201, json: { data: bffCreated(body, "ADR-A-3") } };
    return route.fulfill(response);
  });
  await page.route("**/api/checkout/quotes", async route => {
    const body = route.request().postDataJSON() as { addressId: string; cartVersion: number };
    state.quotes.push(body);
    await route.fulfill({ json: { data: {
      quoteId: `Q-${body.addressId}`, expiresAt: new Date(Date.now() + 300_000).toISOString(),
      subtotal: { amount: 340 }, discount: { amount: 0 }, shipping: { amount: 15, estimatedDays: 2 }, total: { amount: 355 },
      addressId: body.addressId, cartVersion: body.cartVersion, lines: cart.items,
    } } });
  });
  return state;
}

async function evidence(page: Page, name: string) {
  if (!process.env.E2E_EVIDENCE) return;
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.screenshot({ path: `docs/evidencias/H5/V-010-direccion-envio/e2e/${test.info().project.name}-${name}.png`, fullPage: true, animations: "disabled", caret: "initial" });
}

const continueButton = (page: Page) => page.getByRole("button", { name: "Continuar al resumen" });

test("muestra sólo las direcciones que el BFF devolvió para la sesión, sin enviar identidad", async ({ page }) => {
  const state = await mockCheckout(page);
  await page.goto("/checkout/direccion?customerId=OTRO-CLIENTE");
  await expect(page.getByRole("radio")).toHaveCount(3);
  await expect(page.getByRole("radio", { name: /Casa/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Av\. Brasil 900/ })).toBeVisible();
  // Sin teléfono en la respuesta: no hay bloque visual ni accesible de teléfono.
  await expect(page.getByText(/Tel\.|Teléfono terminado/)).toHaveCount(0);
  for (const url of state.listRequests) expect(new URL(url).search).toBe("");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))).not.toMatch(/ADR-|Av\. Lima/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await evidence(page, "01-con-direcciones");
});

test("selecciona una dirección existente y cotiza con ella", async ({ page }) => {
  const state = await mockCheckout(page);
  await page.goto("/checkout/direccion");
  await page.getByRole("radio", { name: /Trabajo/ }).check();
  await continueButton(page).click();
  await expect(page.getByRole("heading", { name: "Resumen de envío" })).toBeVisible();
  await expect(page.getByText("Trabajo: Jr. Comercio 450, San Isidro")).toBeVisible();
  expect(state.quotes).toEqual([{ addressId: "ADR-A-2", cartVersion: 4 }]);
  await evidence(page, "02-seleccion-existente");
});

test("errores de validación en línea, 400 del servidor y creación seleccionada", async ({ page }) => {
  let reject = true;
  const state = await mockCheckout(page, { create: body => reject
    ? { status: 400, json: { error: { code: "ADDRESS_VALIDATION_ERROR", fields: ["street"] } } }
    : { status: 201, json: { data: bffCreated(body, "ADR-A-3") } } });
  await page.goto("/checkout/direccion");
  await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
  await expect(page.getByRole("heading", { name: "Nueva dirección" })).toBeFocused();
  const save = page.getByRole("button", { name: "Guardar y usar esta dirección" });
  await page.getByLabel("Etiqueta").fill("Oficina");
  await page.getByLabel("Teléfono").fill("98-ab");
  await page.getByLabel("Teléfono").blur();
  await expect(page.getByText(/Usa solo números/)).toBeVisible();
  await save.click();
  await expect(page.getByLabel("Dirección", { exact: true })).toBeFocused();
  await expect(page.getByText("Ingresa la dirección.")).toBeVisible();
  await expect(page.getByLabel("Etiqueta")).toHaveValue("Oficina");
  expect(state.created).toHaveLength(0);
  await evidence(page, "03-validacion-en-linea");

  await page.getByLabel("Dirección", { exact: true }).fill("Av. Arequipa 1000");
  await page.getByLabel("Departamento").fill("Lima");
  await page.getByLabel("Provincia").fill("Lima");
  await page.getByLabel("Distrito").fill("Lince");
  await page.getByLabel("Teléfono").fill("987 654 321");
  await expect(page.getByText(/Usa solo números/)).toHaveCount(0);
  await save.click();
  await expect(page.getByText("Revisa este campo.")).toBeVisible();
  await expect(page.getByLabel("Dirección", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Distrito")).toHaveValue("Lince");
  await evidence(page, "04-error-400");

  reject = false;
  await page.getByLabel("Dirección", { exact: true }).fill("Av. Arequipa 1001");
  await save.click();
  await expect(page.getByText("La dirección «Oficina» se guardó y quedó seleccionada.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Oficina/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Oficina/ }).locator("xpath=ancestor::label")).not.toContainText("Tel.");
  expect(state.created).toHaveLength(2);
  for (const body of state.created) {
    expect(Object.keys(body).sort()).toEqual(["department", "district", "label", "phone", "province", "street"]);
    expect(body).not.toHaveProperty("customerId");
  }
  expect(state.created[1].phone).toBe("987654321");
  await evidence(page, "05-creada-seleccionada");
  await continueButton(page).click();
  await expect(page.getByText("Oficina: Av. Arequipa 1001, Lince")).toBeVisible();
  expect(state.quotes.at(-1)).toEqual({ addressId: "ADR-A-3", cartVersion: 4 });
});

test("sin direcciones abre el formulario; 401 no muestra direcciones de nadie", async ({ page }) => {
  await mockCheckout(page, { list: [] });
  await page.goto("/checkout/direccion");
  await expect(page.getByText("Aún no tienes direcciones guardadas. Registra una para continuar con tu compra.")).toBeVisible();
  await evidence(page, "06-sin-direcciones");
  await page.unroute("**/api/checkout/delivery-addresses");
  await page.route("**/api/checkout/delivery-addresses", route => route.fulfill({ status: 401, json: { error: { code: "UNAUTHENTICATED" } } }));
  await page.reload();
  await expect(page.getByRole("link", { name: "Iniciar sesión" }).last()).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByLabel("Dirección", { exact: true })).toHaveCount(0);
  await evidence(page, "07-sesion-vencida");
});
