// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MARKETPLACE_API_BASE_PATH,
  marketplaceApiBasePath,
  marketplaceApiEndpoint,
  marketplaceApiUrl,
} from "../../src/shared/server/marketplace-url";
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

describe("published API base path (FE #140)", () => {
  it("defaults to /api/v1", () => {
    vi.stubEnv("MARKETPLACE_API_BASE_PATH", "");
    expect(marketplaceApiBasePath()).toBe(DEFAULT_MARKETPLACE_API_BASE_PATH);
    expect(marketplaceApiBasePath()).toBe("/api/v1");
  });

  it.each(["/v1", "/api/v1", "/marketplace/g1/v1", "/v1.0"])(
    "keeps the APIM published prefix %s",
    (prefix) => {
      vi.stubEnv("MARKETPLACE_API_BASE_PATH", prefix);
      expect(marketplaceApiBasePath()).toBe(prefix);
    },
  );

  it.each([
    "api/v1",
    "/api/v1/",
    "//api/v1",
    "/api/../v1",
    "/api/v1?target=other",
    "/api/v1#fragment",
    "/api/v1/../admin",
    "/api v1",
  ])("rejects an unsafe base path %s", (prefix) => {
    vi.stubEnv("MARKETPLACE_API_BASE_PATH", prefix);
    expect(() => marketplaceApiBasePath()).toThrow();
  });

  it("builds endpoints against a valid origin and keeps the prefix out of it", () => {
    vi.stubEnv("MARKETPLACE_API_URL", "https://apim.example.com");
    vi.stubEnv("MARKETPLACE_API_BASE_PATH", "/v1");
    expect(marketplaceApiEndpoint("/catalog/products").toString()).toBe(
      "https://apim.example.com/v1/catalog/products",
    );
    expect(marketplaceApiEndpoint("catalog/home").pathname).toBe(
      "/v1/catalog/home",
    );
  });

  it("does not allow the base path to change the validated origin or add credentials", () => {
    vi.stubEnv("MARKETPLACE_API_URL", "https://apim.example.com");
    vi.stubEnv("MARKETPLACE_API_BASE_PATH", "/v1");
    const url = marketplaceApiEndpoint("/catalog/products");
    expect(url.origin).toBe("https://apim.example.com");
    expect(url.username).toBe("");
    expect(url.password).toBe("");
  });
});
