import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { buildContentSecurityPolicy, catalogImageHosts } from "../../src/shared/security/csp";
import { proxy } from "../../src/proxy";

function directives(csp: string) {
  return new Map(csp.split(";").map((part) => part.trim().split(/\s+/)).map(([name, ...values]) => [name, values]));
}

describe("Content-Security-Policy del frontend (H5 DAST)", () => {
  it("es restrictiva en producción: sin unsafe-eval, sin comodines y con nonce en script-src", () => {
    const csp = buildContentSecurityPolicy({ nonce: "bm9uY2U=", imageHosts: ["slzglmtiyrzygpkiuthf.supabase.co"] });
    const map = directives(csp);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/(^|\s)\*|\*\.|https?:(\s|;|$)|\shttps?:\/\/\*/);
    expect(map.get("default-src")).toEqual(["'self'"]);
    expect(map.get("script-src")).toEqual(["'self'", "'nonce-bm9uY2U='", "'strict-dynamic'"]);
    expect(map.get("script-src")).not.toContain("'unsafe-inline'");
    expect(map.get("style-src")).toEqual(["'self'", "'nonce-bm9uY2U='"]);
    expect(map.get("img-src")).toEqual(["'self'", "data:", "blob:", "https://slzglmtiyrzygpkiuthf.supabase.co"]);
    expect(map.get("connect-src")).toEqual(["'self'"]);
    expect(map.get("font-src")).toEqual(["'self'"]);
    expect(map.get("frame-ancestors")).toEqual(["'none'"]);
    expect(map.get("object-src")).toEqual(["'none'"]);
    expect(map.get("base-uri")).toEqual(["'self'"]);
    expect(map.get("form-action")).toEqual(["'self'"]);
  });

  it("solo acepta hostnames exactos para imágenes del catálogo", () => {
    expect(catalogImageHosts("*.supabase.co, https://evil.test, cdn.test:8443, IMG.Example.COM,  ")).toEqual(["img.example.com"]);
    expect(catalogImageHosts("")).toEqual(["slzglmtiyrzygpkiuthf.supabase.co"]);
  });

  it("el proxy envía la cabecera con un nonce nuevo por petición y se lo pasa a Next", () => {
    const first = proxy(new NextRequest("http://127.0.0.1:3000/login"));
    const second = proxy(new NextRequest("http://127.0.0.1:3000/login"));
    const csp = first.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic'/);
    expect(csp).not.toContain("unsafe-eval");
    expect(second.headers.get("content-security-policy")).not.toBe(csp);
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
    expect(first.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
  });

  it("mantiene la limpieza de tokens legados en recuperación, también con CSP", () => {
    const response = proxy(new NextRequest("http://127.0.0.1:3000/restablecer-contrasena?token=opaque-fixture"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect([location.pathname, location.search]).toEqual(["/restablecer-contrasena", ""]);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });
});
