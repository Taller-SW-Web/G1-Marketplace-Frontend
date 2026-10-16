// Server configuration only. Container hostnames are never supplied by a browser request.
export function marketplaceApiUrl(): URL {
  const url = new URL(process.env.MARKETPLACE_API_URL || "http://127.0.0.1:10000");
  const internalHost = process.env.MARKETPLACE_INTERNAL_HTTP_HOST;
  const loopback = ["127.0.0.1", "localhost"].includes(url.hostname);
  const approvedInternal = Boolean(internalHost && url.hostname === internalHost);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && (loopback || approvedInternal)))) {
    throw new Error("Invalid Marketplace BFF origin");
  }
  return url;
}
