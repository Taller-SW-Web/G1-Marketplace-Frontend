import { expect, test as base } from "@playwright/test";

// H5 DAST · CSP: cualquier violación de Content-Security-Policy hace fallar la prueba.
// Se escuchan el evento del navegador y los avisos de consola, en todas las navegaciones.
export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [async ({ page }, use) => {
    const violations: string[] = [];
    await page.exposeFunction("__reportCspViolation", (detail: string) => { violations.push(detail); });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        const report = (window as unknown as { __reportCspViolation: (detail: string) => void }).__reportCspViolation;
        void report(`${event.disposition} ${event.effectiveDirective} ${event.blockedURI || "inline"} @ ${location.pathname}`);
      });
    });
    page.on("console", (message) => {
      if (/Content[- ]Security[- ]Policy/i.test(message.text())) violations.push(`console: ${message.text()}`);
    });
    await use(violations);
    expect(violations, "violaciones de CSP").toEqual([]);
  }, { auto: true }],
});

export { expect };
