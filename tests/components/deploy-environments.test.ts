import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/cicd.yml'),
  'utf8'
);

describe('CI/CD single native deploy path & required check', () => {
  it('reports the required develop ruleset check name Build, Compile y Test', () => {
    expect(workflow).toContain('name: Build, Compile y Test');
  });

  it('delegates deployment to Vercel native auto-deploy without duplicate hooks, environments, or unlinked smoke jobs', () => {
    expect(workflow).not.toContain('environment: production');
    expect(workflow).not.toContain('VERCEL_DEPLOY_HOOK_URL');
    expect(workflow).not.toContain('  deploy:');
    expect(workflow).not.toContain('  deploy-staging:');
    expect(workflow).not.toContain('  deploy-production:');
  });
});
