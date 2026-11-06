import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MEDIA_HOST = 'slzglmtiyrzygpkiuthf.supabase.co';
export const WEB_ORIGIN = 'http://127.0.0.1:3540';
const SYSTEM_KEYS = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE',
  'APPDATA', 'LOCALAPPDATA', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'HOME', 'TMPDIR']);

// Explicit local child environments: never forward a shell's service token or cloud origin.
export function demoEnvironments(parent = process.env) {
  const system = Object.fromEntries(Object.entries(parent).filter(([key]) => SYSTEM_KEYS.has(key.toUpperCase())));
  return {
    backend: { ...system, NODE_ENV: 'test', PORT: '10640', CATALOG_SOURCE: 'real',
      CATALOG_INTEGRATION_APPROVED: 'true', PRODUCTOS_BASE_URL: 'https://g6-productos-ofertas.duckdns.org',
      PRODUCTOS_AUTH_MODE: 'demo-no-auth', PRODUCTOS_SERVICE_TOKEN: '',
      PRODUCTOS_CONTRACT_VERSION: '0.6.0-rc.1', PRODUCTOS_CONTRACT_SHA: 'f64bfe9a097b2a0f74c2600988305443d92f640e',
      PRODUCTOS_MEDIA_HOSTS: MEDIA_HOST, PRODUCTOS_TIMEOUT_MS: '15000',
      CATALOG_FEATURED_ENABLED: 'false', CATALOG_FEATURED_APPROVED: 'false',
      CATALOG_HOME_FALLBACK_ENABLED: 'false', CATALOG_FEATURED_IDS: '',
      BFF_MODE: 'real', USE_MOCKS: 'true', ORDERS_SOURCE: 'unconfigured',
      AUTH_ENABLED: 'false', G1_AUTH_ENABLED: 'false', G7_REGISTRATION_ENABLED: 'false',
      G7_RECOVERY_ENABLED: 'false', G7_INTROSPECTION_ENABLED: 'false',
      H3_SANDBOX_ENABLED: 'false', H3_AUTH_MOCK: 'false',
      DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/local_catalog_readonly',
      CORS_ORIGINS: WEB_ORIGIN, CORS_ALLOWED_ORIGINS: WEB_ORIGIN },
    frontend: { ...system, NODE_ENV: 'production', MARKETPLACE_API_URL: 'http://127.0.0.1:10640',
      CATALOG_BFF_TIMEOUT_MS: '18000', NEXT_TELEMETRY_DISABLED: '1',
      G1_AUTH_ENABLED: 'false', H3_FRONTEND_SANDBOX_ENABLED: 'false' },
  };
}

export function demoOptions(args) {
  if (args.some(arg => !['--check', '--skip-build'].includes(arg))) throw new Error('REAL_DEMO_INVALID_ARGUMENT');
  return { check: args.includes('--check'), skipBuild: args.includes('--skip-build') };
}

async function available(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error('REAL_DEMO_PORT_BUSY_' + port)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

async function main() {
  const options = demoOptions(process.argv.slice(2));
  const frontend = fileURLToPath(new URL('../', import.meta.url));
  const backend = fileURLToPath(new URL('../../G1-Marketplace-Backend/', import.meta.url));
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(backend + 'package.json')) throw new Error('REAL_DEMO_REQUIRES_SIBLING_BACKEND_AND_NPM');
  const env = demoEnvironments();
  const children = [];
  function stop() {
    for (const child of children.toReversed()) if (child.pid && child.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else child.kill('SIGTERM');
    }
  }
  process.once('SIGINT', () => { stop(); process.exit(0); });
  process.once('SIGTERM', () => { stop(); process.exit(0); });
  function build(cwd, childEnv) {
    const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], { cwd, env: childEnv, windowsHide: true, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('REAL_DEMO_BUILD_FAILED');
  }
  function start(cwd, args, childEnv) {
    const child = spawn(process.execPath, args, { cwd, env: childEnv, windowsHide: true, stdio: 'ignore' });
    child.on('error', () => {});
    children.push(child);
    return child;
  }
  async function ready(url, child) {
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error('REAL_DEMO_SERVER_EXITED');
      try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* local readiness only */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('REAL_DEMO_SERVER_NOT_READY');
  }
  try {
    await available(10640); await available(3540);
    console.log('Catalogo REAL local -> G6 demo sin JWT. Ficha REAL pendiente; ficha MOCK en servicio separado.');
    console.log('Host de imagen exacto, solo ensayo local; confirmacion G6 pendiente. Render no se modifica.');
    if (!options.skipBuild) { build(backend, env.backend); build(frontend, env.frontend); }
    if (!existsSync(backend + 'dist/main.js') || !existsSync(frontend + '.next/BUILD_ID')) throw new Error('REAL_DEMO_BUILD_MISSING');
    const bff = start(backend, ['dist/main.js'], env.backend);
    await ready('http://127.0.0.1:10640/live', bff);
    const web = start(frontend, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3540'], env.frontend);
    await ready(WEB_ORIGIN, web);
    const response = await fetch(WEB_ORIGIN + '/api/catalog/products?q=Nike&pageSize=4&sort=NAME_ASC', { signal: AbortSignal.timeout(21000) });
    assert.equal(response.status, 200, 'G6 demo must return a usable catalog');
    assert.equal(response.headers.get('x-catalog-source'), 'REAL');
    const body = await response.json();
    assert.ok(Array.isArray(body.data) && body.data.length > 0, 'No real products returned for demo query Nike');
    for (const product of body.data) if (product.image) assert.equal(new URL(product.image.url).hostname, MEDIA_HOST);
    console.log('PASS: Next -> BFF -> G6; HTTP 200, X-Catalog-Source=REAL, productos=' + body.data.length);
    console.log('Abrir ' + WEB_ORIGIN + '/catalogo?q=Nike&pageSize=4&sort=NAME_ASC');
    console.log('Marcas/precio/ranking pueden seguir pendientes. Sin grant ni despliegue certificado. Ctrl+C detiene esta demo.');
    if (!options.check) await Promise.race(children.map(child => new Promise(resolve => child.once('exit', resolve))));
  } finally { stop(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(/^REAL_DEMO_[A-Z0-9_]+$/.test(error.message) ? error.message : 'REAL_DEMO_CHECK_FAILED: revisar disponibilidad de G6 y contrato; no se usan fixtures.');
    process.exitCode = 1;
  });
}
