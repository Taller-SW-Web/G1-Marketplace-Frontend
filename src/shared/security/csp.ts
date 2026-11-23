// H5 DAST (hallazgo medio): Content-Security-Policy del frontend. Todo se sirve desde el
// mismo origen (fuentes de @fontsource empaquetadas, fetch solo al BFF `/api/*`); la única
// excepción son las imágenes del catálogo, que G6 sirve desde hosts exactos (sin comodines),
// igual que PRODUCTOS_MEDIA_HOSTS en el Backend.
export const DEFAULT_CATALOG_IMAGE_HOSTS = ["slzglmtiyrzygpkiuthf.supabase.co"];

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function catalogImageHosts(configured = process.env.CSP_IMG_HOSTS) {
  if (configured === undefined || configured.trim() === "") return DEFAULT_CATALOG_IMAGE_HOSTS;
  // Solo hostnames exactos: se descartan comodines, esquemas, puertos y rutas.
  return configured.split(",").map((host) => host.trim().toLowerCase()).filter((host) => HOSTNAME.test(host));
}

export function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function buildContentSecurityPolicy({ nonce, dev = false, imageHosts = catalogImageHosts() }: {
  nonce: string; dev?: boolean; imageHosts?: string[];
}) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' deja cargar los chunks que Next inserta desde scripts con nonce.
    // React solo necesita eval en desarrollo (pila de llamadas del overlay).
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    // En desarrollo Next inyecta <style> sin nonce (HMR); en producción el CSS va en archivos.
    "style-src": dev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`],
    // Atributos style="" que React renderiza en el servidor (esqueletos, carrito).
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...imageHosts.map((host) => `https://${host}`)],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "media-src": ["'none'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
  return Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}
