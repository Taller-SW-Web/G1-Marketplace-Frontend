import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (path.length !== 1 || !["home", "products"].includes(path[0]))
    return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  try {
    const base = new URL(
      process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000",
    );
    if (
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      (base.protocol !== "https:" &&
        !(
          base.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(base.hostname)
        ))
    )
      throw new Error("Invalid BFF origin");
    const url = new URL(`/api/v1/catalog/${path[0]}`, base);
    url.search = request.nextUrl.search;
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    });
    const body = await response.text();
    JSON.parse(body);
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.ok
          ? "application/json"
          : "application/problem+json",
        "Cache-Control": "no-store",
        "X-Catalog-Source":
          response.headers.get("x-catalog-source") || "UNCONFIGURED",
      },
    });
  } catch {
    return Response.json(
      {
        code: "CATALOG_UNAVAILABLE",
        status: 503,
        title: "No pudimos cargar el catálogo.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
