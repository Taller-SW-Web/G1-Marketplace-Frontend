# Validación H4 del 07/11/2026

Frontend develop base 8420d42855c9894267d6f06f8474834955d9b61e y Backend develop 0a8041d08340ea8975de89dcb8ace45e4932e458. Node 22.18.0.

Build/tipos/lint PASS. 392 componentes/proxy, 81 servidor, 4 pruebas del runner, 41 recorridos de catálogo/ficha/comercio y 5 de destacados PASS. MOCK queda rotulado y sus resultados se distinguen del recorrido REAL.

El test de orden global podía leer tarjetas antiguas al terminar selectOption. Ahora espera la respuesta de cada página y su render antes de verificar el orden combinado; no debilita la aserción ni cambia la aplicación. Primera ejecución: 40/41; segunda completa después de la corrección: 41/41.

REAL local Next → BFF → nuevo gateway: 21 PASS, 2 BLOCKED por 503 de precio, 2 INCONCLUSIVE por ausencia de selección editorial y de nombres empatados. Capturas originales y JSON se conservan en Backend, docs/evidencias/H4/giuliano/2026-11-07. No es evidencia de despliegue compartido.

Secretos/SAST/SCA cumplieron los gates del proyecto. Quedan 10 entradas moderadas de herramientas de desarrollo y ninguna vulnerabilidad runtime detectada; no equivale a aceptación de los avisos ni a DAST completo.

Pendientes: fuente real de ranking G5 o decisión de alcance, resolver precio en G6, dataset de desempates, revisión/merge de SPECS #16, aceptación independiente y despliegue G1. El primer intento de publicación quedó bloqueado por 403 del conector GitHub; tras autenticar GitHub CLI como GiulianoMaPe, la entrega se publica por esa vía.
