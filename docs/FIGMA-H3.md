# Adaptación visual a Figma — H3

Referencia: [Mockups, página Inicio, catálogo y producto](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=1-3). Adaptación asistida por Codex, finalizada el 15/10/2026. Revisión humana pendiente.

## Diseño aplicado

- [Inicio desktop](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=274-111) y [mobile](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=274-293): hero oscuro con fotografía editorial exacta, textos y CTA del diseño, categorías ilustradas, composición y espaciados responsive.
- [Catálogo desktop](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=339-881), [mobile](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=339-1026) y [resultados mobile](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=360-1734): títulos, resumen, tarjetas, tres columnas en escritorio y una en móvil. Categorías H3 en la navegación lateral; no se incorpora el panel de filtros de H4.
- Cabecera sin franja promocional, logo con el recorte de Figma, etiqueta de búsqueda visible, iconos exactos y navegación por categorías existentes. Pie oscuro con marca y copyright del mockup.
- Inicio [cargando](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=294-720), [vacío](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=294-827) y [error](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=294-911); catálogo [cargando](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=351-1188), [vacío](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=351-1338) y [error](https://www.figma.com/design/k6JZRdgbO7YtZXeFqygE8p/Mockups?node-id=351-1565): estilos, iconos y recuperación mediante los componentes compartidos.

Se reutilizan Button, TextField, EmptyState, Skeleton y los tokens DS-001. No se añaden dependencias. Los SVG se conservan sin modificar, con sus proporciones y tamaños originales; las variantes mobile son exports separados.

## Contenido y límites del corte

Los textos, cantidad e imágenes de productos siguen llegando del BFF. El mock actual conserva Running, Entrenamiento y Aire libre, 32 productos sintéticos y destacados vacíos. Las ilustraciones de categorías se eligen por significado del nombre, con texto sin ilustración para categorías desconocidas. La imagen editorial es decorativa y no afirma disponibilidad de un producto.

La tarjeta respeta la composición aplicable, pero el DTO H3 no proporciona marca comercial, precio ni stock. Se conserva el enlace al producto y no se inventan esos campos. No se sustituyen las imágenes dinámicas por fotografías de otro producto para parecerse al mockup.

Cuenta, favoritos y carrito aparecen como controles deshabilitados con nombre accesible y título «Próximamente». Los destinos de ayuda y políticas también quedan deshabilitados hasta que sus responsables los proporcionen; no hay enlaces ficticios ni pantallas nuevas. No se añaden filtros múltiples, orden, modal, ficha ni otras funciones posteriores a semana 8.

Por estas diferencias de datos y alcance, se declara adaptación visual del corte H3; no identidad completa con todos los controles y datos de Figma ni aceptación humana.

## Recursos y comprobación

Los recursos usados están en `public/figma/`, descargados con `curl -L` desde los exports de `get_design_context`. `public/figma/manifest.json` registra nodos, tamaños y SHA-256; ningún componente usa URL temporal de Figma. Las imágenes de productos permanecen dinámicas.

Las pruebas `tests/figma-h3.spec.ts` comprueban hero a 1440/390/320 px, proporciones de ilustraciones, carga de recursos visibles, ausencia de overflow, tres/una columnas y recuperación del error. Las pruebas funcionales existentes siguen cubriendo búsqueda, criterios, paginación básica y errores. Capturas y reporte se generan en `test-results/` y `playwright-report/`, ignorados por Git; no se publican como aceptación humana.
