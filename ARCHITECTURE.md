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

«Qué llevar» reemplaza a «Mi teléfono» en el momento Antes. La guía distingue el requisito oficial de entrada/documento, sugerencias propias para la espera y consejos derivados del pronóstico Open-Meteo ya consultado por la página, sin nuevas llamadas ni ubicación personal. Solo utiliza el pronóstico si coincide con la fecha seleccionada; si no hay datos, informa que no puede recomendar por clima. Los artículos sugeridos no se anuncian como permitidos y se enlazan las reglas de Ticketmaster. Las recomendaciones comunitarias quedan pendientes de revisión de fuentes reales. La preparación del teléfono se conserva en un desplegable dentro del mismo panel. El listado no guarda datos ni agrega seguimiento o permisos.

La lista inicial de TikTok está en `lib/pulse-sources.ts`: once nombres entregados por la usuaria, conservados sin inferir usuarios. Cinco perfiles tienen enlaces explícitos entregados por ella (`user-provided`); esto no constituye verificación independiente. `bts.chileofficial` y `bts.chileprojects` permanecen como cuentas distintas y comunitarias. Cuatro publicaciones tienen destinos resueltos mediante redirecciones públicas, sin parámetros de seguimiento, pero su contenido y asociación con los nombres de la lista siguen pendientes de revisión. Todos conservan el monitoreo desactivado y no alimentan todavía el Pulso público. Los hashtags son semillas propuestas, no tendencias confirmadas. Activar una fuente requiere confirmar el perfil y resolver el acceso permitido a los datos; registrar enlaces no activa un agente ni una tarea programada.

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

### Recolección privada de Pulso (primer incremento)

`lib/pulse-intake.ts` recibe hasta 100 publicaciones de X, Instagram o TikTok. Valida enlaces HTTPS a publicaciones, elimina parámetros de seguimiento, deduplica por enlace canónico (por ID en X) y permite pasar los enlaces de lotes anteriores. No visita URLs enviadas, no descarga medios y no interpreta texto como instrucciones. Filtra contexto local de BTS/Arirang y clasifica temas con reglas explícitas. El propósito `pulse` descarta publicaciones de más de 24 horas; `reference` acepta publicaciones de hasta 30 días para revisar guías o agenda sin tratarlas como novedades en vivo. Una referencia necesita `validUntil` explícito para pasar de `needs-context` a `pending-review`; esa fecha nunca se deduce del texto, debe ser futura y no superar 30 días desde la recolección. En ambos casos se descartan fechas de publicación futuras fuera de una tolerancia de cinco minutos. La sesión se proporciona explícitamente; no se deduce una fecha ni un sector de un hashtag.

`npm run pulse:collect` procesa un arreglo JSON desde la entrada estándar y devuelve un lote para revisión privada. Cada objeto contiene `platform`, `url` y opcionalmente `text`, `publishedAt` (ISO con zona horaria) y `sessions` (`all` o IDs válidos). Un enlace sin contexto o fecha queda en `needs-context`. Las coincidencias sensibles quedan en `sensitive-review`, sin retener el texto. Las demás quedan en `pending-review`, con un extracto de hasta 180 caracteres; ese extracto no es un resumen generado ni una afirmación verificada. Las reglas no detectan todos los datos personales ni todos los rumores: todo requiere revisión humana. El comando no persiste datos, no publica tarjetas y no está conectado a la interfaz ni a una tarea programada. No se deben guardar sus resultados en Git.

### Fuentes Instagram y alcance editorial acordado

`lib/pulse-instagram-sources.ts` conserva nueve perfiles y dieciséis publicaciones entregadas por la usuaria, sin parámetros de seguimiento. El carrusel que apunta a la tercera imagen conserva `img_index=3` como referencia separada, no como identidad para deduplicación. Se leyeron las leyendas de tres publicaciones mediante navegación pública normal: un pop-up de merch, el proyecto de pantallas BORACITY y una publicación sobre respeto a la privacidad de artistas. Esto no verifica sus afirmaciones ni fechas de vigencia; las otras trece leyendas siguen pendientes. No se recopilan comentarios, métricas ni contenido privado. Los perfiles quedan sin clasificación de autoridad y con monitoreo desactivado. Los autores observados no se vinculan automáticamente a cuentas de TikTok ni a perfiles similares.

Los dos filtros públicos siguen siendo **Oficial** y **Comunidad**. Oficial requiere comprobar que el emisor está autorizado para esa información del concierto; el nombre de una cuenta, una marca o una insignia no basta. Dentro de Comunidad, los futuros eventos deben mostrar organizador, fuente, fecha/horario, zona pública y condiciones; una actividad comercial se identifica como tal sin crear otra pestaña ni sugerir respaldo del organizador. Las guías de fanchants enlazan la publicación original, sin copiar el canto ni prometer sincronización. Los temas de freebies, fanchants y merch se clasifican en la revisión privada, no aparecen todavía como tarjetas públicas.

Tono acordado para la próxima capa de interfaz: cercano, breve y útil, con vocabulario familiar para ARMY sin imitar frases de creadores ni llenar cada mensaje de emojis. Ejemplos propios: «Qué se viene», «Datos para tu día», «Ver el post original», «Aún falta confirmar» y «Avísanos si cambió». Los mensajes de emergencia, privacidad, permisos y moderación conservan un tono directo. Nunca convertir un comentario, popularidad o entusiasmo en una confirmación.

Orden actualizado: consolidación de correcciones y Qué llevar; moderación básica; fuentes reales de Pulso; entrada y accesos; radares con fuentes vigentes; prueba con fans; música y enlaces a fanchants. Durante el concierto, el radar de baños, merch y comida/bebestibles distinguirá información oficial de reportes comunitarios. El semáforo debe incluir texto (poca fila/fila media/fila larga), antigüedad, zona amplia y estado sin datos; un reporte vencido pierde el color y no se muestra como disponibilidad actual. No medirá seguridad ni usará GPS preciso. Es alcance pendiente, no una función implementada.

### Moderación básica: cola y panel protegido; operación pendiente

La rama `feat/community-moderation` parte de main consolidado por los PR #7 y
#8. El primer incremento implementa la recepción privada, no un servicio de moderación permanente.

1. Todas las solicitudes, incluidas las enviadas por WebMCP y la cola offline,
   pasan por validación del servidor antes de mostrarse. Los nuevos mensajes
   quedan pendientes de revisión; un fallo de moderación no publica por defecto.
2. Rechazar datos personales y ubicación precisa antes de persistirlos. El
   triage de violencia, odio, acoso, estafas, spam y enlaces riesgosos es una
   ayuda, no garantía de detección exhaustiva ni verificación automática de
   verdad. La información dudosa queda para revisión humana.
3. Aprobar, rechazar u ocultar requiere acceso de moderador comprobado en el
   servidor. Sin acceso configurado no se habilitan acciones administrativas.
   Los secretos nunca se envían al navegador ni se guardan en Git.
4. Añadir denuncia de contenido y límites contra abuso sin solicitar GPS ni
   perfiles públicos. No ocultar automáticamente por popularidad de denuncias.
5. Los estados pendientes, ocultos, rechazados y vencidos no aparecen en el
   feed público ni reaparecen por caché o sincronización. La interfaz distingue
   «recibido para revisión» de «publicado».
6. Probar estados y transiciones, rechazo de acceso no autorizado, vencimiento,
   reintentos idempotentes y comportamiento offline con datos sintéticos. Los
   cambios de esquema se revisan localmente antes de cualquier migración remota.

`lib/community-requests.ts` valida el esquema estricto, fechas y un triage conservador
de correos, teléfonos móviles chilenos, RUT y coordenadas antes de escribir. No detecta
todos los datos personales, violencia, odio ni información falsa: todos los envíos
válidos quedan como `pending-review`. El servidor limita el cuerpo a 8 KiB.
El INSERT con conflicto gestionado hace atómicos los reintentos: no duplica ni renueva
la vigencia. POST devuelve solo `{ receipt: { received: true } }`, nunca texto ni
identificadores guardados de otra persona. La métrica anónima distingue recepción
para revisión de publicación y no se repite por reintentos (best-effort, no garantizada).

La migración `0002_real_sumo.sql` solo añade `reviewed_at` nullable. No modifica
migraciones anteriores ni borra registros. El valor histórico por defecto `active`
se mantiene por compatibilidad, pero no permite publicar: GET exige además revisión
fechada y vigencia. Los registros anteriores sin revisión no aparecen. No se ha
aplicado la migración remota ni desplegado este incremento.

El navegador separa borradores locales y recibos del feed. WebMCP tampoco agrega
los envíos al feed. La caché usa una clave nueva y valida el contrato revisado;
los contadores solo cuentan solicitudes revisadas vigentes. La cola tiene un único
sincronizador, conserva borradores nuevos durante el envío y mantiene los fallos
temporales para reintento. Al llenarse (100) o fallar el almacenamiento, no afirma
que guardó ni cierra el formulario. Las entradas caducan 2 horas después de su
creación, incluyendo el tiempo offline y pendiente de revisión.

El segundo incremento añade `/moderation` y `/api/moderation`. El panel es humano,
no un agente continuo ni un detector automático de verdad. Usa las ayudas SIWC
existentes y valida en servidor la identidad estable de Sites en cada lectura y
decisión. La variable privada `MODERATOR_USER_IDS` es una lista explícita de hasta
20 IDs, separada por comas. Vacía o inválida cierra el acceso; iniciar sesión no
otorga el rol y los visitantes de prueba no se convierten en moderadores. No se
autoriza por correo, alias ni campos enviados por el navegador. La configuración
de cuentas reales debe acordarse y gestionarse en el servidor antes del despliegue.

El dispatcher de Sites es la frontera de confianza de las cabeceras de identidad.
No exponer el Worker directamente ni aceptar cabeceras de identidad de visitantes
en un servidor externo. El simulador local elimina cabeceras falsificadas y usa
una identidad ficticia solo para QA; esa identidad no se guarda como permiso de
producción. `.env.example` mantiene vacía la lista y `.dev.vars*` se ignora.

POST exige sesión autorizada, Origin igual al origen real de la petición, la
cabecera `X-BT-Moderation: 1`, JSON acotado y contrato estricto. No hay CORS abierto.
Las decisiones son `pending-review → active`, `pending-review → rejected` y
`active → hidden`. No hay restauración automática ni extensión de vigencia. El
panel pide confirmación y motivo acotado para rechazar/ocultar. Una revisión
numérica evita sobrescribir decisiones de otra pantalla; un conflicto o vencimiento
devuelve 409 y obliga a actualizar. Listados por fecha/estado: hasta 50 vigentes,
más antiguas primero, refresco de 30 segundos y actualización manual.

La migración aditiva `0003_parched_moon_knight.sql` añade revisión/identificador de
decisión y `moderation_decisions`. UPDATE e INSERT de auditoría se ejecutan en un
batch transaccional de D1: si falla el registro, se revierte el cambio. Cada decisión
guarda ID de solicitud, ID pseudónimo del moderador, acción, motivo, estados,
revisión y fecha; no copia mensaje, alias ni correo. El marcador de decisión impide
atribuir el cambio de un revisor a otro en una carrera. El registro es interno y
no se devuelve al feed público. Esta migración se probó solo en local.

El área privada y sus API responden `private, no-store`; el proxy evita caché de
HTML. El service worker v3 excluye moderación y autenticación, no guarda respuestas
privadas y retira las cachés anteriores al activarse. La cola privada nunca usa
localStorage ni una cola offline de decisiones. Una retirada se refleja al
recargar el feed; una copia offline previamente aprobada puede quedar desactualizada
hasta reconectar, como advierte la interfaz.

Faltan denuncias, límites de frecuencia, retención/borrado y operación humana antes
de abrir esta función al público o activar fuentes en vivo. La app continúa
advirtiendo que la prueba aún no tiene atención de moderadores. No se habilitaron
cuentas reales, no se migró remotamente y no se desplegaron los incrementos de
moderación. Las urgencias siguen fuera del apoyo cotidiano.

### Primera conexión propuesta: X

Para búsqueda por hashtags, X ofrece [Recent Search](https://docs.x.com/x-api/posts/search/introduction) y tiene [cobro por uso](https://docs.x.com/x-api/getting-started/pricing). Instagram ofrece búsqueda de contenido con hashtags mediante [Instagram API with Facebook Login](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login), con cuenta profesional vinculada a una página y los permisos correspondientes. No se supone que las cuentas TikTok registradas tengan los mismos usuarios en otras redes. La recomendación técnica inicial es X; no constituye autorización para comprar créditos ni activar consultas.

`lib/pulse-x.ts` implementa una consulta a un endpoint fijo, con timeout de diez segundos, sin redirecciones, paginación ni reintentos automáticos. Trae como máximo diez publicaciones por ejecución y las pasa al mismo filtro privado. Busca las últimas 24 horas o utiliza un `sinceId` explícito. Si existen más páginas, informa `hasMore` y no permite avanzar el cursor para evitar saltar publicaciones no recogidas. Es una muestra acotada, no cobertura completa del evento. Los errores parciales o límites de X detienen el lote; no se registran tokens ni cuerpos de error.

El modo `npm run pulse:collect -- --x` exige `PULSE_X_ENABLED=true` y `X_BEARER_TOKEN` como secreto local/servidor (nunca `NEXT_PUBLIC_*` ni en Git). Opcionalmente acepta `PULSE_X_ACCOUNTS` (usuarios X confirmados, separados por coma) y `PULSE_X_SINCE_ID`. Antes de activarlo se debe contar con acceso autorizado, acordar presupuesto y establecer un límite de gasto en el proveedor. No se ha hecho ninguna consulta pagada. Faltan almacenamiento privado, aprobación editorial, conexión del feed público, manejo de eliminación de contenido y programación con presupuesto y ventana del evento antes de operar un agente continuo. Hasta entonces la interfaz conserva el Pulso curado existente.

No se solicitan nombres, correo, teléfono ni coordenadas exactas. Las métricas almacenan solamente tipo de evento, categoría, zona amplia, conectividad y hora. Las entradas se validan en servidor, tienen límites de longitud y se muestran como texto, nunca como HTML.

La cola y la caché sin conexión no se consideran almacenamiento seguro ni cifrado; por eso la interfaz advierte que no deben incluirse datos personales o ubicaciones exactas. Las solicitudes de emergencia, búsqueda de personas, salud y seguridad quedan fuera de la publicación comunitaria.

## Decisiones acotadas

El MVP no incluye mensajería privada, seguimiento GPS, mapas de terceros, perfiles persistentes, fotos, confirmaciones de ayuda ni atención continua. El mapa actual es un esquema estático incluido en la app: no consulta ubicación ni representa personas. Las funciones excluidas elevarían el riesgo de acoso, exposición o moderación y requieren validación comunitaria antes de agregarlas.
