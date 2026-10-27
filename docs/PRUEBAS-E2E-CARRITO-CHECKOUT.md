# Guía de Ejecución y Validación E2E: Carrito ↔ Checkout (Backend MOCK)

## 1. Contexto y Alcance
La prueba de integración end-to-end (`npm run test:cart-checkout:e2e`) valida el flujo completo de compra entre el Frontend (Next.js) y el Backend (NestJS + PostgreSQL):
1. Adición de producto con SKU dinámico al carrito persistido vía API proxy (`/api/cart/current/items`).
2. Consulta del carrito persistido y cotización en backend (`/checkout`).
3. Aplicación de cupón y selección de dirección de envío.
4. Registro de consentimiento de pago simulado.
5. Creación de la orden en backend con clave de idempotencia (`/api/v1/checkout/orders`).
6. Confirmación de pedido en estado verificado **`SUCCEEDED` / `PAGADO`** y navegación al detalle del pedido (`/checkout/confirmado/PED-...`).

---

## 2. Prerrequisitos de Ejecución Local

Para ejecutar la prueba localmente, se deben tener los siguientes tres servicios activos en sus puertos designados:

| Servicio | Componente | Puerto | Comando de inicio |
| :--- | :--- | :--- | :--- |
| **Base de Datos** | PostgreSQL 16 (Docker) | `5432` | `docker compose up -d postgres` |
| **Mock Auth Server** | Emisor JWT RS256 local | `4010` | `npm run mock:auth` *(en repo Backend)* |
| **Backend API** | NestJS en modo mock | `10000` | `node dist/main.js` o `npm run start:dev` *(en repo Backend)* |

### Variables de entorno requeridas en Backend (`.env`):
```dotenv
PORT=10000
NODE_ENV=development
USE_MOCKS=true
MOCK_SALES_OUTCOME=PAID
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/marketplace_db?schema=public"
AUTH_ISSUER="http://127.0.0.1:4010"
AUTH_JWKS_URL="http://127.0.0.1:4010/jwks"
```

---

## 3. Ejecución de la Prueba en Frontend

Desde la raíz de `G1-Marketplace-Frontend`:

```bash
npm run test:cart-checkout:e2e
```

Playwright iniciará automáticamente el servidor Next.js en el puerto `3101` con la configuración `CHECKOUT_MODE=backend-mock` y ejecutará la suite completa.

---

## 4. Evidencia de Ejecución Exitosa

### Salida de Terminal (Playwright):
```text
> g1-marketplace-frontend@0.1.0 test:cart-checkout:e2e
> playwright test --config playwright.cart-checkout.config.ts -g "backend-mock quotes"

Running 1 test using 1 worker

  ok 1 tests\checkout.spec.ts:41:5 › backend-mock quotes the persisted Cart snapshot and version (9.5s)

  1 passed (19.5s)
```

### Registro de Base de Datos PostgreSQL (`checkout_operations`):
```json
{
  "id": "ad2f8a5b-689e-473f-9f96-3941506d9db8",
  "customerId": "11111111-1111-4111-8111-111111111111",
  "cartId": "4bd1e579-58d6-45ec-a466-cca241b3f61c",
  "state": "SUCCEEDED",
  "externalOrderId": "PED-2026-00001",
  "completedAt": "2026-10-19T02:46:25.044Z"
}
```

### Verificación UI:
- Encabezado: `¡Pedido confirmado!` (visible)
- Enlace generado: `/checkout/confirmado/PED-2026-00001`
- Estado verificado: `Estado verificado · SUCCEEDED/PAGADO` (visible y validado por assertion de Playwright)
