import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Accesibilidad automatizada H5 (FE #155).
 *
 * Lighthouse mide accesibilidad por separado (scripts/lighthouse-h5.mjs); aquí
 * se ejecuta axe con las reglas WCAG 2.0/2.1 A y AA sobre las tres rutas del
 * corte: inicio, catálogo y ficha. Se bloquean las violaciones `serious` y
 * `critical`; el reporte completo queda en docs/evidencias/H5/FE-155/.
 */

const EVIDENCE_DIR = join("docs", "evidencias", "H5", "FE-155");

const ROUTES = [
  { name: "inicio", path: "/" },
  { name: "catalogo", path: "/catalogo" },
  { name: "ficha", path: "/productos/producto-demostracion-4" },
] as const;

test.beforeAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
});

for (const route of ROUTES) {
  test(`sin violaciones graves de accesibilidad en ${route.name}`, async ({
    page,
  }, testInfo) => {
    await page.goto(route.path);
    // La ficha carga relacionados en una región aparte: esperar su heading
    // evita auditar el esqueleto de carga.
    if (route.name === "ficha") {
      await expect(
        page.getByRole("heading", { name: "Productos relacionados" }),
      ).toBeVisible({ timeout: 15_000 });
    }
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    writeFileSync(
      join(EVIDENCE_DIR, `axe-${route.name}-${testInfo.project.name}.json`),
      JSON.stringify(
        {
          route: route.name,
          url: page.url(),
          project: testInfo.project.name,
          generatedAt: new Date().toISOString(),
          violations: results.violations,
          passes: results.passes.length,
          incomplete: results.incomplete.length,
        },
        null,
        2,
      ),
    );

    const severe = results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => node.target.join(" ")),
      }));

    expect(severe).toEqual([]);
    expect(results.violations.filter((v) => v.impact === "moderate")).toEqual([]);
  });
}
