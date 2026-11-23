import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: { incomingRequests: { ignore: [/\/restablecer-contrasena(?:[/?]|$)/] } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // El BFF solo devuelve JSON; las páginas reciben su CSP con nonce desde src/proxy.ts.
        source: "/api/:path*",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" }],
      },
      {
        source: "/restablecer-contrasena",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, private" }],
      },
    ];
  },
};
export default nextConfig;
