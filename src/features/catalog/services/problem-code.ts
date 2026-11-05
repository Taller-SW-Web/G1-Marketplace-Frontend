/** Lectura del `code` público de una respuesta Problem Details. */
export async function readProblemCode(
  response: Response,
): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return undefined;
    const code = (body as { code?: unknown }).code;
    return typeof code === "string" && code.length > 0 ? code : undefined;
  } catch {
    return undefined;
  }
}
