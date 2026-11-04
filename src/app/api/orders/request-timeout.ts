/** Keep the BFF alive slightly longer than the bounded G5 request timeout. */
export function ordersBackendTimeout(): AbortSignal {
  const timeoutMs = Number(process.env.G1_ORDERS_BFF_TIMEOUT_MS ?? 185000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 181000 || timeoutMs > 190000) {
    throw new Error("G1_ORDERS_BFF_TIMEOUT_MS must be between 181000 and 190000");
  }
  return AbortSignal.timeout(timeoutMs);
}
