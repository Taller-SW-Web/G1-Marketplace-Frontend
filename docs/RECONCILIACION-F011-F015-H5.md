# Matriz de Reconciliación F-011–F-015 · Hito 5

**Fuente:** Revisión de Sebastián Malca (22/11/2026) · Issues GitHub asignados a `SebastianMalca`
**Estado del código:** Backend `d595caa`, Frontend `e56a13e0`, SPECS `ccec225`
**Corte local:** BE `f11139f` + `0210cf7`/`706b0ef`, FE `5bd2629` + commits locales

---

## Resumen por Función

| Función | Implementación FE | Implementación BE | Integración | QA Funcional | QA Seguridad | Documentación |
|---------|-------------------|-------------------|-------------|--------------|--------------|---------------|
| **F-011 Ficha y galería** | ✅ Cerrada (MOCK) [FE #37] | ✅ Cerrada (MOCK) [BE #64] | 🟡 Abierta [BE #65] | 🟡 Abierta [FE #38] | 🟡 Abierta [BE #66] | 🟡 Abierta [BE #67] |
| **F-012 Precio, oferta y descuento** | 🟢 Candidata [FE #39] | 🟢 Candidata [BE #68] | 🟡 Abierta [BE #69] | 🟡 Abierta [FE #40] | 🟡 Abierta [BE #70] | 🟡 Abierta [BE #71] |
| **F-013 Atributos y variante** | 🟢 Candidata [FE #41] | 🟡 Pendiente SKU simple [BE #72] | 🟡 Abierta [BE #73] | 🟡 Abierta [FE #42] | 🟡 Abierta [BE #74] | 🟡 Abierta [BE #75] |
| **F-014 Disponibilidad** | 🟢 Candidata [FE #43] | 🟢 Candidata [BE #76] | 🟡 Abierta [BE #77] | 🟡 Abierta [FE #44] | 🟡 Abierta [BE #78] | 🟡 Abierta [BE #79] |
| **F-015 Relacionados** | 🟢 Candidata [FE #45] | 🟡 Pendiente criterios [BE #80] | 🟡 Abierta [BE #81] | 🟡 Abierta [FE #46] | 🟡 Abierta [BE #82] | 🟡 Abierta [BE #83] |

**Leyenda:** ✅ Cerrado · 🟢 Candidata (base fusionada, lista para revisión) · 🟡 Pendiente/Abierta

---

## Detalle por Issue y Rol

### F-011 · Ficha y galería

| Issue | Rol | Estado | PR/SHA | Evidencia | Próximo paso |
|-------|-----|--------|--------|-----------|--------------|
| [FE #37](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/37) | FE Impl | ✅ Cerrado | PR #7, #10 | MOCK ficha + galería | — |
| [BE #64](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/64) | BE Impl | ✅ Cerrado | PR #16, #18 | MOCK ficha | — |
| [BE #65](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/65) | INT | 🟡 Abierto | — | Base: BE PR #275 (Jim aprobado), 20 respuestas 200 REAL (06/11) | Repetir contra G6 autorizado con entorno, SHA, traza, manejo 502/503/504 |
| [FE #38](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/38) | QA Func | 🟡 Abierto | — | Retest 22/11: ficha 200 REAL (proxy + BFF) | Acreditar retorno, galería, fallo imagen, inexistente, Escape + foco (desktop/móvil) |
| [BE #66](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/66) | QA Seg | 🟡 Abierto | — | Regresiones validación, render seguro, allowlist medios | Enlazar checks mismo SHA + DAST staging |
| [BE #67](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/67) | DOC | 🟡 Abierto | — | Ficha, V-007, contrato, errores, PR #275, retest | Actualizar y enlazar |

### F-012 · Precio, oferta y descuento

| Issue | Rol | Estado | PR/SHA | Evidencia | Próximo paso |
|-------|-----|--------|--------|-----------|--------------|
| [FE #39](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/39) | FE Impl | 🟢 Candidata | PR #107, #133 | Vigencia, caída, "por confirmar" (503) | Validar criterios, adjuntar SHA |
| [BE #68](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/68) | BE Impl | 🟢 Candidata | PR #232, #279 | SKU ajeno, vencimiento, versión, caché, guardas | Adjuntar evidencia |
| [BE #69](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/69) | INT | 🟡 Abierto | — | Acordar ruta, scope, moneda, vigencia, versión con G6 Pricing | Conectar origen autorizado, demostrar SKU, descuento, errores |
| [FE #40](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/40) | QA Func | 🟡 Abierto | — | Cambio SKU, sin oferta, caducidad, ficha legible en error | Probar y documentar |
| [BE #70](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/70) | QA Seg | 🟡 Abierto | — | SKU otro producto, vigencia inválida, sin costos internos | Acreditar checks |
| [BE #71](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/71) | DOC | 🟡 Abierto | — | Contrato, tests, cuándo "por confirmar", sin proveedor | Enlazar y documentar |

### F-013 · Atributos y variante

| Issue | Rol | Estado | PR/SHA | Evidencia | Próximo paso |
|-------|-----|--------|--------|-----------|--------------|
| [FE #41](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/41) | FE Impl | 🟢 Candidata | PR #107, #134 | Selector, imagen variante, payload SKU | Revisar y cerrar |
| [BE #72](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/72) | BE Impl | 🟡 Pendiente | — | **Falta: representación SKU simple** (G-SKU o base) | Documentar/probar cómo sale SKU base + proyección variantes #277 |
| [BE #73](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/73) | INT | 🟡 Abierto | — | Repetir simple/variable, etiquetas legibles, 2 SKU, handoff F-016 | Confirmar elegibilidad + contrato G6/Andrés |
| [FE #42](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/42) | QA Func | 🟡 Abierto | — | 2 variantes + imágenes/SKU, combinación inválida, simple sin selector | Probar respuesta tardía precio/stock |
| [BE #74](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/74) | QA Seg | 🟡 Abierto | — | Variantes inactivas, combinación duplicada, SKU ajeno server-side | Acreditar |
| [BE #75](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/75) | DOC | 🟡 Abierto | — | Vincular #277/#134, acuerdo SKU simple, propiedad F-016 | Completar |

### F-014 · Disponibilidad

| Issue | Rol | Estado | PR/SHA | Evidencia | Próximo paso |
|-------|-----|--------|--------|-----------|--------------|
| [FE #43](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/43) | FE Impl | 🟢 Candidata | — | 4 estados, reintento, caché ≤30s, identidad SKU, respuesta saneada | Validar corte acordado (M-01) |
| [BE #76](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/76) | BE Impl | 🟢 Candidata | PR #266, #279 | 4 estados, reintento, caché, identidad SKU, respuesta saneada | Validar corte acordado (M-01) |
| [BE #77](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/77) | INT | 🟡 Abierto | — | Cerrar G-G6-COMPAT + I-01, GET comercial autenticado, 4 estados, errores, trazas | Cantidad como verificación separada sin reserva |
| [FE #44](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/44) | QA Func | 🟡 Abierto | — | Distinguir 200 UNDETERMINED de 503, validar sin SKU, descartar SKU anterior | Probar |
| [BE #78](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/78) | QA Seg | 🟡 Abierto | — | Ausencia cantidades/ubicaciones, caché, otro SKU, caída ≠ agotamiento | Acreditar |
| [BE #79](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/79) | DOC | 🟡 Abierto | — | Conciliar SPECS PR #12/#17, actualizar funcional, UI, API, React | Enlazar M-01 + retests |

### F-015 · Relacionados

| Issue | Rol | Estado | PR/SHA | Evidencia | Próximo paso |
|-------|-----|--------|--------|-----------|--------------|
| [FE #45](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/45) | FE Impl | 🟢 Candidata | PR #107 | Tarjetas, vacío sin título, navegación | Validar |
| [BE #80](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/80) | BE Impl | 🟡 Pendiente | — | **Falta: enriquecimiento tarjetas, máx 8, deduplicación, exclusión origen, degradación** | Acreditar criterios completos |
| [BE #81](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/81) | INT | 🟡 Abierto | — | Confirmar fuente, grant `recomendaciones:leer`, probar datos/vacío/fallo/timeout | G6 #138 abierto |
| [FE #46](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/issues/46) | QA Func | 🟡 Abierto | — | Navegación, precio null, sección omitida en vacío, ficha usable al fallar proveedor | Probar |
| [BE #82](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/82) | QA Seg | 🟡 Abierto | — | Controles URL/slug, proyección pública, negativos permiso | Adjuntar checks entorno aplicable |
| [BE #83](https://github.com/Taller-SW-Web/G1-Marketplace-Backend/issues/83) | DOC | 🟡 Abierto | — | Trazabilidad, decisión fuente/moneda, semántica vacío, evidencia permiso/adaptador | Actualizar |

---

## Evidencia Pública 22/11 (Retest HTTPS sin auth)

| Caso | Proxy Next (Vercel) | BFF (Render) |
|------|---------------------|--------------|
| Ficha Nike Academy | `200 REAL` · `43527cd2-1a91-499e-a54c-5857bb95f61d` | `200 REAL` · `34c95e95-aa56-44cb-a52c-8d89c7975e4d` |
| Variantes adidas Entrada 26 | `200 REAL` · `973b0b85-67c7-4b05-b2aa-02982b3565c9` | `200 REAL` · `444d5879-6deb-49eb-a8f1-6dc17199f1fc` |
| Slug ausente | `404 PRODUCT_NOT_AVAILABLE` · `b7cd7489-9711-4629-b14e-fb6b0f0cda01` | `404 PRODUCT_NOT_AVAILABLE` · `624393d3-f609-4348-b65d-a70ae24db5ca` |
| Precio Nike Academy | `503 CATALOG_TIMEOUT` (1ra) / pendiente retest | `503 PRICING_UNAVAILABLE` · `e8aec5f3-b4cc-4656-af79-b78235298320` |
| Stock Nike Academy | `503 CATALOG_TIMEOUT` (1ra) / pendiente retest | `503 INVENTORY_UNAVAILABLE` · `fb6ac405-0eee-4ded-8660-308ca5677503` |
| Relacionados Nike Academy | `503 CATALOG_TIMEOUT` (1ra) / pendiente retest | `200 vacío` · `d33328c8-499e-4ec3-9277-3120f6093fda` (REAL) |

**Notas:**
- 1ra tanda (20:25): ficha, variantes, slug → `503 CATALOG_TIMEOUT` vía Next (timeout lectura cliente)
- 2da tanda (20:27): ficha, variantes, slug → `200 REAL` recuperados
- Precio/stock: 503 directo del BFF sin adaptador habilitado para REAL
- Relacionados: camino `UNCONFIGURED` en REAL → vacío no demuestra llamada a G6
- Código remoto explica límites: precio/disponibilidad responden 503 al seleccionar REAL sin adaptador

---

## Tests Locales (Corte 22/11)

| Suite | Tests | Estado |
|-------|-------|--------|
| Frontend (vitest) | 80/80 en 6 suites | ✅ Pass |
| Backend (vitest) | 88/88 en 5 suites | ✅ Pass |
| `npm run docs:validate` | 5 contratos G1 | ✅ Pass |

**Comandos usados:**
- FE: `npm run test:components -- --pool=threads --maxWorkers=1` + 6 rutas dirigidas
- BE: `npm run test:unit -- --runTestsByPath` + 5 rutas dirigidas + caché temporal SWC

---

## Próximos Pasos Inmediatos (Plan 22–26/11)

1. **22–23/11**
   - [ ] Publicar esta matriz en BE #329 con primer lote de decisiones
   - [ ] Abrir PR BE #293 con contrato G6 fijado (`0.7.0-rc.2`, commit `8164510`) y primeros casos
   - [ ] Pedir a Andrés (URL Consumption) y Leónidas (ruta publicada/política) para FE #140
   - [ ] Revisar con Giuliano FE #141 → preparar PR FE #142 (DS-001)
   - [ ] Probar candidatas FE #39, #41, #43, #45 en corte acordado

2. **23–24/11**
   - [ ] Revisar con Diego matriz BE #291, cobertura unitaria BE #292/FE #137
   - [ ] Pedir runs: Jim BE #294, Leónidas BE #295, Fernando BE #296, E2E FE #138
   - [ ] Integración con dobles BE #297, piloto REAL BE #298

3. **25/11**
   - [ ] Publicar esquemas/secuencias BE #321, C4 BE #325
   - [ ] Reportes y capturas FE #155 (Lighthouse)
   - [ ] Recopilar evidencia: runs Andrés, k6 Fernando BE #306, Lighthouse Giuliano, trazas APIM/async

4. **26/11**
   - [ ] Cerrar BE #299 (matriz 40 funciones) y BE #324 (documento 4 puntos)
   - [ ] Ensayo BE #326 + coordinar congelamiento BE #327
   - [ ] 1 caso positivo, 1 negativo, 1 traza reproducible

5. **28/11** · **Presentación Punto 2**

---

## Bloqueos Conocidos

| Issue | Bloqueo | Dueño |
|-------|---------|-------|
| FE #142 / FE #146 | Mockups FE #141 no aprobados (Jim/Guillermo) | Giuliano |
| BE #69 / BE #77 / BE #81 | Contrato G6 Pricing/Inventory/Recommendations + grants | Andrés / Leónidas / Axel (G6) |
| BE #72 | Representación SKU simple (acuerdo G-SKU) | Backend + G6 |
| BE #80 | Criterios completos enriquecimiento/deduplicación/degradación | Backend |
| FE #140 | Configuración APIM (URL Consumption, ruta, política CORS) | Andrés / Leónidas |
| BE #293 | Pin contrato G6 `0.7.0-rc.2` + CI contract tests consumidor | Backend |
| F-024 (FE #63, BE #122–125) | Contrato G6 promociones/cupones + proveedor | Leónidas + Axel (G6) |

---

## Referencias

- [Revisión completa Sebastián](../REVISION-H5-SEBASTIAN-LOCAL.md)
- [Plan equipo H5](../H5-resumen-para-el-equipo.md)
- [Matriz aprobada SPECS](https://github.com/Taller-SW-Web/G1-Marketplace-SPECS/blob/ccec2252739d720e086bba9dcd2c0b1bf8bbfdfe/SPECS/RESPONSABILIDADES-PUNTA-A-PUNTA.md)
- [Avance local Giuliano 22/11](../.local-private/h5-ejecucion-20261122/evidencia/AVANCE-HITO-5.md)
- [Código ficha Frontend](https://github.com/Taller-SW-Web/G1-Marketplace-Frontend/blob/e56a13e040ba9641b600fbc937dc3863b0ecc6e7/src/features/catalog/components/ProductDetailContainer.tsx#L127)
- [Retest 22/11 ficha pública Next](https://g1-marketplace-frontend.vercel.app/api/catalog/products/nike-academy-hv4386-100)
- [Retest 22/11 ficha pública BFF](https://g1-marketplace-backend.onrender.com/api/v1/catalog/products/nike-academy-hv4386-100)