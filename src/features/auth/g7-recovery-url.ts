export function g7RecoveryUrl(raw: string | undefined, environment: string | undefined): string | null {
  if (!raw || raw.trim() !== raw) return null;
  try {
    const url = new URL(raw);
    const localHttp = environment !== "production" && url.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol !== "https:" && !localHttp) || url.username || url.password
      || url.search || url.hash || url.pathname !== "/recuperar-contrasena") return null;
    // G7 reads this fixed channel on the recovery entry page and carries it
    // into the emailed link. Never accept a channel from the browser URL.
    url.searchParams.set("canal", "MARKETPLACE");
    return url.href;
  } catch {
    return null;
  }
}
