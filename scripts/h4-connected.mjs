import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = resolve(process.env.H4_BACKEND_DIR ?? join(frontend, '../G1-Marketplace-Backend'));
const directory = mkdtempSync(join(tmpdir(), 'g1-h4-'));
const readyFile = join(directory, 'ready.json');
const container = `g1-h4-e2e-${randomUUID()}`;
const secret = randomUUID();
const children = [];
let created = false;
function run(command, args, cwd, env = process.env, capture = false) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', windowsHide: true, stdio: capture ? 'pipe' : 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`Command failed: ${command} ${args[0] ?? ''}`);
  return result.stdout?.trim();
}
function start(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  children.push(child); return child;
}
async function port() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const value = server.address().port;
  await new Promise(resolve => server.close(resolve)); return value;
}
function cleanup() {
  for (const child of children.reverse()) if (child.exitCode === null && child.pid) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
  }
  if (created) {
    const result = spawnSync('docker', ['rm', '--force', container], { stdio: 'ignore', windowsHide: true });
    if (result.status !== 0) { console.error(`Cleanup required: ${container}`); process.exitCode = 1; }
    created = false;
  }
  rmSync(directory, { recursive: true, force: true });
}
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });
try {
  if (!existsSync(join(backend, 'scripts/h4-connected-server.ts'))) {
    throw new Error('Backend lacks scripts/h4-connected-server.ts; set H4_BACKEND_DIR to the corrected PR checkout');
  }
  run('docker', ['info', '--format', '{{.ServerVersion}}'], backend, process.env, true);
  run('docker', ['run', '--detach', '--rm', '--name', container, '--publish', '127.0.0.1::5432',
    '--env', 'POSTGRES_DB=marketplace_h3_test', '--env', `POSTGRES_PASSWORD=${secret}`, 'postgres:16-alpine'], backend, process.env, true);
  created = true;
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore', windowsHide: true }).status === 0) { ready = true; break; }
    await delay(500);
  }
  if (!ready) throw new Error('Disposable PostgreSQL not ready');
  const binding = run('docker', ['port', container, '5432/tcp'], backend, process.env, true);
  if (!/^127\.0\.0\.1:\d+$/.test(binding)) throw new Error('Expected loopback binding');
  const database = `postgresql://postgres:${secret}@${binding}/marketplace_h3_test?schema=public`;
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: database, TEST_DATABASE_URL: database,
    H4_CONNECTED_TEST: 'true', H4_CONTROL_SECRET: secret, H4_READY_FILE: readyFile,
    H3_SANDBOX_ENABLED: 'false', H3_AUTH_MOCK: 'false', WISHLIST_SOURCE: 'sandbox',
    AUTH_ENABLED: 'false', G7_INTROSPECTION_ENABLED: 'false', G7_REGISTRATION_ENABLED: 'false', G7_RECOVERY_ENABLED: 'false',
    CSAT_ENABLED: 'true', CSAT_INTEGRATION_APPROVED: 'true', CSAT_PROMPT_APPROVED: 'true',
    USE_MOCKS: 'true', ORDERS_SOURCE: 'unconfigured', PORT: '10200', HTTP_TIMEOUT_MS: '3000' };
  const prisma = join(backend, 'node_modules/prisma/build/index.js');
  run(process.execPath, [prisma, 'generate'], backend, env);
  run(process.execPath, [prisma, 'migrate', 'deploy'], backend, env);
  run(process.execPath, [prisma, 'migrate', 'deploy'], backend, env);
  const nest = start(['-r', 'ts-node/register', 'scripts/h4-connected-server.ts'], backend, env);
  for (let i = 0; !existsSync(readyFile); i++) {
    if (nest.exitCode !== null || i >= 120) throw new Error('Connected Nest startup failed');
    await delay(500);
  }
  const { backendUrl, fixtureUrl } = JSON.parse(readFileSync(readyFile, 'utf8'));
  const origin = `http://127.0.0.1:${await port()}`;
  const next = start(['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', new URL(origin).port, '--webpack'], frontend,
    { ...process.env, NODE_ENV: 'development', MARKETPLACE_API_URL: backendUrl, H4_CONNECTED_TEST: 'true', G1_AUTH_ENABLED: 'false',
      H3_FRONTEND_SANDBOX_ENABLED: 'true', H3_FRONTEND_ORIGIN: origin,
      H3_WISHLIST_READ_ENABLED: 'true', H3_WISHLIST_CART_ENABLED: 'true',
      H3_SANDBOX_TOKEN_A: 'connected-A', H3_SANDBOX_TOKEN_B: 'connected-B', NEXT_TELEMETRY_DISABLED: '1' });
  ready = false;
  for (let i = 0; i < 120; i++) {
    if (next.exitCode !== null) throw new Error('Connected Next startup failed');
    try { if ((await fetch(`${origin}/demo/h3/favoritos`, { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break; } } catch {}
    await delay(500);
  }
  if (!ready) throw new Error('Connected Next readiness timed out');
  const test = start(['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.h4-connected.config.ts'], frontend,
    { ...process.env, H4_TEST_ORIGIN: origin, H4_FIXTURE_URL: fixtureUrl, H4_CONTROL_SECRET: secret });
  const status = await new Promise(resolve => test.once('exit', resolve));
  if (status !== 0) throw new Error('Connected E2E failed');
  console.log('PASS: browser → Next → Nest → PostgreSQL; controlled identity/catalog/Sales providers.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { cleanup(); }
