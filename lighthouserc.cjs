const origin = 'http://127.0.0.1:3500';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run demo:catalogo:h4 -- --skip-build --featured',
      startServerReadyPattern: 'PASS: home, filtros y busqueda',
      startServerReadyTimeout: 45000,
      numberOfRuns: 3,
      url: [
        `${origin}/`,
        `${origin}/catalogo?q=running&pageSize=4`,
        `${origin}/productos/zapatillas-running-aero-x`,
      ],
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        blockedUrlPatterns: ['https://*'],
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:performance': ['warn', { minScore: 0.8, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.10, aggregationMethod: 'median' }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'total-blocking-time': ['warn', { maxNumericValue: 300, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/report' },
  },
};
