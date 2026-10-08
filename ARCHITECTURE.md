# Arquitectura del MVP

Better Together es una PWA móvil para información comprobable y apoyo comunitario acotado en eventos concurridos.

## Flujo principal

1. La persona elige una de las tres sesiones sin alterar la fase de las demás.
2. Consulta información práctica, Pulse y actividades con fuente y fecha de revisión.
3. Si usa Ayuda, solo ve y crea solicitudes cotidianas de la sesión seleccionada.
4. Puede seleccionar manualmente un sector amplio en el mapa esquemático para filtrar avisos; la preferencia se guarda solo en ese dispositivo.
5. Si no hay señal, la solicitud queda temporalmente en el dispositivo y se sincroniza con el mismo identificador al volver la conexión.
6. Las solicitudes caducan dos horas después de su creación original, aunque hayan esperado en la cola.

## Capas

- `app/page.tsx`: experiencia multidía, secciones, estados de conectividad, caché y cola local.
- `app/api/alerts/route.ts`: validación y acceso seguro a los datos.
- `lib/events.ts`: sesiones, fases, cuenta regresiva y contenido curado.
- `lib/alerts.ts`: contrato compartido, categorías habilitadas y límites de entrada.
- `lib/sectors.ts`: catálogo de sectores, validación y filtrado sin coordenadas.

El catálogo usa los nombres y familias de colores del plano referencial de Ticketmaster, revisado el 8 de octubre de 2026. El diagrama propio simplifica la distribución alrededor del escenario 360° y enlaza la fuente; no representa puertas, rutas ni puntos seguros verificados. Cancha Andes y Cancha Pacífico distinguen accesos según la entrada, aunque comparten el espacio interior. Las zonas de la versión anterior siguen aceptándose para sincronizar solicitudes pendientes y se muestran en la vista general; no se reasignan a sectores nuevos.
- `db/schema.ts`: solicitudes aisladas por sesión, idempotencia y eventos analíticos anónimos.
- `public/sw.js`: caché mínima para abrir la app con conectividad limitada.

## Privacidad y seguridad

No se solicitan nombres, correo, teléfono ni coordenadas exactas. Las métricas almacenan solamente tipo de evento, categoría, zona amplia, conectividad y hora. Las entradas se validan en servidor, tienen límites de longitud y se muestran como texto, nunca como HTML.

La cola y la caché sin conexión no se consideran almacenamiento seguro ni cifrado; por eso la interfaz advierte que no deben incluirse datos personales o ubicaciones exactas. Las solicitudes de emergencia, búsqueda de personas, salud y seguridad quedan fuera de la publicación comunitaria.

## Decisiones acotadas

El MVP no incluye mensajería privada, seguimiento GPS, mapas de terceros, perfiles persistentes, fotos, confirmaciones de ayuda ni atención continua. El mapa actual es un esquema estático incluido en la app: no consulta ubicación ni representa personas. Las funciones excluidas elevarían el riesgo de acoso, exposición o moderación y requieren validación comunitaria antes de agregarlas.
