#!/usr/bin/env node
/**
 * Lighthouse H5 · FE #155
 *
 * Corre Lighthouse móvil (con accesibilidad) sobre inicio, catálogo y ficha
 * V-007, y guarda reportes JSON/HTML + capturas de referencia en
 * `docs/evidencias/H5/FE-155/lighthouse/`.
 *
 * Servidor de producción requerido (medir `next dev` no es válido):
 *
 *   npm run build
 *   npm run start -- --port 3106 --hostname 127.0.0.1
 *   MARKETPLACE_API_URL=http://127.0.0.1:10100 npm run lighthouse:h5
 *
 * También acepta una URL pública (con SHA a confirmar por Operaciones):
 *
 *   LH_BASE_URL=https://g1-marketplace-frontend.vercel.app npm run lighthouse:h5
 */

import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE_URL = process.env.LH_BASE_URL || "http://127.0.0.1:3106";
const OUTPUT_DIR =
  process.env.LH_OUTPUT_DIR || "./docs/evidencias/H5/FE-155/lighthouse";
const THRESHOLDS = { performance: 90, accessibility: 90, "best-practices": 90, seo: 90 };
const ROUTES = [
  { name: "inicio", path: "/", description: "Página de inicio (V-005)" },
  { name: "catalogo", path: "/catalogo", description: "Catálogo de productos (V-006)" },
  { name: "ficha", path: "/productos/producto-demostracion-4", description: "Ficha de producto (V-007)" },
];
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3 };

const LIGHTHOUSE_CLI = resolve("node_modules/lighthouse/cli/index.js");

function commitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "desconocido";
  }
}

async function runLighthouse(url, outputName) {
  if (!process.env.CHROME_PATH) {
    const { chromium } = await import("@playwright/test");
    process.env.CHROME_PATH = chromium.executablePath();
  }
  const args = [
    LIGHTHOUSE_CLI,
    url,
    "--output=json",
    "--output=html",
    `--output-path=${join(OUTPUT_DIR, outputName)}`,
    "--form-factor=mobile",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
    "--quiet",
    `--screenEmulation.width=${MOBILE.width}`,
    `--screenEmulation.height=${MOBILE.height}`,
    `--screenEmulation.deviceScaleFactor=${MOBILE.deviceScaleFactor}`,
    "--screenEmulation.mobile=true",
  ];

  return new Promise((resolvePromise, reject) => {
    const proc = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stdout.on("data", () => {});
    proc.stderr.on("data", (data) => (stderr += data.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Lighthouse terminó con código ${code}: ${stderr.slice(-800)}`));
    });
  });
}

async function takeScreenshot(url, outputPath) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: MOBILE.width, height: MOBILE.height },
      deviceScaleFactor: MOBILE.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    await page.screenshot({ path: outputPath, fullPage: true, animations: "disabled" });
  } finally {
    await browser.close();
  }
}

function parseScores(jsonPath) {
  const report = JSON.parse(readFileSync(jsonPath, "utf8"));
  const score = (category) =>
    report.categories?.[category]?.score == null
      ? null
      : Math.round(report.categories[category].score * 100);
  return {
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      "best-practices": score("best-practices"),
      seo: score("seo"),
    },
    finalUrl: report.finalUrl,
    fetchTime: report.fetchTime,
    lighthouseVersion: report.lighthouseVersion,
    accessibilityAudits: Object.values(report.audits)
      .filter((audit) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "notApplicable")
      .filter((audit) => report.categories.accessibility.auditRefs.some((ref) => ref.id === audit.id))
      .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score })),
  };
}

function evaluateThresholds(scores) {
  const failures = Object.entries(THRESHOLDS)
    .filter(([key, minimum]) => scores[key] !== null && scores[key] < minimum)
    .map(([key, minimum]) => `${key}: ${scores[key]} < ${minimum}`);
  return { pass: failures.length === 0, failures };
}

function summary(results, sha) {
  const lines = [
    "# Lighthouse H5 · FE #155",
    "",
    `- **Fecha:** ${new Date().toISOString()}`,
    `- **Commit:** \`${sha}\``,
    `- **Base URL:** ${BASE_URL}`,
    `- **Umbrales:** rendimiento ≥${THRESHOLDS.performance}, accesibilidad ≥${THRESHOLDS.accessibility}, buenas prácticas ≥${THRESHOLDS["best-practices"]}, SEO ≥${THRESHOLDS.seo}`,
    "- **Emulación:** móvil 390×844, DPR 3, throttling móvil de Lighthouse",
    "- **Ejecución:** `npm run build && npm run start -- --port 3106` + `npm run lighthouse:h5`",
    "",
    "| Ruta | Rendimiento | Accesibilidad | Buenas prácticas | SEO | Estado |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const result of results) {
    const scores = result.scores ?? {};
    lines.push(
      `| ${result.route} (\`${result.path}\`) | ${scores.performance ?? "—"} | ${scores.accessibility ?? "—"} | ${scores["best-practices"] ?? "—"} | ${scores.seo ?? "—"} | ${
        result.thresholds.pass ? "✅ cumple" : "❌ revisar"
      } |`,
    );
  }
  lines.push("");
  const failing = results.filter((result) => !result.thresholds.pass);
  if (failing.length) {
    lines.push("## Rutas por debajo del umbral", "");
    for (const result of failing) {
      lines.push(`### ${result.route} (\`${result.path}\`)`, "");
      for (const failure of result.thresholds.failures) lines.push(`- ${failure}`);
      const audits = result.accessibilityAudits ?? [];
      if (audits.length) {
        lines.push("", "Auditorías de accesibilidad con puntuación < 1:", "");
        for (const audit of audits) lines.push(`- \`${audit.id}\`: ${audit.title} (${audit.score})`);
      }
      lines.push("");
    }
  }
  lines.push(
    "## Artefactos",
    "",
    "- `lh-<ruta>.report.json` y `lh-<ruta>.report.html`: reporte completo.",
    "- `capturas/<ruta>-movil.png`: captura de referencia del mismo corte.",
    "- El run no acredita por sí solo el SHA desplegado en un entorno público; esa confirmación corresponde a Operaciones.",
    "",
  );
  return lines.join("\n");
}

async function main() {
  console.log(`Lighthouse H5 · base ${BASE_URL}`);
  mkdirSync(join(OUTPUT_DIR, "capturas"), { recursive: true });
  const sha = commitSha();
  const results = [];

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    const outputName = `lh-${route.name}`;
    const jsonPath = join(OUTPUT_DIR, `${outputName}.report.json`);
    console.log(`\n▶ ${route.name}: ${url}`);
    try {
      await takeScreenshot(url, join(OUTPUT_DIR, "capturas", `${route.name}-movil.png`));
      await runLighthouse(url, outputName);
      const report = parseScores(jsonPath);
      const thresholds = evaluateThresholds(report.scores);
      results.push({ route: route.name, path: route.path, ...report, thresholds });
      console.log(
        `  P=${report.scores.performance} A=${report.scores.accessibility} BP=${report.scores["best-practices"]} SEO=${report.scores.seo}`,
      );
    } catch (error) {
      results.push({
        route: route.name,
        path: route.path,
        thresholds: { pass: false, failures: [error.message] },
      });
      console.error(`  ✖ ${error.message}`);
    }
  }

  writeFileSync(join(OUTPUT_DIR, "SUMMARY.md"), summary(results, sha));
  writeFileSync(
    join(OUTPUT_DIR, "scores.json"),
    JSON.stringify(
      { sha, baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results },
      null,
      2,
    ),
  );
  console.log(`\nResumen: ${join(OUTPUT_DIR, "SUMMARY.md")}`);
  process.exit(results.every((result) => result.thresholds.pass) ? 0 : 1);
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
