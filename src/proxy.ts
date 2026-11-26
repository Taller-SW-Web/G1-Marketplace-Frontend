import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, createNonce } from "@/shared/security/csp";

const recoveryRoutes = new Set(["/recuperar-contrasena", "/restablecer-contrasena"]);

export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({ nonce, dev: process.env.NODE_ENV === "development" });

  if (recoveryRoutes.has(request.nextUrl.pathname) && request.nextUrl.search) {
    const clean = request.nextUrl.clone();
    clean.search = "";
    clean.hash = "";
    const response = NextResponse.redirect(clean, 307);
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  // Next lee la CSP de la petición para poner el nonce en sus <script> y <style>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Páginas HTML: se excluyen el BFF, los estáticos y los prefetch (no llevan nonce propio).
// Las rutas legadas de recuperación siempre pasan, para limpiar tokens también en prefetch.
export const config = {
  matcher: ["/recuperar-contrasena", "/restablecer-contrasena", {
    source: "/((?!api/|_next/static|_next/image|favicon.ico|figma/|fixtures/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)",
    missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }],
  }],
};
