import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/cicd.yml'),
  'utf8'
);

describe('CI/CD single native deploy path and required check', () => {
  it('publishes the required Build, Compile y Test check and delegates deploy to native Vercel', () => {
    expect(workflow).toContain('name: Build, Compile y Test');
    expect(workflow).not.toContain('  deploy:');
    expect(workflow).not.toContain('  deploy-staging:');
    expect(workflow).not.toContain('  deploy-production:');
    expect(workflow).not.toContain('environment: production');
    expect(workflow).not.toContain('VERCEL_DEPLOY_HOOK_URL');
  });
});
