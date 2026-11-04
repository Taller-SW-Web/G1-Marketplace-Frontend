# CI/CD y versionado — H4 (Frontend)

Workflow: `.github/workflows/cicd.yml`. Se ejecuta en cada push a `develop`; en las PR corre sólo Build/Compile/Test.

| Etapa | Qué hace |
|---|---|
| Build | `next build` (`npm run build`). |
| Compile | `npm run typecheck` (`tsc --noEmit`) y `eslint`. |
| Test | `vitest` de componentes y de servidor. |
| Versionado | `semantic-release` lee los commits convencionales (`fix:` → PATCH, `feat:` → MINOR, `feat!:`/`BREAKING CHANGE` → MAJOR), actualiza `package.json` y `CHANGELOG.md`, crea el tag `vX.Y.Z` y el release en GitHub. La versión no se edita a mano. |
| Deploy | Dispara el deploy hook de Vercel sólo si Build/Compile/Test pasaron. |
| Smoke test | `curl` con reintentos al sitio/`/health`; si no responde 200, el pipeline falla. |

## Configuración requerida (una sola vez)

- Secreto `VERCEL_DEPLOY_HOOK_URL` en Settings → Secrets → Actions (URL del deploy hook).
- Desactivar el auto-deploy de Vercel para que el pipeline sea el único que despliega.
- Opcional: variable `FRONTEND_URL` para sobrescribir la URL del smoke test.
