export const G6_GATEWAY_ORIGIN = 'https://api-gateway.calmgrass-aec0b33c.chilecentral.azurecontainerapps.io';

export function g6Origin(value = G6_GATEWAY_ORIGIN) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
      url.search || url.hash || url.origin !== value) throw new Error();
    return url.origin;
  } catch { throw new Error('REAL_DEMO_INVALID_ORIGIN'); }
}
