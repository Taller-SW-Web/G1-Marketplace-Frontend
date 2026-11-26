# #325 — Arquitectura C4 de la compra

Diagrama de trabajo actualizado con los recorridos que ya tienen evidencia comunicada. APIM, RabbitMQ y webhook aparecen; faltan nombres/URLs desplegados y vistas C4 formales de contexto, contenedores y componentes.

```mermaid
flowchart LR
    Cliente[Usuario / cliente]
    APIM[APIM\nGateway]
    BFF[Marketplace BFF]
    G7[G7 Seguridad]
    Broker[(RabbitMQ\nBroker)]
    Consumer[Consumidor de eventos]
    Ventas[Ventas]
    Webhook[Ventas\nWebhook]
    Despacho[Persistencia de despacho]

    Cliente -->|API de compra| APIM
    APIM --> BFF
    BFF -->|POST checkout y consultas| Ventas
    G7 -->|publica evento de usuario| Broker
    Broker -->|cola marketplace.usuarios| Consumer
    Ventas -->|eventos de despacho| Webhook
    Webhook -->|7 eventos persistidos| Despacho
```

> Confirmado: las pruebas informadas ejercitaron BFF→Ventas, G7→RabbitMQ (`marketplace.usuarios`) y Ventas→webhook de despacho. No se afirma que estos flujos correspondan a una misma traza distribuida. Confirmar el rol de Productos en el flujo de compra, el nombre del consumidor/webhook y los límites de confianza antes de congelar. El laboratorio RabbitMQ/PostgreSQL de Leonidas permanece separado y marcado LAB LOCAL.

## Enlaces de evidencia

| Componente / salto | Run / fuente | Reporte | Resultado / límite |
|---|---|---|---|
| Cuenta A → BFF | Directorio `docs/evidencias/H5/integracion-real/bff/2026-11-26/`; PR a develop pendiente | Ruta de reporte comunicada; URL pública pendiente | 19/19 OK, 0 fallos, sin 429; 26/11 16:00:23–16:00:32 |
| BFF → Ventas (crear/leer pedido) | BE #380/#397; `requestId` en [trazabilidad](299-trazabilidad.md) | Enlace de logs/tabla de Ventas pendiente | Pedido creado/consultado; POST 202 y GETs 200; SHA `f17896d` |
| G7 → RabbitMQ `marketplace.usuarios` | [BE #313](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/313) / [#294](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/294) | Permalink exacto pendiente | Evento real cotejado con outbox; nombre del consumidor pendiente |
| Ventas → webhook de despacho | [BE #318](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/318) | Run/log primario pendiente | 7 eventos persistidos; 5 `DESPACHADO`, 2 `ENTREGADO`; token incorrecto 401 |
| Webhook/evento → correo C-002 | [BE #162](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/162) | Run/log primario pendiente | Reenvío de mismo eventId marcado duplicate; un correo enviado |
| LAB LOCAL RabbitMQ + PostgreSQL | `H5-evidencia-consumidor-Leonidas.md`; enlace exacto pendiente | Reporte lab; URL pendiente | RabbitMQ 4.1, PostgreSQL 16 desechables; eventos sintéticos, duplicado/reconexión y ensayo retry/DLQ; no es integración REAL |

## Datos para la vista C4

| Nivel | Artefacto | Enlace |
|---|---|---|
| Contexto | Actores y sistemas externos | Pendiente |
| Contenedores | APIM, BFF, servicios, RabbitMQ, consumidor y Ventas | Pendiente |
| Componentes | Configuración interna relevante para el flujo | Pendiente |

El diagrama y las filas anteriores avanzan el inventario de componentes; la evidencia todavía no contiene identificadores de despliegue/APIM, configuración desplegada, C4 validado por arquitectura ni una traza única que conecte los saltos.

