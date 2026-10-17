const UNAVAILABLE = {
  code: "MOCK_NO_DISPONIBLE",
  message: "La demostración de acceso no está disponible en este entorno.",
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return json({ code: "INVALID_REQUEST" }, 415);
    }
    const raw = await request.text();
    if (raw.length > 2048) return json({ code: "INVALID_REQUEST" }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ code: "INVALID_REQUEST" }, 400);
  }
  if (
    typeof input !== "object" ||
    input === null ||
    !("correo" in input) ||
    typeof input.correo !== "string" ||
    !("contrasena" in input) ||
    typeof input.contrasena !== "string" ||
    input.correo.length > 254 ||
    input.contrasena.length > 256
  ) {
    return json({ code: "INVALID_REQUEST" }, 400);
  }

  try {
    const base = new URL(process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000");
    if (
      base.username || base.password || base.search || base.hash ||
      (base.protocol !== "https:" &&
        !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))
    ) throw new Error("Invalid BFF origin");

    const response = await fetch(new URL("/api/v1/auth/login", base), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ correo: input.correo, contrasena: input.contrasena }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) {
      return json({ code: "CREDENCIALES_INVALIDAS" }, 401);
    }
    if (!response.ok) return json(UNAVAILABLE, 503);
    const result: unknown = await response.json();
    if (
      typeof result !== "object" || result === null ||
      !("mode" in result) || result.mode !== "MOCK" ||
      !("authenticated" in result) || result.authenticated !== false
    ) throw new Error("Unexpected mock response");
    return json({ mode: "MOCK", authenticated: false }, 200);
  } catch {
    return json(UNAVAILABLE, 503);
  }
}
