import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = fileURLToPath(new URL('../../G1-Marketplace-Backend/', import.meta.url));
const npmCli = process.env.npm_execpath;
const args = process.argv.slice(2);
if (!npmCli || args.some(arg => !['--check', '--skip-build'].includes(arg))) {
  console.error('Usa npm run demo:catalogo:h4 [-- --check --skip-build]');
  process.exit(1);
}
const children = [];
const bffEnv = { ...process.env, NODE_ENV: 'test', PORT: '10500', CATALOG_SOURCE: 'mock',
  BFF_MODE: 'mock', USE_MOCKS: 'true', ORDERS_SOURCE: 'unconfigured', G1_AUTH_ENABLED: 'false',
  H3_SANDBOX_ENABLED: 'false', H3_AUTH_MOCK: 'false', AUTH_G7_INTROSPECTION_ENABLED: 'false',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/h4_catalog_demo',
  CORS_ORIGINS: 'http://127.0.0.1:3500', CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3500' };
const webEnv = { ...process.env, NODE_ENV: 'production', MARKETPLACE_API_URL: 'http://127.0.0.1:10500',
  NEXT_TELEMETRY_DISABLED: '1', G1_AUTH_ENABLED: 'false', H3_FRONTEND_SANDBOX_ENABLED: 'false' };

function stop() {
  for (const child of children.reverse()) if (child.pid && child.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
}
function build(cwd, env) {
  const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], { cwd, env, windowsHide: true, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('DEMO_BUILD_FAILED');
}
function start(cwd, command, env) {
  const child = spawn(process.execPath, command, { cwd, env, windowsHide: true, stdio: 'ignore' });
  child.on('error', () => {});
  children.push(child);
  return child;
}
async function available(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error('DEMO_PORT_BUSY_' + port)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
async function ready(url, child) {
  for (let i = 0; i < 45; i++) {
    if (child.exitCode !== null) throw new Error('DEMO_SERVER_EXITED');
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* readiness only */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('DEMO_SERVER_NOT_READY');
}
process.once('SIGINT', () => { stop(); process.exit(0); });
process.once('SIGTERM', () => { stop(); process.exit(0); });
try {
  await available(10500); await available(3500);
  console.log('Demo H4 [MOCK]: datos sinteticos. Sin Docker, credenciales reales ni escrituras en BD.');
  if (!args.includes('--skip-build')) { build(backend, bffEnv); build(frontend, webEnv); }
  if (!existsSync(backend + 'dist/main.js') || !existsSync(frontend + '.next/BUILD_ID')) throw new Error('DEMO_BUILD_MISSING');
  const bff = start(backend, ['dist/main.js'], bffEnv);
  await ready('http://127.0.0.1:10500/live', bff);
  const web = start(frontend, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3500'], webEnv);
  await ready('http://127.0.0.1:3500', web);
  for (const path of ['home', 'filters', 'products?q=running&pageSize=4&sort=NAME_ASC']) {
    const response = await fetch('http://127.0.0.1:3500/api/catalog/' + path);
    assert.equal(response.status, 200); assert.equal(response.headers.get('x-catalog-source'), 'MOCK');
  }
  console.log('PASS: home, filtros y busqueda mediante Next -> BFF [MOCK].');
  if (args.includes('--check')) { stop(); }
  else {
    console.log('Abrir http://127.0.0.1:3500/catalogo?q=running&pageSize=4');
    console.log('Ctrl+C detiene solamente los procesos creados por esta demo. /live no acredita DB/readiness.');
    await Promise.race(children.map(child => new Promise(resolve => child.once('exit', resolve))));
    stop();
  }
} catch (error) {
  stop();
  console.error(/^DEMO_[A-Z0-9_]+$/.test(error.message) ? error.message : 'DEMO_CHECK_FAILED');
  process.exitCode = 1;
}
