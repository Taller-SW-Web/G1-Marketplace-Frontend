// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { marketplaceApiUrl } from "../../src/shared/server/marketplace-url";
afterEach(() => vi.unstubAllEnvs());

it("allows only the explicitly configured Docker hostname for internal HTTP", () => {
  vi.stubEnv("MARKETPLACE_API_URL", "http://backend:10000");
  vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "");
  expect(() => marketplaceApiUrl()).toThrow();
  vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "backend");
  expect(marketplaceApiUrl().origin).toBe("http://backend:10000");
  vi.stubEnv("MARKETPLACE_API_URL", "http://other-backend:10000");
  expect(() => marketplaceApiUrl()).toThrow();
});

it.each(["https://marketplace.example", "http://127.0.0.1:10000", "http://localhost:10000"])("keeps the existing trusted origin %s", (origin) => {
  vi.stubEnv("MARKETPLACE_API_URL", origin);
  vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "");
  expect(marketplaceApiUrl().origin).toBe(origin);
});

it.each(["http://public.example", "https://user:password@marketplace.example", "https://marketplace.example?target=other", "https://marketplace.example#other", "https://marketplace.example/api", "ftp://marketplace.example"])("rejects an invalid or unapproved BFF URL %s", (origin) => {
  vi.stubEnv("MARKETPLACE_API_URL", origin);
  vi.stubEnv("MARKETPLACE_INTERNAL_HTTP_HOST", "backend");
  expect(() => marketplaceApiUrl()).toThrow();
});
