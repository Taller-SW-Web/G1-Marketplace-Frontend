import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cartStyles = readFileSync(
  resolve(process.cwd(), 'src/features/cart/cart-v008.css'),
  'utf8'
);

describe('cart V-008 stylesheet cascade and motion preferences', () => {
  it('scopes redesigned title and summary rules more specifically than legacy cart selectors', () => {
    expect(cartStyles).toMatch(/\.cart-page-shell\s*\{/);
    expect(cartStyles).toMatch(/\.cart-page-shell\s+\.cart-line-title\s*\{/);
    expect(cartStyles).toMatch(/\.cart-page-shell\s+\.cart-subtotal-card\s*\{/);
    expect(cartStyles).not.toMatch(/^\s*\.cart-(?!page-shell(?:\s|\.|,|:|\{))[^,{]*\{/m);
  });

  it('disables transitions, animations and hover translations for reduced motion', () => {
    const reducedMotion = cartStyles.slice(
      cartStyles.indexOf('@media (prefers-reduced-motion: reduce)')
    );

    expect(reducedMotion).toContain('.cart-page-shell .cart-line-item:hover');
    expect(reducedMotion).toContain('.cart-page-shell .cart-subtotal-cta button:hover:not(:disabled)');
    expect(reducedMotion).toMatch(/animation:\s*none/);
    expect(reducedMotion).toMatch(/transition:\s*none/);
    expect(reducedMotion).toMatch(/transform:\s*none/);
  });
});
