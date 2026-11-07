import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function networkError(error) {
  const codes = [];
  for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth++) {
    if (typeof current.code === 'string' && /^[A-Z0-9_]+$/.test(current.code)) codes.push(current.code);
  }
  const tls = codes.some(code => /CERT|TLS|SELF_SIGNED|LEAF_SIGNATURE/.test(code));
  return { outcome: tls ? 'TLS_ERROR' : 'TRANSPORT_ERROR', codes };
}

export async function probeG6() {
  const started = Date.now();
  const base = { schema: 1, timestampUtc: new Date().toISOString(), method: 'GET',
    origin: 'https://g6-productos-ofertas.duckdns.org', requestId: randomUUID(),
    credentialsUsed: false, tlsValidationDisabled: false, nodeVersion: process.version };
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    return { ...base, outcome: 'INVALID_LOCAL_CONFIG', codes: ['TLS_VALIDATION_MUST_BE_ENABLED'] };
  }
  return new Promise(resolve => {
    const request = https.get(base.origin + '/api/v1/productos?canal=MARKETPLACE&q=Nike&pagina=1&tamanio=1', {
      rejectUnauthorized: true, timeout: 15000,
      headers: { Accept: 'application/json', 'X-Correlation-Id': base.requestId },
    }, response => {
      const cert = response.socket.getPeerCertificate();
      const tls = { authorized: response.socket.authorized, protocol: response.socket.getProtocol(),
        issuer: cert.issuer?.CN, subject: cert.subject?.CN, fingerprint256: cert.fingerprint256,
        validTo: cert.valid_to };
      let body = '', bytes = 0;
      response.setEncoding('utf8');
      response.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 65536) request.destroy(Object.assign(new Error(), { code: 'RESPONSE_TOO_LARGE' }));
        else body += chunk;
      });
      response.on('error', error => resolve({ ...base, ...networkError(error), elapsedMs: Date.now() - started }));
      response.on('end', () => {
        let products = null;
        try { const data = JSON.parse(body); if (Array.isArray(data.items)) products = data.items.length; } catch { /* no raw bodies logged */ }
        const ok = response.statusCode === 200 && tls.authorized && products !== null;
        resolve({ ...base, outcome: ok ? 'PASS' : 'UPSTREAM_HTTP_ERROR', status: response.statusCode,
          products, tls, elapsedMs: Date.now() - started });
      });
    });
    request.once('timeout', () => request.destroy(Object.assign(new Error(), { code: 'NETWORK_TIMEOUT' })));
    request.once('error', error => resolve({ ...base, ...networkError(error), elapsedMs: Date.now() - started }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await probeG6();
  console.log(JSON.stringify(result, null, 2));
  if (result.outcome !== 'PASS') process.exitCode = 1;
}
