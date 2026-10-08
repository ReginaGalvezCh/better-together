# Arquitectura del MVP

Better Together es una PWA móvil para información comprobable y apoyo comunitario acotado en eventos concurridos.

## Flujo principal

1. Al entrar por primera vez, la persona elige fecha y sector de su entrada en dos pasos. La elección se guarda en el dispositivo y se puede editar con «Cambiar mi entrada».
2. Consulta información práctica, Pulse y actividades con fuente y fecha de revisión.
3. Si usa Ayuda, solo ve y crea solicitudes cotidianas de la sesión seleccionada.
4. Puede seleccionar manualmente un sector amplio en el mapa esquemático para filtrar avisos; la preferencia se guarda solo en ese dispositivo.
5. Si no hay señal, la solicitud queda temporalmente en el dispositivo y se sincroniza con el mismo identificador al volver la conexión.
6. Las solicitudes caducan dos horas después de su creación original, aunque hayan esperado en la cola.

El sector de entrada y el sector actual son preferencias distintas. Completar o editar la entrada preselecciona el sector actual; cambiarlo desde Ayuda no cambia la entrada. El plano completo queda dentro de un desplegable para concentrar la vista. No se guardan entradas, QR ni datos de identificación. Si el almacenamiento no está disponible, la elección funciona durante la sesión y se informa que no podrá recordarse.

La barra inferior conserva el selector Antes, Durante o Al salir sobre sus tres acciones. El texto del momento y los bordes de sus acciones comparten un acento sutil (morado, teal o ámbar); el estado seleccionado también usa borde y sombra, sin depender solo del color. `useConcertMoment` recuerda la elección por fecha, incluso en memoria si falla el almacenamiento. No pretende confirmar el inicio ni el cierre del evento. Maps recibe solo el recinto público y Uber no recibe coordenadas. Quentro se explica mediante una guía local, sin inventar un enlace a la app. «Estoy a salvo» permite compartir o copiar un mensaje sin ubicación: no publica un reporte ni confirma entrega o atención de seguridad. Los servicios externos pueden requerir conexión aunque la guía local esté disponible.

## Capas

La lista inicial de TikTok está en `lib/pulse-sources.ts`: diez nombres entregados por la usuaria, conservados sin inferir usuarios. Cuatro perfiles tienen enlaces explícitos entregados por ella (`user-provided`); esto no constituye verificación independiente. `bts.chileofficial` y `bts.chileprojects` permanecen como cuentas distintas y comunitarias. Cuatro publicaciones tienen destinos resueltos mediante redirecciones públicas, sin parámetros de seguimiento, pero su contenido y asociación con los nombres de la lista siguen pendientes de revisión. Todos conservan el monitoreo desactivado y no alimentan todavía el Pulso público. Los hashtags son semillas propuestas, no tendencias confirmadas. Activar una fuente requiere confirmar el perfil y resolver el acceso permitido a los datos; registrar enlaces no activa un agente ni una tarea programada.

Pulso ARMY reemplaza la lista vertical de Avisos con hasta tres temas editoriales por fecha y origen. Tiene tarjetas horizontales con swipe nativo y flechas explícitas, sin avance automático ni scroll infinito. La fecha/hora identifica la revisión editorial, no la publicación original ni una consulta en vivo. La selección inicial se revisó en fuentes oficiales de Ticketmaster; Comunidad muestra un estado vacío hasta incorporar publicaciones reales. No hay scraping, agente programado, métricas de popularidad, GPS ni índice de seguridad. Contenido incluido con la app; offline requiere cargarla previamente y los enlaces externos pueden no funcionar.

- `app/page.tsx`: experiencia multidía, secciones, estados de conectividad, caché y cola local.
- `components/ticket-setup.tsx`: selección inicial de fecha y sector de entrada.
- `components/quick-access-dock.tsx` y `lib/quick-actions.ts`: acciones por momento, guías locales y enlaces externos sin GPS.
- `components/army-pulse.tsx` y `lib/army-pulse.ts`: carrusel editorial, fuentes y separación entre oficial/comunidad.
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
