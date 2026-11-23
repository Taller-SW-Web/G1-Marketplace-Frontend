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
        onlyCategories: ['performance'],
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        blockedUrlPatterns: ['https://*'],
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.10, aggregationMethod: 'median' }],
        'total-blocking-time': ['warn', { maxNumericValue: 200, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/report' },
  },
};
