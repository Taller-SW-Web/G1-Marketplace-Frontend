import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G6_GATEWAY_ORIGIN, g6Origin } from './g6-origin.mjs';
import { demoEnvironments, demoOptions, MEDIA_HOST } from './demo-catalog-real.mjs';

test('demo isolates inherited cloud settings and secrets without changing parent', () => {
  const parent = { PATH: 'runtime', NODE_ENV: 'production', PRODUCTOS_SERVICE_TOKEN: 'not-a-credential-test-marker',
    MARKETPLACE_API_URL: 'https://production.example', DATABASE_URL: 'external-db-test-marker', CATALOG_SOURCE: 'mock' };
  const { backend, frontend } = demoEnvironments(parent);
  assert.equal(backend.NODE_ENV, 'test');
  assert.equal(backend.CATALOG_SOURCE, 'real');
  assert.equal(backend.PRODUCTOS_AUTH_MODE, 'public-read-only');
  assert.equal(backend.PRODUCTOS_SERVICE_TOKEN, '');
  assert.equal(new URL(backend.DATABASE_URL).hostname, '127.0.0.1');
  assert.equal(new URL(frontend.MARKETPLACE_API_URL).origin, 'http://127.0.0.1:10640');
  assert.equal(frontend.PRODUCTOS_SERVICE_TOKEN, undefined);
  assert.equal(parent.NODE_ENV, 'production');
});

test('only the exact local trial media host is allowed; time budgets are nested', () => {
  const { backend, frontend } = demoEnvironments({});
  assert.equal(backend.PRODUCTOS_MEDIA_HOSTS, MEDIA_HOST);
  assert.ok(!MEDIA_HOST.includes('*'));
  assert.ok(Number(backend.PRODUCTOS_TIMEOUT_MS) < Number(frontend.CATALOG_BFF_TIMEOUT_MS));
  assert.equal(backend.CATALOG_HOME_FALLBACK_ENABLED, 'false');
  assert.equal(backend.BFF_MODE, 'real');
});

test('CLI supports check and explicit existing-build reuse; rejects other options', () => {
  assert.deepEqual(demoOptions(['--check']), { check: true, skipBuild: false, baseUrl: G6_GATEWAY_ORIGIN });
  assert.deepEqual(demoOptions(['--check', '--skip-build']), { check: true, skipBuild: true, baseUrl: G6_GATEWAY_ORIGIN });
  assert.throws(() => demoOptions(['--production']), /REAL_DEMO_INVALID_ARGUMENT/);
});

// Only error codes are exposed; corporate proxy details and raw errors stay private.
test('network diagnostic distinguishes certificate errors from transport failures', async () => {
  const { networkError } = await import('./check-g6-network.mjs');
  assert.deepEqual(networkError({cause:{code:'SELF_SIGNED_CERT_IN_CHAIN',message:'private-detail'}}), {outcome:'TLS_ERROR',codes:['SELF_SIGNED_CERT_IN_CHAIN']});
  assert.deepEqual(networkError({code:'ECONNREFUSED'}), {outcome:'TRANSPORT_ERROR',codes:['ECONNREFUSED']});
  assert.deepEqual(networkError({code:'invalid secret-like text'}), {outcome:'TRANSPORT_ERROR',codes:[]});
});


test('default selects the new gateway and only an explicit CLI origin overrides it', () => {
  const parent = { PRODUCTOS_BASE_URL: 'https://unrelated.example.test', PRODUCTOS_AUTH_MODE: 'service-token',
    PRODUCTOS_CLIENT_SECRET: 'synthetic-private-marker' };
  assert.equal(demoEnvironments(parent).backend.PRODUCTOS_BASE_URL, G6_GATEWAY_ORIGIN);
  const options = demoOptions(['--base-url', 'https://approved.example.test', '--check']);
  const env = demoEnvironments(parent, options);
  assert.equal(env.backend.PRODUCTOS_BASE_URL, 'https://approved.example.test');
  assert.equal(env.backend.PRODUCTOS_AUTH_MODE, 'public-read-only');
  assert.equal(env.backend.PRODUCTOS_CLIENT_SECRET, undefined);
  assert.equal(env.frontend.PRODUCTOS_BASE_URL, undefined);
});

for (const origin of ['http://example.test', 'https://user:password@example.test', 'https://example.test/api',
  'https://example.test?q=x', 'https://example.test#x', 'https://example.test/']) {
  test('rejects unsafe or noncanonical origin: ' + origin, () => {
    assert.throws(() => g6Origin(origin), /REAL_DEMO_INVALID_ORIGIN/);
    assert.throws(() => demoOptions(['--base-url', origin]), /REAL_DEMO_INVALID_ORIGIN/);
    assert.throws(() => demoEnvironments({}, { baseUrl: origin }), /REAL_DEMO_INVALID_ORIGIN/);
  });
}

test('CLI rejects missing, unknown and repeated origin options', () => {
  for (const args of [['--base-url'], ['--base-url=https://example.test'],
    ['--base-url', 'https://example.test', '--base-url', 'https://other.test']]) {
    assert.throws(() => demoOptions(args), /REAL_DEMO_INVALID_ARGUMENT/);
  }
});
