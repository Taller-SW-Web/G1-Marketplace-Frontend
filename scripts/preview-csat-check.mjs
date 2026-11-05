import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:3200/demo/h3/evaluacion');
  await page.getByRole('button', { name: 'Evaluar entrega', exact: true }).click();
  await page.getByRole('radio', { name: 'Bien', exact: true }).check();
  if (!await page.getByRole('dialog').isVisible()) throw new Error('Missing modal');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
  await page.screenshot({ path: 'test-results/csat-mobile.png' });
  await page.getByRole('button', { name: 'Enviar evaluación', exact: true }).click();
  await page.getByRole('heading', { name: 'Gracias por compartir tu experiencia' }).waitFor();
  console.log('PASS: mobile modal and confirmed submission');
} finally { await browser.close(); }
