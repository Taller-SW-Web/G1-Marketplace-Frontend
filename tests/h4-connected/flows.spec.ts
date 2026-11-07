import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
const ownerA = '11111111-1111-4111-8111-111111111111';
async function state(request: APIRequestContext) {
  const response = await request.get(`${process.env.H4_FIXTURE_URL}/__test/state`, {
    headers: { Authorization: `Bearer ${process.env.H4_CONTROL_SECRET}` },
  });
  expect(response.ok()).toBe(true); return response.json();
}
async function login(page: Page, identity = 'A') {
  await page.goto('/demo/h3/favoritos');
  await page.getByLabel('Identidad ficticia').selectOption(identity);
  await expect(page.getByText(`Cliente de prueba ${identity} activo.`, { exact: true })).toBeVisible();
}
test('favorites persist, add to cart without removal, and stay private between owners', async ({ page, request }) => {
  await login(page);
  await page.getByRole('region', { name: 'Producto de demostración' }).getByRole('button', { name: 'Guardar en favoritos' }).click();
  await page.goto('/favoritos');
  const card = page.locator('[data-favorite-id="PRD-1"]');
  await expect(card).toBeVisible();
  await page.reload(); await expect(card).toBeVisible();
  const added = page.waitForResponse(r => r.url().endsWith('/PRD-1/add-to-cart'));
  await card.getByRole('button', { name: /Agregar al carrito/ }).click();
  expect((await added).status()).toBe(200);
  const persisted = await state(request);
  expect(persisted.favorites).toEqual([expect.objectContaining({ customerId: ownerA, productId: 'PRD-1' })]);
  expect(persisted.carts[0].items[0]).toMatchObject({ sku: 'SKU-SIMPLE', quantity: 1 });
  await page.reload(); await expect(card).toBeVisible();
  await login(page, 'B');
  const empty = page.waitForResponse(r => r.url().endsWith('/api/wishlist') && r.request().method() === 'GET');
  await page.goto('/favoritos');
  expect(await (await empty).json()).toEqual([]);
  await expect(card).toHaveCount(0);
  expect((await state(request)).favorites).toHaveLength(1);
  await login(page); await page.goto('/favoritos'); await expect(card).toBeVisible();
  const removed = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().endsWith('/PRD-1'));
  await card.getByRole('button', { name: /Eliminar de favoritos/ }).click();
  expect((await removed).status()).toBe(204);
  expect((await state(request)).favorites).toHaveLength(0);
});
for (const scenario of [
  { suffix: '00001', status: 201, outcome: 'submitted', sentiment: 'Bien', score: 5 },
  { suffix: '00002', status: 409, outcome: 'duplicate', sentiment: 'Regular', score: 3 },
  { suffix: '00003', status: 503, outcome: 'error', sentiment: 'Mal', score: 1 },
  { suffix: '00004', status: 422, outcome: 'ineligible', sentiment: 'Bien' },
  { suffix: '00005', status: 403, outcome: 'ineligible', sentiment: 'Bien' },
  { suffix: '00006', status: 409, outcome: 'ineligible', sentiment: 'Bien' },
]) test(`CSAT ${scenario.outcome} ${scenario.suffix}`, async ({ page, request }) => {
  const order = `PED-2026-${scenario.suffix}`;
  await login(page); await page.goto(`/demo/h4/evaluacion/${order}`);
  await page.getByRole('button', { name: 'Evaluar entrega', exact: true }).click();
  await page.getByRole('radio', { name: scenario.sentiment, exact: true }).check();
  await page.getByRole('textbox').fill('Comentario conectado');
  const response = page.waitForResponse(r => r.url().endsWith(`/csat/${order}`));
  await page.getByRole('button', { name: 'Enviar evaluación', exact: true }).click();
  expect((await response).status()).toBe(scenario.status);
  if (['submitted', 'duplicate'].includes(scenario.outcome)) await expect(page.getByRole('heading', { name: 'Gracias por compartir tu experiencia' })).toBeVisible();
  else {
    await expect(page.getByRole('heading', { name: 'Gracias por compartir tu experiencia' })).toHaveCount(0);
    if (scenario.outcome === 'error') {
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No pudimos confirmar');
      await expect(page.getByRole('textbox')).toHaveValue('Comentario conectado');
    } else await expect(page.getByRole('status')).toContainText('ya no está habilitado');
  }
  const persisted = await state(request);
  const prompt = persisted.prompts.find((p: { externalOrderId: string }) => p.externalOrderId === order);
  if (prompt) expect(prompt.state).toBe(['submitted', 'duplicate'].includes(scenario.outcome) ? 'SUBMITTED' : 'SHOWN');
  const sent = persisted.submissions.filter((p: { pedidoId: string }) => p.pedidoId === order);
  expect(sent).toHaveLength(scenario.score ? 1 : 0);
  if (scenario.score) expect(sent[0]).toMatchObject({ puntuacion: scenario.score, clienteId: ownerA });
});
