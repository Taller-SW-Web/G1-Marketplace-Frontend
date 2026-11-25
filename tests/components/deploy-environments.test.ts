import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/cicd.yml'),
  'utf8'
);

function jobSection(name: string) {
  const start = workflow.indexOf(`  ${name}:`);
  expect(start, `workflow job ${name} exists`).toBeGreaterThanOrEqual(0);

  const nextJob = workflow.slice(start + 1).search(/^ {2}[a-z0-9-]+:\s*$/m);
  return workflow.slice(start, nextJob < 0 ? undefined : start + 1 + nextJob);
}

describe('CI/CD environment separation', () => {
  const staging = jobSection('deploy-staging');
  const production = jobSection('deploy-production');

  it('requires staging-only credentials and URL before triggering its deploy hook', () => {
    expect(staging).toContain('environment: pruebas');
    expect(staging).toContain('VERCEL_STAGING_DEPLOY_HOOK_URL: ${{ secrets.VERCEL_STAGING_DEPLOY_HOOK_URL }}');
    expect(staging).toContain('SITE_URL: ${{ vars.FRONTEND_STAGING_URL }}');
    expect(staging).toContain('PRODUCTION_SITE_URL: ${{ vars.FRONTEND_URL ||');
    expect(staging).toContain('Falta el secreto VERCEL_STAGING_DEPLOY_HOOK_URL');
    expect(staging).toContain('Falta la variable FRONTEND_STAGING_URL');
    expect(staging).toContain('staging.protocol !== "https:"');
    expect(staging).toContain('production.protocol !== "https:"');
    expect(staging).toContain('staging.origin === production.origin');
    expect(staging.indexOf('if [ -z "$SITE_URL" ]')).toBeLessThan(
      staging.indexOf('curl --fail --silent --show-error -X POST "$VERCEL_STAGING_DEPLOY_HOOK_URL"')
    );
    expect(staging.indexOf('[ "${SITE_URL%/}" = "${PRODUCTION_SITE_URL%/}" ]')).toBeLessThan(
      staging.indexOf('curl --fail --silent --show-error -X POST "$VERCEL_STAGING_DEPLOY_HOOK_URL"')
    );
    expect(staging).not.toContain('VERCEL_DEPLOY_HOOK_URL');
    expect(staging).not.toMatch(/^\s*SITE_URL:\s*\$\{\{\s*vars\.FRONTEND_URL/m);
  });

  it('uses a production-only hook behind the production environment and staging dependency', () => {
    expect(production).toContain('environment: production');
    expect(production).toContain('needs: [deploy-staging, release]');
    expect(production).toContain('VERCEL_PROD_DEPLOY_HOOK_URL: ${{ secrets.VERCEL_PROD_DEPLOY_HOOK_URL }}');
    expect(production).toContain('Falta el secreto VERCEL_PROD_DEPLOY_HOOK_URL');
    expect(production).not.toContain('VERCEL_DEPLOY_HOOK_URL');
    expect(production).not.toContain('VERCEL_STAGING_DEPLOY_HOOK_URL');
    expect(production).not.toContain('FRONTEND_STAGING_URL');
  });

  it('keeps both deploy jobs restricted to pushes on develop', () => {
    const pushToDevelop = "if: github.event_name == 'push' && github.ref == 'refs/heads/develop'";
    expect(staging).toContain(pushToDevelop);
    expect(production).toContain(pushToDevelop);
  });
});
