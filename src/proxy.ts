import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.search) return NextResponse.next();
  const clean = request.nextUrl.clone();
  clean.search = "";
  clean.hash = "";
  const response = NextResponse.redirect(clean, 307);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = { matcher: ["/recuperar-contrasena", "/restablecer-contrasena"] };
