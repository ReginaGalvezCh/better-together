# Arquitectura del MVP

Better Together es una PWA móvil, anónima y *offline-first* para apoyo comunitario en eventos concurridos.

## Flujo principal

1. La persona revisa alertas activas de su zona.
2. Puede ofrecer ayuda o crear una alerta con alias, categoría y zona aproximada.
3. Si no hay señal, la alerta queda temporalmente en el almacenamiento local del dispositivo y se sincroniza al volver la conexión.
4. Las alertas caducan a las dos horas para evitar información obsoleta.

## Capas

- `app/page.tsx`: experiencia móvil, estado de conectividad y cola local.
- `app/api/alerts/route.ts`: validación y acceso seguro a los datos.
- `lib/alerts.ts`: contrato compartido, categorías y límites de entrada.
- `db/schema.ts`: alertas y eventos analíticos anónimos.
- `public/sw.js`: caché mínima para abrir la app con conectividad limitada.

## Privacidad y seguridad

No se solicitan nombres, correo, teléfono ni coordenadas exactas. Las métricas almacenan solamente tipo de evento, categoría, zona amplia, conectividad y hora. Las entradas se validan en servidor, tienen límites de longitud y se muestran como texto, nunca como HTML.

La cola sin conexión no se considera almacenamiento seguro ni cifrado; por eso la interfaz advierte que no deben incluirse datos personales o ubicaciones exactas.

## Decisiones acotadas

El MVP no incluye mensajería privada, seguimiento GPS, perfiles persistentes, fotos ni mapas. Esas funciones elevarían el riesgo de acoso, exposición o moderación y requieren validación comunitaria antes de agregarlas.
