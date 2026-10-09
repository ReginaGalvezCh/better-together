# Better Together

Experiencia móvil para orientar y acompañar a fans durante las tres sesiones de BTS en Santiago. Reúne información comprobable, un Pulse curado, actividades y una ayuda cotidiana acotada.

## MVP

- Navegación independiente para las sesiones del 14, 16 y 17 de octubre de 2026.
- Fases y cuenta regresiva que identifican la hora como estimada.
- Información práctica, Pulse y actividades con fuente y fecha de revisión.
- Solicitudes cotidianas aisladas por sesión, con zonas aproximadas.
- Recepción pendiente de revisión y panel humano protegido para aprobar, rechazar y ocultar.
- Mapa esquemático sin GPS para elegir un sector y priorizar avisos cercanos.
- Cola local idempotente cuando no hay señal y descarte de solicitudes vencidas.
- Estados distintos para carga, vacío, error y contenido guardado.
- Métricas agregadas sin perfiles personales.
- Interfaz móvil, accesible y preparada para uso con una mano.

## Desarrollo

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run db:generate
npm test
npm run dev
```

Para la base local, genera primero el build y aplica las migraciones indicadas en `drizzle/` siguiendo la guía del starter.

## Flujo de trabajo

El desarrollo se realiza en ramas cortas, con Conventional Commits y PR con objetivo,
pruebas y vista previa. Cada incremento pasa compilación, pruebas y revisión móvil
antes de integrar a `main`. Publicación y permisos del Site se gestionan por separado.

## Moderación

El panel está en `/moderation`. Iniciar sesión con ChatGPT no basta: el servidor
debe incluir el ID estable de Sites en `MODERATOR_USER_IDS`. Por defecto la lista
está vacía y el acceso permanece cerrado. Usa `.env.example` como referencia;
no añadas IDs reales, correos ni secretos al repositorio o variables `NEXT_PUBLIC_*`.
El despliegue debe conservar el dispatcher autenticado de Sites.

Es una herramienta para moderadores humanos, no un agente atendiendo 24/7.
Antes de abrirla al público faltan responsables autorizados, límites contra abuso,
denuncias y una política de retención. Las migraciones de moderación se han probado
solo localmente; integrarlas a `main` no las aplica en producción.

## Documentación

- [Arquitectura](./ARCHITECTURE.md)
- [Contribuir](./CONTRIBUTING.md)
- [Seguridad](./SECURITY.md)

## Alcance de seguridad

Better Together complementa la coordinación comunitaria; no reemplaza al personal del recinto ni a los servicios de emergencia.
