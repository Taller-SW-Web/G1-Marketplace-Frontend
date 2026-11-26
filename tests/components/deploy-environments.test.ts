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

describe('CI/CD single deploy path', () => {
  const deploy = jobSection('deploy');

  it('uses a single native post-CI smoke job without duplicate deploy hooks or environments', () => {
    expect(deploy).not.toContain('environment: production');
    expect(deploy).not.toContain('VERCEL_DEPLOY_HOOK_URL');
    expect(deploy).toContain('needs: [build-and-security, release]');
    expect(deploy).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/develop'");
    expect(deploy).toContain('Smoke test del sitio (/ y /carrito)');
    expect(workflow).not.toContain('  deploy-staging:');
    expect(workflow).not.toContain('  deploy-production:');
  });
});
