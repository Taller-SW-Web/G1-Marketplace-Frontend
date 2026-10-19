import { NextRequest } from "next/server";
import { marketplaceApiUrl } from "@/shared/server/marketplace-url";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joinedPath = path.join("/");

  // Endpoints válidos: "current", "current/items", o "items"
  if (!["current", "current/items", "items"].includes(joinedPath)) {
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  try {
    const api = configuredUrl(
      process.env.MARKETPLACE_API_URL,
      "http://127.0.0.1:10000",
    );
    const auth = configuredUrl(
      process.env.MOCK_AUTH_URL,
      "http://127.0.0.1:4010",
    );
    if (!localHttpAllowed(api) || !localHttpAllowed(auth)) {
      throw new Error("Cart mock proxy is local-development only");
    }

    const isBackendMock =
      process.env.CHECKOUT_MODE === "backend-mock" ||
      process.env.NEXT_PUBLIC_CHECKOUT_MODE === "backend-mock";

    let accessToken: string | undefined;
    try {
      const tokenResponse = await fetch(new URL("/token?user=default", auth), {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      if (tokenResponse.ok) {
        const tokenPayload: unknown = await tokenResponse.json();
        if (
          typeof tokenPayload === "object" &&
          tokenPayload !== null &&
          "access_token" in tokenPayload &&
          typeof tokenPayload.access_token === "string"
        ) {
          accessToken = tokenPayload.access_token;
        }
      }
    } catch {
      // Si el mock auth server no está disponible, continuar sin Bearer para sesión anónima
    }
    if (!accessToken && isBackendMock) {
      return Response.json(
        { error: { code: "CART_AUTH_UNAVAILABLE" } },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const api = marketplaceApiUrl();
    const backendEndpoint =
      joinedPath === "items" ? "current/items" : joinedPath;
    const url = new URL(`/api/v1/carts/${backendEndpoint}`, api);

    const headers = new Headers({
      Accept: "application/json",
    });

    // Preserve explicit authentication; anonymous requests use the BFF cart session.
    const authorization = request.headers.get("authorization");
    if (authorization) headers.set("Authorization", authorization);

    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("Cookie", cookie);

    let body: string | undefined;
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return Response.json(
          { error: { code: "UNSUPPORTED_CONTENT_TYPE" } },
          { status: 415 },
        );
      }
      body = await request.text();
      if (body.length > 16_384) {
        return Response.json(
          { error: { code: "PAYLOAD_TOO_LARGE" } },
          { status: 413 },
        );
      }
      try {
        JSON.parse(body);
      } catch {
        return Response.json(
          { error: { code: "BAD_REQUEST", message: "Invalid JSON payload" } },
          { status: 400 },
        );
      }
      headers.set("Content-Type", "application/json");
    }

    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    });

    const responseBody = await upstream.text();
    try {
      JSON.parse(responseBody);
    } catch {
      return Response.json(
        { error: { code: "INVALID_BACKEND_RESPONSE" } },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const responseHeaders = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      responseHeaders.set("Set-Cookie", setCookie);
    }

    return new Response(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { error: { code: "CART_BACKEND_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = forward;
export const POST = forward;
